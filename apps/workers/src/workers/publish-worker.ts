/**
 * BullMQ consumer for the publish queue. Uploads a Comparison's completed
 * render to YouTube via the Data API v3, honoring `Upload.scheduledAt`
 * (private + publishAt for a future date, public immediately otherwise).
 * Safe to retry (CLAUDE.md "Idempotent jobs") — if the Upload row already
 * has a videoId, the job is a no-op.
 */
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { prisma, JobStatus } from "@versus-engine/db";
import { PUBLISH_QUEUE_NAME, publishJobPayloadSchema, type PublishJobPayload } from "@versus-engine/shared";
import { getYoutubeClient } from "../lib/youtube-client.js";

// YouTube category id 24 = "Entertainment" — a reasonable category-agnostic
// default for a faceless comparison channel spanning cars/phones/laptops/etc.
const YOUTUBE_CATEGORY_ID = "24";

/**
 * RenderJob.outputUrl/thumbnailUrls are a local disk path for local renders
 * but an S3 URL for Lambda renders (Phase 5) — read either uniformly.
 */
async function readableFor(source: string): Promise<Readable> {
  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return createReadStream(source);
  }
  const response = await fetch(source);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
  }
  return Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
}

async function processPublishJob(payload: PublishJobPayload): Promise<void> {
  const { uploadId, comparisonId } = payload;

  const upload = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
  if (upload.videoId) {
    if (upload.status !== JobStatus.DONE) {
      await prisma.upload.update({ where: { id: uploadId }, data: { status: JobStatus.DONE } });
    }
    return;
  }

  await prisma.upload.update({ where: { id: uploadId }, data: { status: JobStatus.RUNNING } });

  const comparison = await prisma.comparison.findUniqueOrThrow({ where: { id: comparisonId } });
  const renderJob = await prisma.renderJob.findFirst({
    where: { comparisonId, status: JobStatus.DONE, outputUrl: { not: null } },
    orderBy: { finishedAt: "desc" },
  });
  if (!renderJob?.outputUrl) {
    throw new Error(`Comparison ${comparisonId} has no completed render to publish`);
  }

  const youtube = getYoutubeClient();
  const scheduledAt = upload.scheduledAt;
  const isFuture = scheduledAt !== null && scheduledAt.getTime() > Date.now();

  const insertResponse = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: comparison.title,
        description: comparison.description ?? undefined,
        tags: comparison.tags,
        categoryId: YOUTUBE_CATEGORY_ID,
      },
      status: {
        privacyStatus: isFuture ? "private" : "public",
        publishAt: isFuture ? scheduledAt.toISOString() : undefined,
        selfDeclaredMadeForKids: false,
      },
    },
    media: { body: await readableFor(renderJob.outputUrl) },
  });

  const videoId = insertResponse.data.id;
  if (!videoId) {
    throw new Error("YouTube upload did not return a video id");
  }

  // A/B thumbnail testing (PROJECT_PLAN.md Phase 5): Upload.thumbnailVariant
  // indexes into the render's thumbnailUrls, falling back to variant A.
  const thumbnailUrl = renderJob.thumbnailUrls[upload.thumbnailVariant] ?? renderJob.thumbnailUrls[0];
  if (thumbnailUrl) {
    await youtube.thumbnails.set({ videoId, media: { body: await readableFor(thumbnailUrl) } });
  }

  await prisma.upload.update({
    where: { id: uploadId },
    data: { videoId, status: JobStatus.DONE, publishedAt: isFuture ? null : new Date() },
  });
}

export function startPublishWorker(): Worker<PublishJobPayload> {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<PublishJobPayload>(
    PUBLISH_QUEUE_NAME,
    async (job: Job<PublishJobPayload>) => {
      const payload = publishJobPayloadSchema.parse(job.data);
      try {
        await processPublishJob(payload);
      } catch (error) {
        await prisma.upload.update({
          where: { id: payload.uploadId },
          data: {
            status: JobStatus.FAILED,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job) => console.log(`[publish-worker] done: ${job.id}`));
  worker.on("failed", (job, error) => console.error(`[publish-worker] failed: ${job?.id}`, error));

  return worker;
}
