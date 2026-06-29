import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { evaluationId, pageNumber, type, coordinates, content } = body;

    if (!evaluationId || !pageNumber || !type || !coordinates || !content) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Verify evaluation exists
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        faculty: { select: { userId: true } },
      },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found." },
        { status: 404 },
      );
    }
    if (evaluation.faculty.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const annotation = await prisma.annotation.create({
      data: {
        evaluationId,
        pageNumber: Number(pageNumber),
        type,
        coordinates,
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, annotationId: annotation.id });
  } catch (error) {
    console.error("Annotation error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { annotationId } = body;

    await prisma.annotation.delete({ where: { id: annotationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Annotation delete error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
