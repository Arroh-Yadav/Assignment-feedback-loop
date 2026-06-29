import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { submissionId, finalMarks, facultyRemarks, publish } = body;

    if (!submissionId || finalMarks === undefined || !facultyRemarks) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Verify submission exists and faculty owns it
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { maxMarks: true, facultyId: true } },
        evaluation: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 },
      );
    }
    if (submission.assignment.facultyId !== faculty.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    if (Number(finalMarks) > submission.assignment.maxMarks) {
      return NextResponse.json(
        { error: `Marks cannot exceed ${submission.assignment.maxMarks}.` },
        { status: 400 },
      );
    }
    if (Number(finalMarks) < 0) {
      return NextResponse.json(
        { error: "Marks cannot be negative." },
        { status: 400 },
      );
    }

    const status = publish ? "PUBLISHED" : "IN_REVIEW";
    const publishedAt = publish ? new Date() : null;

    // Upsert evaluation
    const evaluation = await prisma.evaluation.upsert({
      where: { submissionId },
      update: {
        finalMarks: Number(finalMarks),
        facultyRemarks: facultyRemarks.trim(),
        status,
        publishedAt,
      },
      create: {
        submissionId,
        facultyId: faculty.id,
        finalMarks: Number(finalMarks),
        facultyRemarks: facultyRemarks.trim(),
        status,
        publishedAt,
      },
    });

    // Update submission status
    if (publish) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "GRADED" },
      });
    } else {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    return NextResponse.json({
      success: true,
      evaluationId: evaluation.id,
      published: publish,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
