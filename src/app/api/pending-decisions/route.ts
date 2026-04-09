import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { projectId, weeklyReportId, title, description, impactNote } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "projectId 和 title 必填" },
        { status: 400 }
      );
    }

    const decision = await prisma.pendingDecision.create({
      data: {
        projectId,
        weeklyReportId: weeklyReportId ?? null,
        title,
        description: description ?? null,
        impactNote: impactNote ?? null,
      },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
