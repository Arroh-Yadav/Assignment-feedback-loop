import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.student.findMany({
      include: {
        user: { select: { id: true, isActive: true, lastLogin: true } },
        section: {
          include: { subBranch: { include: { branch: true } } },
        },
      },
    });

    const facultyList = await prisma.faculty.findMany({
      include: {
        user: { select: { id: true, isActive: true, lastLogin: true } },
        branch: true,
      },
    });

    const users = [
      ...students.map((s) => ({
        userId: s.user.id,
        name: s.fullName,
        idNumber: s.enrollmentNumber,
        branch: s.section.subBranch.branch.name,
        role: "STUDENT" as const,
        lastLogin: s.user.lastLogin,
        isActive: s.user.isActive,
      })),
      ...facultyList.map((f) => ({
        userId: f.user.id,
        name: f.fullName,
        idNumber: f.employeeId,
        branch: f.branch.name,
        role: "FACULTY" as const,
        lastLogin: f.user.lastLogin,
        isActive: f.user.isActive,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
