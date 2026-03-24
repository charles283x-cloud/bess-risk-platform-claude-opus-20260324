import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { deleteFile } from "@/lib/files";

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

    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.capacityMw !== undefined && { capacityMw: body.capacityMw }),
        ...(body.capacityMwh !== undefined && { capacityMwh: body.capacityMwh }),
        ...(body.phase !== undefined && { phase: body.phase }),
        ...(body.targetSigningDate !== undefined && {
          targetSigningDate: body.targetSigningDate ? new Date(body.targetSigningDate) : null,
        }),
        ...(body.targetStartDate !== undefined && {
          targetStartDate: body.targetStartDate ? new Date(body.targetStartDate) : null,
        }),
        ...(body.targetEndDate !== undefined && {
          targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isHighRisk !== undefined && { isHighRisk: body.isHighRisk }),
      },
      include: {
        checklistItems: {
          include: { attachments: true },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    // Gather all attachments to delete files from disk
    const attachments = await prisma.attachment.findMany({
      where: { checklistItem: { projectId: id } },
    });

    for (const att of attachments) {
      await deleteFile(att.storedName);
    }

    // Cascade delete handled by Prisma schema
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
