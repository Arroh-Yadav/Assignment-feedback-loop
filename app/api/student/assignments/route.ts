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
      include: {
        section: {
          include: { subBranch: { include: { branch: true } } },
        },
      },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    // Fetch all active assignments for student's section
    const assignments = await prisma.assignment.findMany({
      where: { sectionId: student.sectionId, status: "ACTIVE" },
      include: {
        faculty: { select: { fullName: true } },
      },
      orderBy: { deadline: "asc" },
    });

    // Fetch all submissions by this student
    const submissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      select: {
        id: true,
        assignmentId: true,
        status: true,
        submittedAt: true,
      },
    });

    // Map submissions by assignmentId for quick lookup
    const submissionMap: Record<string, (typeof submissions)[0]> = {};
    submissions.forEach((s) => {
      submissionMap[s.assignmentId] = s;
    });

    return NextResponse.json({
      student: {
        fullName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        year: student.year,
        semester: student.semester,
        sectionNumber: student.section.sectionNumber,
        subBranchName: student.section.subBranch.name,
        branchName: student.section.subBranch.branch.name,
      },
      assignments,
      submissionMap,
    });
  } catch (error) {
    console.error("Student assignments fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
