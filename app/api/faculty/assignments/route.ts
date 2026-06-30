import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";
import { uploadReferenceFile } from "@/lib/cloudinary";
import { v4 as uuidv4 } from "uuid";

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

    const formData = await request.formData();

    const sectionId = formData.get("sectionId") as string;
    const subjectName = formData.get("subjectName") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const maxMarks = formData.get("maxMarks") as string;
    const deadline = formData.get("deadline") as string;
    const statusInput = formData.get("status") as string;
    const referenceFile = formData.get("referenceFile") as File | null;

    // Validate required fields
    if (
      !sectionId ||
      !subjectName ||
      !title ||
      !description ||
      !maxMarks ||
      !deadline
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Verify faculty teaches this section
    const facultySection = await prisma.facultySection.findFirst({
      where: { facultyId: faculty.id, sectionId },
    });
    if (!facultySection) {
      return NextResponse.json(
        { error: "You do not teach this section." },
        { status: 403 },
      );
    }

    // Handle optional reference file upload
    let referenceFileUrl: string | null = null;
    const assignmentId = uuidv4();

    if (referenceFile && referenceFile.size > 0) {
      const bytes = await referenceFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      referenceFileUrl = await uploadReferenceFile(
        buffer,
        assignmentId,
        referenceFile.name,
      );
    }

    const status = statusInput === "active" ? "ACTIVE" : "DRAFT";

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        id: assignmentId,
        facultyId: faculty.id,
        sectionId,
        title: title.trim(),
        description: description.trim(),
        subjectName: subjectName.trim(),
        maxMarks: Number(maxMarks),
        deadline: new Date(deadline),
        status,
        referenceFileUrl,
      },
    });

    return NextResponse.json({ success: true, assignmentId: assignment.id });
  } catch (error) {
    console.error("Assignment creation error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { userId: session.userId },
      include: {
        facultySections: {
          include: {
            section: {
              include: { subBranch: true },
            },
          },
        },
      },
    });
    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ facultySections: faculty.facultySections });
  } catch (error) {
    console.error("Faculty sections fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
