import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      branchCode,
      branchName,
      subBranchCode,
      subBranchName,
      sectionNumber,
      year,
      semester,
    } = body;

    if (!branchCode || !subBranchCode || !sectionNumber || !year || !semester) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Check if profile already exists
    const existing = await prisma.student.findUnique({
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

    // Find or create Section
    let section = await prisma.section.findFirst({
      where: {
        subBranchId: subBranch.id,
        sectionNumber: Number(sectionNumber),
        year: Number(year),
      },
    });
    if (!section) {
      section = await prisma.section.create({
        data: {
          subBranchId: subBranch.id,
          sectionNumber: Number(sectionNumber),
          year: Number(year),
        },
      });
    }

    // Create Student profile
    // NOTE: fullName is a known placeholder — fix before Phase 2
    const student = await prisma.student.create({
      data: {
        userId: session.userId,
        fullName: user.enrollmentOrEmail, // 🚩 known issue — replace with real name from institute DB
        enrollmentNumber: user.enrollmentOrEmail,
        computerCode: user.employeeOrComputerCode,
        sectionId: section.id,
        year: Number(year),
        semester: Number(semester),
      },
    });

    return NextResponse.json({ success: true, studentId: student.id });
  } catch (error) {
    console.error("Student setup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
