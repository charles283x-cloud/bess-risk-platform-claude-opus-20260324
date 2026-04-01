import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getFile, deleteFile } from "@/lib/files";

type RouteContext = { params: Promise<{ id: string }> };

// GET: serve PDF for inline viewing
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await getFile(contract.storedName);

    // Use "inline" so browser displays PDF instead of downloading
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(contract.originalName)}"`,
        "Content-Length": String(contract.sizeBytes),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: remove contract
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await deleteFile(contract.storedName);
    await prisma.contract.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
