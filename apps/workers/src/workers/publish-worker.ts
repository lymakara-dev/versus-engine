/**
 * BullMQ consumer for the publish queue. Uploads a Comparison's completed
 * render to YouTube via the Data API v3, honoring `Upload.scheduledAt`
 * (private + publishAt for a future date, public immediately otherwise).
 * Safe to retry (CLAUDE.md "Idempotent jobs") — if the Upload row already
 * has a videoId, the job is a no-op.
 */
import { createReadStream } from "node:fs";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { prisma, JobStatus } from "@versus-engine/db";
import { PUBLISH_QUEUE_NAME, publishJobPayloadSchema, type PublishJobPayload } from "@versus-engine/shared";
import { getYoutubeClient } from "../lib/youtube-client.js";

// YouTube category id 24 = "Entertainment" — a reasonable category-agnostic
// default for a faceless comparison channel spanning cars/phones/laptops/etc.
const YOUTUBE_CATEGORY_ID = "24";

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
    media: { body: createReadStream(renderJob.outputUrl) },
  });

  const videoId = insertResponse.data.id;
  if (!videoId) {
    throw new Error("YouTube upload did not return a video id");
  }

  if (renderJob.thumbnailUrl) {
    await youtube.thumbnails.set({ videoId, media: { body: createReadStream(renderJob.thumbnailUrl) } });
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
