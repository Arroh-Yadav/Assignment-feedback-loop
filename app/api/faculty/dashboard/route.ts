import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "FACULTY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { userId: session.userId },
      include: {
        branch: { select: { name: true } },
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

    const assignments = await prisma.assignment.findMany({
      where: { facultyId: faculty.id },
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      faculty: {
        fullName: faculty.fullName,
        employeeId: faculty.employeeId,
        instituteEmail: faculty.instituteEmail,
        branch: faculty.branch,
      },
      facultySections: faculty.facultySections,
      assignments,
    });
  } catch (error) {
    console.error("Faculty dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
