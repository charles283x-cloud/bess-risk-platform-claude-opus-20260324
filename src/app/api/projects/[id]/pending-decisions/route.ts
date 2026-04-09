import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const decisions = await prisma.pendingDecision.findMany({
      where: { projectId: id },
      orderBy: [
        // Pending first, then by created_at desc within each status group
        { status: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(decisions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
