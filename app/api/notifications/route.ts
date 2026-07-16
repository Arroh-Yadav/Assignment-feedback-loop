import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
