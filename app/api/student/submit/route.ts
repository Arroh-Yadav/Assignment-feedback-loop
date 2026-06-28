import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";
import { uploadSubmissionFile } from "@/lib/cloudinary";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const assignmentId = formData.get("assignmentId") as string;
    const studentNote = formData.get("studentNote") as string | null;
    const files = formData.getAll("files") as File[];

    if (!assignmentId || files.length === 0) {
      return NextResponse.json(
        { error: "Assignment ID and at least one file are required." },
        { status: 400 },
      );
    }

    // Check assignment exists and is active
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 },
      );
    }
    if (assignment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This assignment is not active." },
        { status: 400 },
      );
    }
    if (new Date() > assignment.deadline) {
      return NextResponse.json(
        { error: "Deadline has passed." },
        { status: 400 },
      );
    }

    // Check student belongs to this section
    if (assignment.sectionId !== student.sectionId) {
      return NextResponse.json(
        { error: "This assignment is not for your section." },
        { status: 403 },
      );
    }

    // Check for duplicate submission
    const existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId: student.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted this assignment." },
        { status: 409 },
      );
    }

    // Upload all files to Cloudinary
    const submissionId = uuidv4();
    const fileUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const url = await uploadSubmissionFile(buffer, submissionId, i + 1);
      fileUrls.push(url);
    }

    // Save submission to DB
    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        assignmentId,
        studentId: student.id,
        status: "SUBMITTED",
        fileUrls,
        pageCount: files.length,
        studentNote: studentNote?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
