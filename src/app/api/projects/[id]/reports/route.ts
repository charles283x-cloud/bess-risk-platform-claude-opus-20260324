import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const reports = await prisma.weeklyReport.findMany({
      where: { projectId: id },
      orderBy: { reportDate: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface PendingDecisionInput {
  title: string;
  description?: string;
  impactNote?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const contentType = request.headers.get("content-type") || "";

    let title: string;
    let content: string;
    let reportDate: string;
    let nextWeekTasks: string | null = null;
    let blockers: string | null = null;
    let pendingDecisionsRaw: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle .md file upload + new v4 fields
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      reportDate = (formData.get("reportDate") as string) || new Date().toISOString().split("T")[0];

      if (!file) {
        return NextResponse.json({ error: "请上传 .md 文件" }, { status: 400 });
      }

      if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
        return NextResponse.json({ error: "仅支持 .md 或 .txt 文件" }, { status: 400 });
      }

      content = await file.text();
      title = file.name.replace(/\.(md|txt)$/, "");

      // v4 new optional structured fields (backward compat: old uploads work fine)
      nextWeekTasks = (formData.get("nextWeekTasks") as string) || null;
      blockers = (formData.get("blockers") as string) || null;
      pendingDecisionsRaw = (formData.get("pendingDecisions") as string) || null;
    } else {
      // Handle JSON body
      const body = await request.json();
      title = body.title;
      content = body.content;
      reportDate = body.reportDate || new Date().toISOString().split("T")[0];
      nextWeekTasks = body.nextWeekTasks ?? null;
      blockers = body.blockers ?? null;
      pendingDecisionsRaw = body.pendingDecisions
        ? JSON.stringify(body.pendingDecisions)
        : null;

      if (!title || !content) {
        return NextResponse.json({ error: "title 和 content 必填" }, { status: 400 });
      }
    }

    // Parse and validate pending decisions JSON if provided
    let parsedPendingDecisions: PendingDecisionInput[] = [];
    if (pendingDecisionsRaw) {
      try {
        const parsed = JSON.parse(pendingDecisionsRaw);
        if (!Array.isArray(parsed)) {
          return NextResponse.json({ error: "pendingDecisions 必须是数组" }, { status: 400 });
        }
        // Validate each item has a title
        for (const item of parsed) {
          if (!item || typeof item !== "object" || !item.title) {
            return NextResponse.json(
              { error: "每个 pendingDecision 必须有 title 字段" },
              { status: 400 }
            );
          }
        }
        parsedPendingDecisions = parsed;
      } catch {
        return NextResponse.json({ error: "pendingDecisions JSON 格式非法" }, { status: 400 });
      }
    }

    // Create weekly report + pending_decisions in single transaction
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.weeklyReport.create({
        data: {
          projectId: id,
          title,
          content,
          reportDate: new Date(reportDate),
          nextWeekTasks,
          blockers,
        },
      });

      if (parsedPendingDecisions.length > 0) {
        await tx.pendingDecision.createMany({
          data: parsedPendingDecisions.map((d) => ({
            projectId: id,
            weeklyReportId: report.id,
            title: d.title,
            description: d.description ?? null,
            impactNote: d.impactNote ?? null,
          })),
        });
      }

      return report;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
