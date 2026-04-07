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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const contentType = request.headers.get("content-type") || "";

    let title: string;
    let content: string;
    let reportDate: string;

    if (contentType.includes("multipart/form-data")) {
      // Handle .md file upload
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
      // Use filename (without extension) as title
      title = file.name.replace(/\.(md|txt)$/, "");
    } else {
      // Handle JSON body
      const body = await request.json();
      title = body.title;
      content = body.content;
      reportDate = body.reportDate || new Date().toISOString().split("T")[0];

      if (!title || !content) {
        return NextResponse.json({ error: "title 和 content 必填" }, { status: 400 });
      }
    }

    const report = await prisma.weeklyReport.create({
      data: {
        projectId: id,
        title,
        content,
        reportDate: new Date(reportDate),
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
