import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/supabase";

const VALID_TYPES = ["branch", "subbranch", "section"] as const;
type NodeType = (typeof VALID_TYPES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = await params;
    if (!VALID_TYPES.includes(type as NodeType)) {
      return NextResponse.json(
        { error: "Invalid node type. Must be branch, subbranch, or section." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { isActive } = body;
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean." },
        { status: 400 },
      );
    }

    let updated;
    if (type === "branch") {
      const existing = await prisma.branch.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Branch not found." },
          { status: 404 },
        );
      }
      updated = await prisma.branch.update({
        where: { id },
        data: { isActive },
      });
    } else if (type === "subbranch") {
      const existing = await prisma.subBranch.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Sub-branch not found." },
          { status: 404 },
        );
      }
      updated = await prisma.subBranch.update({
        where: { id },
        data: { isActive },
      });
    } else {
      const existing = await prisma.section.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Section not found." },
          { status: 404 },
        );
      }
      updated = await prisma.section.update({
        where: { id },
        data: { isActive },
      });
    }

    return NextResponse.json({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
    console.error("Admin branch node toggle error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
