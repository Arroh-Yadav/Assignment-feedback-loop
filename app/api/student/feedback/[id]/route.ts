import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        assignment: {
          select: {
            title: true,
            subjectName: true,
            maxMarks: true,
            description: true,
          },
        },
        evaluation: {
          include: {
            annotations: true,
            faculty: { select: { fullName: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 },
      );
    }

    // Verify this submission belongs to the student
    if (submission.studentId !== student.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Only show if evaluation is published
    if (
      !submission.evaluation ||
      submission.evaluation.status !== "PUBLISHED"
    ) {
      return NextResponse.json(
        { error: "Feedback is not available yet." },
        { status: 403 },
      );
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
