import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lastSync = await prisma.syncLog.findFirst({
      orderBy: { runAt: "desc" },
    });

    return NextResponse.json({ lastSync });
  } catch (error) {
    console.error("Admin sync fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

import { Prisma } from "@prisma/client";
import mockStudents from "@/mock/students.json";
import mockFaculty from "@/mock/faculty.json";

interface MockStudent {
  computerCode: string;
  enrollmentNumber: string;
  fullName: string;
  branch: string;
  subBranch: string;
  section: number;
  year: number;
  semester: number;
  isActive: boolean;
}

interface MockFaculty {
  employeeId: string;
  instituteEmail: string;
  fullName: string;
  branch: string;
  subBranch: string;
  designation: string;
  isActive: boolean;
}

interface MismatchEntry {
  category:
    | "new_student"
    | "new_faculty"
    | "mismatch_student"
    | "mismatch_faculty"
    | "orphaned_student"
    | "orphaned_faculty";
  identifier: string;
  name: string;
  details: string;
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.student.findMany({
      include: {
        user: { select: { isActive: true } },
        section: { include: { subBranch: { include: { branch: true } } } },
      },
    });
    const facultyList = await prisma.faculty.findMany({
      include: { user: { select: { isActive: true } }, branch: true },
    });

    const studentByEnrollment = new Map<string, (typeof students)[number]>(
      students.map((s) => [s.enrollmentNumber, s]),
    );
    const facultyByEmployeeId = new Map<string, (typeof facultyList)[number]>(
      facultyList.map((f) => [f.employeeId, f]),
    );

    let matchedCount = 0;
    let newCount = 0;
    const mismatches: MismatchEntry[] = [];

    // Compare mock students against DB
    for (const mock of mockStudents as MockStudent[]) {
      const dbStudent = studentByEnrollment.get(mock.enrollmentNumber);
      if (!dbStudent) {
        newCount++;
        mismatches.push({
          category: "new_student",
          identifier: mock.enrollmentNumber,
          name: mock.fullName,
          details:
            "Present in institute records, not yet onboarded (no account created yet).",
        });
        continue;
      }
      const diffs: string[] = [];
      if (dbStudent.fullName !== mock.fullName) {
        diffs.push(`name: "${dbStudent.fullName}" → "${mock.fullName}"`);
      }
      if (dbStudent.user.isActive !== mock.isActive) {
        diffs.push(
          `active status: ${dbStudent.user.isActive} → ${mock.isActive}`,
        );
      }
      if (dbStudent.section.subBranch.branch.name !== mock.branch) {
        diffs.push(
          `branch: "${dbStudent.section.subBranch.branch.name}" → "${mock.branch}"`,
        );
      }
      if (dbStudent.section.subBranch.name !== mock.subBranch) {
        diffs.push(
          `sub-branch: "${dbStudent.section.subBranch.name}" → "${mock.subBranch}"`,
        );
      }
      if (dbStudent.section.sectionNumber !== mock.section) {
        diffs.push(
          `section: ${dbStudent.section.sectionNumber} → ${mock.section}`,
        );
      }
      if (dbStudent.year !== mock.year) {
        diffs.push(`year: ${dbStudent.year} → ${mock.year}`);
      }

      if (diffs.length > 0) {
        mismatches.push({
          category: "mismatch_student",
          identifier: mock.enrollmentNumber,
          name: mock.fullName,
          details: diffs.join("; "),
        });
      } else {
        matchedCount++;
      }
    }

    // Compare mock faculty against DB
    for (const mock of mockFaculty as MockFaculty[]) {
      const dbFaculty = facultyByEmployeeId.get(mock.employeeId);
      if (!dbFaculty) {
        newCount++;
        mismatches.push({
          category: "new_faculty",
          identifier: mock.employeeId,
          name: mock.fullName,
          details:
            "Present in institute records, not yet onboarded (no account created yet).",
        });
        continue;
      }
      const diffs: string[] = [];
      if (dbFaculty.fullName !== mock.fullName) {
        diffs.push(`name: "${dbFaculty.fullName}" → "${mock.fullName}"`);
      }
      if (dbFaculty.user.isActive !== mock.isActive) {
        diffs.push(
          `active status: ${dbFaculty.user.isActive} → ${mock.isActive}`,
        );
      }
      if (dbFaculty.branch.name !== mock.branch) {
        diffs.push(`branch: "${dbFaculty.branch.name}" → "${mock.branch}"`);
      }
      if (dbFaculty.instituteEmail !== mock.instituteEmail) {
        diffs.push(
          `email: "${dbFaculty.instituteEmail}" → "${mock.instituteEmail}"`,
        );
      }

      if (diffs.length > 0) {
        mismatches.push({
          category: "mismatch_faculty",
          identifier: mock.employeeId,
          name: mock.fullName,
          details: diffs.join("; "),
        });
      } else {
        matchedCount++;
      }
    }

    // DB records with no corresponding mock entry
    const mockEnrollments = new Set(
      (mockStudents as MockStudent[]).map((m) => m.enrollmentNumber),
    );
    for (const s of students) {
      if (!mockEnrollments.has(s.enrollmentNumber)) {
        mismatches.push({
          category: "orphaned_student",
          identifier: s.enrollmentNumber,
          name: s.fullName,
          details: "Exists in our system but not found in institute records.",
        });
      }
    }
    const mockEmployeeIds = new Set(
      (mockFaculty as MockFaculty[]).map((m) => m.employeeId),
    );
    for (const f of facultyList) {
      if (!mockEmployeeIds.has(f.employeeId)) {
        mismatches.push({
          category: "orphaned_faculty",
          identifier: f.employeeId,
          name: f.fullName,
          details: "Exists in our system but not found in institute records.",
        });
      }
    }

    const mismatchCount = mismatches.filter(
      (m) => m.category !== "new_student" && m.category !== "new_faculty",
    ).length;

    const syncLog = await prisma.syncLog.create({
      data: {
        matchedCount,
        newCount,
        mismatchCount,
        mismatches: mismatches as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ lastSync: syncLog });
  } catch (error) {
    console.error("Admin sync run error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
