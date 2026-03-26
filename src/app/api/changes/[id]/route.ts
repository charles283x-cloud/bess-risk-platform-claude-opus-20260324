import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const change = await prisma.changeRequest.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.impactType !== undefined && { impactType: body.impactType }),
        ...(body.impactDays !== undefined && { impactDays: body.impactDays }),
        ...(body.impactCost !== undefined && { impactCost: body.impactCost }),
        ...(body.impactDetail !== undefined && { impactDetail: body.impactDetail }),
        ...(body.options !== undefined && { options: body.options }),
        ...(body.decisionStatus !== undefined && { decisionStatus: body.decisionStatus }),
        ...(body.decisionDate !== undefined && {
          decisionDate: body.decisionDate ? new Date(body.decisionDate) : null,
        }),
        ...(body.decisionNotes !== undefined && { decisionNotes: body.decisionNotes }),
      },
    });

    return NextResponse.json(change);
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

    await prisma.changeRequest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
