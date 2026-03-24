import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calculateTrafficLight, getProjectStats } from "@/lib/risk";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        checklistItems: {
          include: { attachments: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const trafficLight = calculateTrafficLight(project);
    const stats = getProjectStats(project.checklistItems);

    // Stats by category
    const categories = [...new Set(project.checklistItems.map((i) => i.category))];
    const statsByCategory = categories.map((category) => {
      const categoryItems = project.checklistItems.filter((i) => i.category === category);
      return {
        category,
        ...getProjectStats(categoryItems),
      };
    });

    // Incomplete and overdue items
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incompleteItems = project.checklistItems
      .filter((i) => !i.isComplete)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        deadline: i.deadline,
        isOverdue: i.deadline ? new Date(i.deadline) < today : false,
      }));

    const overdueItems = incompleteItems.filter((i) => i.isOverdue);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        location: project.location,
        phase: project.phase,
        capacityMw: project.capacityMw,
        capacityMwh: project.capacityMwh,
        isHighRisk: project.isHighRisk,
      },
      trafficLight,
      stats,
      statsByCategory,
      incompleteItems,
      overdueItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
