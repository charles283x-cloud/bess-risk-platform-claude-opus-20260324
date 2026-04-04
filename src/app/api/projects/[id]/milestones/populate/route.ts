import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_MILESTONES } from "@/lib/milestone-defaults";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    // Check if project already has milestones
    const existing = await prisma.milestone.count({ where: { projectId: id } });
    if (existing > 0) {
      return NextResponse.json(
        { error: "项目已有里程碑，请先清空后再初始化" },
        { status: 400 }
      );
    }

    await prisma.milestone.createMany({
      data: DEFAULT_MILESTONES.map((m) => ({
        projectId: id,
        name: m.name,
        description: m.description,
        isHardGate: m.isHardGate,
        sortOrder: m.sortOrder,
      })),
    });

    const milestones = await prisma.milestone.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(milestones, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
