import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.userId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    // This student's own graded (published) submissions, oldest first
    const ownSubmissions = await prisma.submission.findMany({
      where: {
        studentId: student.id,
        evaluation: { status: "PUBLISHED" },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            subjectName: true,
            maxMarks: true,
          },
        },
        evaluation: {
          select: { finalMarks: true, publishedAt: true },
        },
      },
      orderBy: { evaluation: { publishedAt: "asc" } },
    });

    // All published evaluations for this student's section (anonymous,
    // used only to compute averages — never returns other students' identities)
    const sectionSubmissions = await prisma.submission.findMany({
      where: {
        student: { sectionId: student.sectionId },
        evaluation: { status: "PUBLISHED" },
      },
      select: {
        assignmentId: true,
        assignment: { select: { subjectName: true, maxMarks: true } },
        evaluation: { select: { finalMarks: true } },
      },
    });

    // Per-assignment class average (%) — used as the dotted reference line
    const perAssignmentTotals: Record<string, { sum: number; count: number }> =
      {};
    for (const s of sectionSubmissions) {
      if (!s.evaluation || !s.assignment) continue;
      const pct = (s.evaluation.finalMarks / s.assignment.maxMarks) * 100;
      const bucket = perAssignmentTotals[s.assignmentId] ?? {
        sum: 0,
        count: 0,
      };
      bucket.sum += pct;
      bucket.count += 1;
      perAssignmentTotals[s.assignmentId] = bucket;
    }

    const history = ownSubmissions
      .filter((s) => s.assignment && s.evaluation)
      .map((s) => {
        const bucket = perAssignmentTotals[s.assignment!.id];
        const classAveragePercentage = bucket
          ? Math.round((bucket.sum / bucket.count) * 10) / 10
          : null;
        return {
          submissionId: s.id,
          assignmentId: s.assignment!.id,
          assignmentTitle: s.assignment!.title,
          subject: s.assignment!.subjectName,
          marks: s.evaluation!.finalMarks,
          maxMarks: s.assignment!.maxMarks,
          percentage:
            Math.round(
              (s.evaluation!.finalMarks / s.assignment!.maxMarks) * 1000,
            ) / 10,
          date: s.evaluation!.publishedAt,
          classAveragePercentage,
        };
      });

    // Per-subject class average (%) across the whole section
    const perSubjectTotals: Record<string, { sum: number; count: number }> = {};
    for (const s of sectionSubmissions) {
      if (!s.evaluation || !s.assignment) continue;
      const pct = (s.evaluation.finalMarks / s.assignment.maxMarks) * 100;
      const subject = s.assignment.subjectName;
      const bucket = perSubjectTotals[subject] ?? { sum: 0, count: 0 };
      bucket.sum += pct;
      bucket.count += 1;
      perSubjectTotals[subject] = bucket;
    }
    const classAverages: Record<string, number> = {};
    for (const [subject, bucket] of Object.entries(perSubjectTotals)) {
      classAverages[subject] =
        Math.round((bucket.sum / bucket.count) * 10) / 10;
    }

    // Semester progress: graded assignments / all non-draft assignments issued to this section
    const totalIssued = await prisma.assignment.count({
      where: { sectionId: student.sectionId, status: { not: "DRAFT" } },
    });
    const gradedCount = history.length;
    const semesterProgressPct =
      totalIssued > 0 ? Math.round((gradedCount / totalIssued) * 100) : 0;

    return NextResponse.json({
      history,
      classAverages,
      semesterProgress: {
        graded: gradedCount,
        totalIssued,
        percent: semesterProgressPct,
      },
    });
  } catch (error) {
    console.error("Student performance fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
