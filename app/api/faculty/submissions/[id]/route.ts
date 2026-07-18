import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";
import { getSignedFileUrl } from "@/lib/cloudinary";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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
      where: { id: params.id },
      include: {
        student: {
          select: { fullName: true, enrollmentNumber: true },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            subjectName: true,
            maxMarks: true,
            description: true,
            facultyId: true,
          },
        },
        evaluation: {
          include: { annotations: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 },
      );
    }

    // Verify faculty owns this assignment
    if (submission.assignment.facultyId !== faculty.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({
      submission: {
        ...submission,
        fileUrls: submission.fileUrls.map((f) => getSignedFileUrl(f)),
      },
    });
  } catch (error) {
    console.error("Submission fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
