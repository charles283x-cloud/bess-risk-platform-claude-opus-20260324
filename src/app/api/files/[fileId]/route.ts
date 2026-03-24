import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getFile, deleteFile } from "@/lib/files";

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { fileId } = await context.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: fileId },
    });

    if (!attachment) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await getFile(attachment.storedName);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        "Content-Length": String(attachment.sizeBytes),
      },
    });
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
    const { fileId } = await context.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: fileId },
    });

    if (!attachment) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from disk
    await deleteFile(attachment.storedName);

    // Remove DB record
    await prisma.attachment.delete({ where: { id: fileId } });

    // If last attachment on item, mark item incomplete
    const remainingCount = await prisma.attachment.count({
      where: { checklistItemId: attachment.checklistItemId },
    });

    if (remainingCount === 0) {
      await prisma.checklistItem.update({
        where: { id: attachment.checklistItemId },
        data: {
          isComplete: false,
          completedAt: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
