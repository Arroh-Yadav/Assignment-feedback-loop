import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds ?? 60) },
      },
    );
  }

  await deleteSession();
  return NextResponse.json({ success: true });
}
