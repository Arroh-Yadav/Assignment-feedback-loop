import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

interface FeedbackItem {
  type: "correct" | "error" | "warning";
  message: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    if (!sectionId) {
      return NextResponse.json(
        { error: "sectionId is required." },
        { status: 400 },
      );
    }

    const faculty = await prisma.faculty.findUnique({
      where: { userId: session.userId },
      include: {
        facultySections: {
          include: { section: { include: { subBranch: true } } },
        },
      },
    });
    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty profile not found." },
        { status: 404 },
      );
    }

    // Verify faculty actually teaches this section
    const ownedSection = faculty.facultySections.find(
      (fs) => fs.sectionId === sectionId,
    );
    if (!ownedSection) {
      return NextResponse.json(
        { error: "Section not found or access denied." },
        { status: 403 },
      );
    }

    // All of this faculty's assignments for the section, with submissions,
    // published evaluations, and AI feedback items
    const assignments = await prisma.assignment.findMany({
      where: { facultyId: faculty.id, sectionId },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          include: {
            student: {
              select: { id: true, fullName: true, enrollmentNumber: true },
            },
            evaluation: { select: { finalMarks: true, status: true } },
            aiFeedback: { select: { feedbackItems: true } },
          },
        },
      },
    });

    // Per-assignment averages (published evaluations only)
    const perAssignment = assignments.map((a) => {
      const published = a.submissions.filter(
        (s) => s.evaluation?.status === "PUBLISHED",
      );
      const avgMarks =
        published.length > 0
          ? published.reduce((sum, s) => sum + s.evaluation!.finalMarks, 0) /
            published.length
          : null;
      const avgPercentage =
        avgMarks !== null ? (avgMarks / a.maxMarks) * 100 : null;
      return {
        assignmentId: a.id,
        title: a.title,
        maxMarks: a.maxMarks,
        createdAt: a.createdAt,
        avgMarks: avgMarks !== null ? Math.round(avgMarks * 10) / 10 : null,
        avgPercentage:
          avgPercentage !== null ? Math.round(avgPercentage * 10) / 10 : null,
        gradedCount: published.length,
        totalSubmissions: a.submissions.length,
      };
    });

    // Top 5 most common error messages (exact-match frequency) across all
    // AI feedback for this section's assignments
    const errorCounts: Record<string, number> = {};
    for (const a of assignments) {
      for (const s of a.submissions) {
        if (!s.aiFeedback) continue;
        const items = s.aiFeedback.feedbackItems as unknown as FeedbackItem[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (item.type !== "error") continue;
          errorCounts[item.message] = (errorCounts[item.message] ?? 0) + 1;
        }
      }
    }
    const topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    // Student-wise marks matrix (published evaluations only; null = not graded yet)
    const studentMap: Record
      string,
      {
        studentId: string;
        fullName: string;
        enrollmentNumber: string;
        marks: Record<string, number | null>;
      }
    > = {};
    for (const a of assignments) {
      for (const s of a.submissions) {
        const st = s.student;
        if (!studentMap[st.id]) {
          studentMap[st.id] = {
            studentId: st.id,
            fullName: st.fullName,
            enrollmentNumber: st.enrollmentNumber,
            marks: {},
          };
        }
        studentMap[st.id].marks[a.id] =
          s.evaluation?.status === "PUBLISHED" ? s.evaluation.finalMarks : null;
      }
    }
    const studentMarks = Object.values(studentMap).sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );

    return NextResponse.json({
      section: {
        id: ownedSection.sectionId,
        label: `${ownedSection.section.subBranch.name} · Sec ${ownedSection.section.sectionNumber} · ${ownedSection.subjectName}`,
      },
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        maxMarks: a.maxMarks,
      })),
      perAssignment,
      topErrors,
      studentMarks,
    });
  } catch (error) {
    console.error("Faculty analytics fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}