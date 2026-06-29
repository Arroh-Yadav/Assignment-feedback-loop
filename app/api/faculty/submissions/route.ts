import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required." },
        { status: 400 },
      );
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

    // Verify faculty owns this assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        section: {
          include: { subBranch: true },
        },
      },
    });
    if (!assignment || assignment.facultyId !== faculty.id) {
      return NextResponse.json(
        { error: "Assignment not found or access denied." },
        { status: 403 },
      );
    }

    // Fetch all submissions for this assignment
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            fullName: true,
            enrollmentNumber: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    return NextResponse.json({ assignment, submissions });
  } catch (error) {
    console.error("Submissions fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
