import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();

    // Validate status transition
    if (body.status && !["pending", "decided", "withdrawn"].includes(body.status)) {
      return NextResponse.json({ error: "status 必须是 pending|decided|withdrawn" }, { status: 400 });
    }

    // Auto-set decided_at when transitioning to decided/withdrawn
    const settingTerminalStatus = body.status === "decided" || body.status === "withdrawn";

    const decision = await prisma.pendingDecision.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.impactNote !== undefined && { impactNote: body.impactNote }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.decisionNotes !== undefined && { decisionNotes: body.decisionNotes }),
        ...(settingTerminalStatus && { decidedAt: new Date() }),
      },
    });

    return NextResponse.json(decision);
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

    await prisma.pendingDecision.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
