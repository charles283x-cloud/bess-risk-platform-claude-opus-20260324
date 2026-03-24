import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { calculateTrafficLight, TrafficLight } from "@/lib/risk";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const projects = await prisma.project.findMany({
      include: {
        checklistItems: {
          include: {
            attachments: true,
          },
        },
      },
    });

    const projectsWithLight = projects.map((project) => ({
      ...project,
      trafficLight: calculateTrafficLight(project),
    }));

    const order: Record<TrafficLight, number> = { red: 0, yellow: 1, green: 2 };
    projectsWithLight.sort((a, b) => order[a.trafficLight] - order[b.trafficLight]);

    return NextResponse.json(projectsWithLight);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      location,
      capacityMw,
      capacityMwh,
      phase,
      targetSigningDate,
      targetStartDate,
      targetEndDate,
      notes,
    } = body;

    if (!name || !location || !phase) {
      return NextResponse.json(
        { error: "name, location, and phase are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        location,
        capacityMw: capacityMw ?? null,
        capacityMwh: capacityMwh ?? null,
        phase,
        targetSigningDate: targetSigningDate ? new Date(targetSigningDate) : null,
        targetStartDate: targetStartDate ? new Date(targetStartDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        notes: notes ?? null,
      },
    });

    // Copy matching ChecklistTemplate records into ChecklistItem records
    const templates = await prisma.checklistTemplate.findMany({
      where: { phase },
      orderBy: { sortOrder: "asc" },
    });

    if (templates.length > 0) {
      await prisma.checklistItem.createMany({
        data: templates.map((t) => ({
          projectId: project.id,
          templateId: t.id,
          name: t.name,
          category: t.category,
          phase: t.phase,
          riskDescription: t.riskDescription,
          deadline: null,
          sortOrder: t.sortOrder,
        })),
      });
    }

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        checklistItems: {
          include: { attachments: true },
        },
      },
    });

    return NextResponse.json(fullProject, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
