import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }
    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ id: updated.id, isRead: updated.isRead });
  } catch (error) {
    console.error("Notification mark-read error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
