import { NextResponse } from "next/server";
import { prisma } from "@versus-engine/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const renderJob = await prisma.renderJob.findUnique({ where: { id } });
  if (!renderJob) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: renderJob.status,
    progress: renderJob.progress,
    outputUrl: renderJob.outputUrl,
    thumbnailUrl: renderJob.thumbnailUrl,
    error: renderJob.error,
  });
}
