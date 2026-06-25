import { NextRequest, NextResponse } from "next/server";
import { decodeRole } from "@/lib/auth";

const COOKIE_NAME = "afl_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Public route — allow always
  if (pathname === "/login") {
    // If already logged in redirect to correct dashboard
    if (token) {
      const session = await decodeRole(token);
      if (session) {
        return NextResponse.redirect(
          new URL(getDashboard(session.role), request.url),
        );
      }
    }
    return NextResponse.next();
  }

  // All other routes require a valid session
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await decodeRole(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based route protection
  if (pathname.startsWith("/student") && session.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/faculty") && session.role !== "FACULTY") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

function getDashboard(role: string): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "FACULTY":
      return "/faculty/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/login", "/student/:path*", "/faculty/:path*", "/admin/:path*"],
};
