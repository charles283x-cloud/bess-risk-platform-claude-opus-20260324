import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { saveFile } from "@/lib/files";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;
    const photos = await prisma.sitePhoto.findMany({
      where: { projectId: id },
      orderBy: { takenAt: { sort: "desc", nulls: "last" } },
    });
    return NextResponse.json(photos);
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
    const description = formData.get("description") as string | null;
    const takenAt = formData.get("takenAt") as string | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "仅支持JPG、PNG、WebP格式" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小超过20MB限制" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = await saveFile(buffer, file.name, file.type);

    const photo = await prisma.sitePhoto.create({
      data: {
        projectId: id,
        description: description || null,
        originalName: file.name,
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
        takenAt: takenAt ? new Date(takenAt) : null,
      },
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
