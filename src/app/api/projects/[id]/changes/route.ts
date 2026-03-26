import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const changes = await prisma.changeRequest.findMany({
      where: { projectId: id },
      orderBy: [
        { decisionStatus: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(changes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, impactType, impactDetail, options, impactDays, impactCost } = body;

    if (!title || !description || !impactType || !impactDetail || !options) {
      return NextResponse.json(
        { error: "title, description, impactType, impactDetail, and options are required" },
        { status: 400 }
      );
    }

    const validImpactTypes = ["schedule", "cost", "both"];
    if (!validImpactTypes.includes(impactType)) {
      return NextResponse.json(
        { error: "impactType must be one of: schedule, cost, both" },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 1 || options.length > 3) {
      return NextResponse.json(
        { error: "options must be an array with 1 to 3 items" },
        { status: 400 }
      );
    }

    for (const opt of options) {
      if (!opt.label || !opt.description) {
        return NextResponse.json(
          { error: "Each option must have a label and description" },
          { status: 400 }
        );
      }
    }

    const change = await prisma.changeRequest.create({
      data: {
        projectId: id,
        title,
        description,
        impactType,
        impactDetail,
        options,
        impactDays: impactDays ?? null,
        impactCost: impactCost ?? null,
      },
    });

    return NextResponse.json(change, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
