import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { runQueueOnce } from "@/worker/process";

// ── Trigger ───────────────────────────────────
// This endpoint is called on a schedule by Upstash QStash (~every minute),
// not Vercel's own Cron feature -- Vercel Cron on the Hobby plan only
// supports once-per-day schedules, which is too infrequent for this
// pipeline. QStash sends a POST request signed with your project's
// signing keys; we verify that signature below so nobody else can trigger
// (and pay for) AI processing by hitting this URL directly.
//
// Set up in the Upstash Console -> QStash -> Schedules:
//   URL:      https://<your-vercel-domain>/api/cron/process-queue
//   Method:   POST
//   Cron:     * * * * *   (every minute)
//
// Required env vars (see Docs/TRD.md section 8 for the full list):
//   QSTASH_CURRENT_SIGNING_KEY
//   QSTASH_NEXT_SIGNING_KEY

export const maxDuration = 60; // seconds; requires Vercel Pro for >10s on some plans

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(request: NextRequest) {
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let isValid = false;
  try {
    isValid = await receiver.verify({ signature, body });
  } catch (error) {
    console.error("QStash signature verification error:", error);
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const result = await runQueueOnce();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Queue processing error:", error);
    return NextResponse.json(
      { error: "Queue processing failed" },
      { status: 500 },
    );
  }
}
