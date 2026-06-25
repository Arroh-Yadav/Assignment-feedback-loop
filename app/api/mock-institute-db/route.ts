import { NextRequest, NextResponse } from "next/server";
import students from "@/mock/students.json";
import faculty from "@/mock/faculty.json";

export async function POST(request: NextRequest) {
  // Verify API key
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.INSTITUTE_DB_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { role, credentials } = body;

  if (role === "student") {
    const user = students.find(
      (s) =>
        s.computerCode === credentials.computerCode &&
        s.enrollmentNumber === credentials.enrollmentNumber &&
        s.isActive === true,
    );
    if (!user) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(user);
  }

  if (role === "faculty") {
    const user = faculty.find(
      (f) =>
        f.employeeId === credentials.employeeId &&
        f.instituteEmail === credentials.instituteEmail &&
        f.isActive === true,
    );
    if (!user) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(user);
  }

  if (role === "admin") {
    const user = faculty.find(
      (f) =>
        f.employeeId === credentials.employeeId &&
        f.instituteEmail === credentials.instituteEmail &&
        f.isActive === true &&
        f.designation === "Admin",
    );
    if (!user) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 400 });
}
