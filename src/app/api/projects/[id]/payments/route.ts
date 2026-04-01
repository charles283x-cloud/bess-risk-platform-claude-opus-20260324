import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const payments = await prisma.paymentRecord.findMany({
      where: { projectId: id },
      orderBy: [{ plannedDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const { type, category, description, plannedAmount, plannedDate, actualAmount, actualDate, notes } = body;

    if (!type || !category || !description || plannedAmount === undefined || !plannedDate) {
      return NextResponse.json(
        { error: "type, category, description, plannedAmount, plannedDate are required" },
        { status: 400 }
      );
    }

    // Get next sort order
    const maxSort = await prisma.paymentRecord.aggregate({
      where: { projectId: id },
      _max: { sortOrder: true },
    });

    const payment = await prisma.paymentRecord.create({
      data: {
        projectId: id,
        type,
        category,
        description,
        plannedAmount: parseFloat(plannedAmount),
        plannedDate: new Date(plannedDate),
        actualAmount: actualAmount != null ? parseFloat(actualAmount) : null,
        actualDate: actualDate ? new Date(actualDate) : null,
        notes: notes || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
