import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { userId: session.userId },
    });
    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty profile not found." },
        { status: 404 },
      );
    }

    const submission = await prisma.submission.findUnique({
      where: { id: params.submissionId },
      select: {
        status: true,
        assignment: { select: { facultyId: true } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 },
      );
    }

    // Verify faculty owns this assignment (same check as
    // /api/faculty/submissions/[id])
    if (submission.assignment.facultyId !== faculty.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const aiFeedback = await prisma.aIFeedback.findUnique({
      where: { submissionId: params.submissionId },
    });

    return NextResponse.json({
      submissionStatus: submission.status,
      aiFeedback, // null if not generated yet (still processing, or errored before ever saving)
    });
  } catch (error) {
    console.error("AI feedback fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
