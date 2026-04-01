import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const payment = await prisma.paymentRecord.update({
      where: { id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.plannedAmount !== undefined && { plannedAmount: parseFloat(body.plannedAmount) }),
        ...(body.plannedDate !== undefined && { plannedDate: new Date(body.plannedDate) }),
        ...(body.actualAmount !== undefined && { actualAmount: body.actualAmount != null ? parseFloat(body.actualAmount) : null }),
        ...(body.actualDate !== undefined && { actualDate: body.actualDate ? new Date(body.actualDate) : null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
      },
    });

    return NextResponse.json(payment);
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

    await prisma.paymentRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
