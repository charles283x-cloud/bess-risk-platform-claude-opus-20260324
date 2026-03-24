import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateFile, saveFile } from "@/lib/files";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { itemId } = await context.params;

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { attachments: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = validateFile(file.type, file.size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = await saveFile(buffer, file.name, file.type);

    const attachment = await prisma.attachment.create({
      data: {
        checklistItemId: itemId,
        originalName: file.name,
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    // If this is the first attachment, mark item as complete
    if (item.attachments.length === 0) {
      await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          isComplete: true,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
