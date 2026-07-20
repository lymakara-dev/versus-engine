"use server";

import { revalidatePath } from "next/cache";
import { prisma, JobStatus, type RenderJob } from "@versus-engine/db";
import { renderJobPayloadSchema, type CompositionId } from "@versus-engine/shared";
import { getRenderQueue } from "@/lib/queue";

// Bump when the studio's rendering behavior changes in a way that should
// invalidate a previously-rendered output for the same comparison
// (CLAUDE.md "renders keyed by comparison id + template version").
const TEMPLATE_VERSION = "phase-3";
const COMPOSITION: CompositionId = "Comparison16x9";

export async function queueRender(comparisonId: string): Promise<RenderJob> {
  const comparison = await prisma.comparison.findUniqueOrThrow({ where: { id: comparisonId } });
  if (!comparison.videoJson) {
    throw new Error("This comparison has no frozen videoJson yet — build it before queueing a render");
  }

  const existing = await prisma.renderJob.findFirst({
    where: {
      comparisonId,
      composition: COMPOSITION,
      templateVer: TEMPLATE_VERSION,
      status: { in: [JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.DONE] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    revalidatePath(`/comparisons/${comparisonId}`);
    return existing;
  }

  const renderJob = await prisma.renderJob.create({
    data: { comparisonId, composition: COMPOSITION, templateVer: TEMPLATE_VERSION, status: JobStatus.QUEUED },
  });

  const payload = renderJobPayloadSchema.parse({
    renderJobId: renderJob.id,
    comparisonId,
    composition: COMPOSITION,
  });
  await getRenderQueue().add("render", payload, { jobId: renderJob.id });

  revalidatePath(`/comparisons/${comparisonId}`);
  return renderJob;
}
