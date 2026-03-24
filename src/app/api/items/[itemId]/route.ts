import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFile } from "@/lib/files";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { itemId } = await context.params;
    const body = await request.json();

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.deadline !== undefined && {
          deadline: body.deadline ? new Date(body.deadline) : null,
        }),
        ...(body.riskDescription !== undefined && { riskDescription: body.riskDescription }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isComplete !== undefined && {
          isComplete: body.isComplete,
          completedAt: body.isComplete ? new Date() : null,
        }),
      },
      include: { attachments: true },
    });

    return NextResponse.json(item);
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
    const { itemId } = await context.params;

    // Delete files from disk
    const attachments = await prisma.attachment.findMany({
      where: { checklistItemId: itemId },
    });

    for (const att of attachments) {
      await deleteFile(att.storedName);
    }

    await prisma.checklistItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
