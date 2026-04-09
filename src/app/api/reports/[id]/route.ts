import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    // v4: Two-step delete to preserve decision history
    // 1. Delete pending pending_decisions linked to this weekly_report
    //    (status pending → loses meaning when source report disappears)
    // 2. Delete the weekly_report itself; FK ON DELETE SET NULL automatically
    //    handles decided/withdrawn rows (preserved with weekly_report_id = NULL)
    await prisma.$transaction(async (tx) => {
      await tx.pendingDecision.deleteMany({
        where: { weeklyReportId: id, status: "pending" },
      });
      await tx.weeklyReport.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
