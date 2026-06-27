import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

interface SectionSubject {
  sectionNumber: number;
  subjectName: string;
  subjectCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      branchCode,
      branchName,
      subBranchCode,
      subBranchName,
      totalSections,
      sectionSubjects,
      year,
      fullName,
      instituteEmail,
    } = body;

    if (
      !branchCode ||
      !subBranchCode ||
      !totalSections ||
      !sectionSubjects ||
      !year
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Check if profile already exists
    const existing = await prisma.faculty.findUnique({
      where: { userId: session.userId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Profile already set up." },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Upsert Branch
    const branch = await prisma.branch.upsert({
      where: { code: branchCode },
      update: {},
      create: { name: branchName || branchCode, code: branchCode },
    });

    // Upsert SubBranch
    const subBranch = await prisma.subBranch.upsert({
      where: { code: subBranchCode },
      update: {},
      create: {
        branchId: branch.id,
        name: subBranchName || subBranchCode,
        code: subBranchCode,
      },
    });

    // Create Faculty profile
    const faculty = await prisma.faculty.create({
      data: {
        userId: session.userId,
        fullName: fullName || user.enrollmentOrEmail,
        employeeId: user.employeeOrComputerCode,
        instituteEmail: instituteEmail || user.enrollmentOrEmail,
        branchId: branch.id,
      },
    });

    // Create sections and faculty-section mappings
    for (const ss of sectionSubjects as SectionSubject[]) {
      let section = await prisma.section.findFirst({
        where: {
          subBranchId: subBranch.id,
          sectionNumber: Number(ss.sectionNumber),
          year: Number(year),
        },
      });
      if (!section) {
        section = await prisma.section.create({
          data: {
            subBranchId: subBranch.id,
            sectionNumber: Number(ss.sectionNumber),
            year: Number(year),
          },
        });
      }

      await prisma.facultySection.create({
        data: {
          facultyId: faculty.id,
          sectionId: section.id,
          subjectName: ss.subjectName,
          subjectCode: ss.subjectCode,
        },
      });
    }

    return NextResponse.json({ success: true, facultyId: faculty.id });
  } catch (error) {
    console.error("Faculty setup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

