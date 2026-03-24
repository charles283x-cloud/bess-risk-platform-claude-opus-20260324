import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calculateTrafficLight } from "@/lib/risk";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const projects = await prisma.project.findMany({
      include: {
        checklistItems: true,
      },
    });

    const projectsWithLight = projects.map((project) => ({
      id: project.id,
      name: project.name,
      location: project.location,
      phase: project.phase,
      capacityMw: project.capacityMw,
      capacityMwh: project.capacityMwh,
      isHighRisk: project.isHighRisk,
      trafficLight: calculateTrafficLight(project),
    }));

    const summary = {
      total: projectsWithLight.length,
      red: projectsWithLight.filter((p) => p.trafficLight === "red").length,
      yellow: projectsWithLight.filter((p) => p.trafficLight === "yellow").length,
      green: projectsWithLight.filter((p) => p.trafficLight === "green").length,
    };

    return NextResponse.json({ projects: projectsWithLight, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
