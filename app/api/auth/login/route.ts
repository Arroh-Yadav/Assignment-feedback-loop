import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, credentials } = body;

    // Step 1 — Verify against institute DB (mock or real)
    const instituteDbUrl =
      process.env.INSTITUTE_DB_API_URL ||
      `https://assignment-feedback-loop-sb7n.vercel.app/api/mock-institute-db`;

    const instituteRes = await fetch(instituteDbUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.INSTITUTE_DB_API_KEY!,
      },
      body: JSON.stringify({ role: role.toLowerCase(), credentials }),
    });

    if (!instituteRes.ok) {
      return NextResponse.json(
        { error: "Access denied. Contact Admin." },
        { status: 401 },
      );
    }

    const instituteUser = await instituteRes.json();
    if (!instituteUser) {
      return NextResponse.json(
        { error: "Access denied. Contact Admin." },
        { status: 401 },
      );
    }

    // Step 2 — Find or create user in our DB
    const mappedRole = role.toUpperCase() as "STUDENT" | "FACULTY" | "ADMIN";

    let user = await prisma.user.findFirst({
      where: {
        employeeOrComputerCode:
          credentials.computerCode || credentials.employeeId,
        role: mappedRole,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          role: mappedRole,
          employeeOrComputerCode:
            credentials.computerCode || credentials.employeeId,
          enrollmentOrEmail:
            credentials.enrollmentNumber || credentials.instituteEmail,
          isActive: true,
          lastLogin: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Step 3 — Create session
    await createSession({ userId: user.id, role: mappedRole });

    // Step 4 — Check if profile setup is complete
    let profileComplete = false;

    if (mappedRole === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
      });
      profileComplete = !!student;
    } else if (mappedRole === "FACULTY") {
      const facultyProfile = await prisma.faculty.findUnique({
        where: { userId: user.id },
      });
      profileComplete = !!facultyProfile;
    } else {
      profileComplete = true;
    }

    return NextResponse.json({
      success: true,
      role: mappedRole,
      profileComplete,
      fullName: instituteUser.fullName,
      instituteEmail: instituteUser.instituteEmail ?? null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
