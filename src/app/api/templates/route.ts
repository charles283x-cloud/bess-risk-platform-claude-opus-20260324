import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const templates = await prisma.checklistTemplate.findMany({
      orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, category, phase, riskDescription, defaultDays, sortOrder } = body;

    if (!name || !category || !phase) {
      return NextResponse.json(
        { error: "name, category, and phase are required" },
        { status: 400 }
      );
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        name,
        category,
        phase,
        riskDescription: riskDescription || "",
        defaultDays: defaultDays ?? 30,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
