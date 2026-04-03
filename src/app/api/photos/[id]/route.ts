import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getFile, deleteFile } from "@/lib/files";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;
    const photo = await prisma.sitePhoto.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const buffer = await getFile(photo.storedName);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(photo.originalName)}"`,
        "Content-Length": String(photo.sizeBytes),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const photo = await prisma.sitePhoto.findUnique({ where: { id } });
    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFile(photo.storedName);
    await prisma.sitePhoto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
