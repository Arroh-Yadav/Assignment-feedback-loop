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

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: {
        faculty: { select: { fullName: true } },
        section: {
          include: { subBranch: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 },
      );
    }

    // Check if student's section matches
    if (assignment.sectionId !== student.sectionId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Check existing submission
    const submission = await prisma.submission.findFirst({
      where: { assignmentId: params.id, studentId: student.id },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        pageCount: true,
      },
    });

    return NextResponse.json({
      assignment: {
        ...assignment,
        referenceFileUrl: assignment.referenceFileUrl
          ? getSignedFileUrl(assignment.referenceFileUrl)
          : null,
      },
      submission,
    });
  } catch (error) {
    console.error("Assignment fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
