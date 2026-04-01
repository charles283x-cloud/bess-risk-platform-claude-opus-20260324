import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { saveFile } from "@/lib/files";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const contracts = await prisma.contract.findMany({
      where: { projectId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(contracts);
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const category = (formData.get("category") as string) || "incoming";

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "仅支持PDF格式" }, { status: 400 });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB for contracts
    if (file.size > maxSize) {
      return NextResponse.json({ error: "文件大小超过50MB限制" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = await saveFile(buffer, file.name, file.type);

    const contract = await prisma.contract.create({
      data: {
        projectId: id,
        category,
        name: name || file.name.replace(/\.pdf$/i, ""),
        originalName: file.name,
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
