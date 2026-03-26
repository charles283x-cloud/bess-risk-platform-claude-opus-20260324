import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    // Auto-set actualEndDate when status is "completed" and no actualEndDate provided
    const autoActualEnd =
      body.status === "completed" && body.actualEndDate === undefined;
    // Auto-set actualStartDate when status changes to "in_progress" and no actualStartDate
    const autoActualStart =
      body.status === "in_progress" && body.actualStartDate === undefined;

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.plannedStartDate !== undefined && {
          plannedStartDate: new Date(body.plannedStartDate),
        }),
        ...(body.plannedEndDate !== undefined && {
          plannedEndDate: new Date(body.plannedEndDate),
        }),
        ...(body.actualStartDate !== undefined && {
          actualStartDate: body.actualStartDate ? new Date(body.actualStartDate) : null,
        }),
        ...(autoActualStart && { actualStartDate: new Date() }),
        ...(body.actualEndDate !== undefined && {
          actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : null,
        }),
        ...(autoActualEnd && { actualEndDate: new Date() }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json(milestone);
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

    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
