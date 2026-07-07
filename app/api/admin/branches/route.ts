import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branches = await prisma.branch.findMany({
      orderBy: { name: "asc" },
      include: {
        subBranches: {
          orderBy: { name: "asc" },
          include: {
            sections: {
              orderBy: [{ year: "asc" }, { sectionNumber: "asc" }],
              include: {
                students: { select: { id: true } },
                facultySections: { select: { facultyId: true } },
              },
            },
          },
        },
      },
    });

    const tree = branches.map((branch) => {
      const branchFacultyIds = new Set<string>();
      const subBranches = branch.subBranches.map((sb) => {
        const subBranchFacultyIds = new Set<string>();
        const sections = sb.sections.map((sec) => {
          const sectionFacultyIds = new Set<string>(
            sec.facultySections.map(
              (fs: { facultyId: string }) => fs.facultyId,
            ),
          );
          sectionFacultyIds.forEach((id) => {
            subBranchFacultyIds.add(id);
            branchFacultyIds.add(id);
          });
          return {
            id: sec.id,
            sectionNumber: sec.sectionNumber,
            year: sec.year,
            isActive: sec.isActive,
            studentCount: sec.students.length,
            facultyCount: sectionFacultyIds.size,
          };
        });
        const subBranchStudentTotal = sections.reduce(
          (sum, s) => sum + s.studentCount,
          0,
        );
        return {
          id: sb.id,
          name: sb.name,
          code: sb.code,
          isActive: sb.isActive,
          studentCount: subBranchStudentTotal,
          facultyCount: subBranchFacultyIds.size,
          sections,
        };
      });
      const branchStudentTotal = subBranches.reduce(
        (sum, sb) => sum + sb.studentCount,
        0,
      );
      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        isActive: branch.isActive,
        studentCount: branchStudentTotal,
        facultyCount: branchFacultyIds.size,
        subBranches,
      };
    });

    return NextResponse.json({ branches: tree });
  } catch (error) {
    console.error("Admin branches fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
