/**
 * BullMQ consumer for the render queue. Renders a Comparison's frozen
 * videoJson (CLAUDE.md "Frozen payloads") through @remotion/renderer to
 * output/, keyed by RenderJob id so retries are safe (CLAUDE.md "Idempotent
 * jobs" — re-running a job just overwrites the same output file).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { getRenderProgress, renderMediaOnLambda, renderStillOnLambda } from "@remotion/lambda/client";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { prisma, JobStatus } from "@versus-engine/db";
import {
  RENDER_QUEUE_NAME,
  renderJobPayloadSchema,
  publishJobPayloadSchema,
  type RenderJobPayload,
} from "@versus-engine/shared";
import { getPublishQueue } from "../lib/publish-queue-client.js";
import { getLambdaRenderConfig, isLambdaRenderTarget } from "../lib/lambda-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const studioDir = path.resolve(repoRoot, "apps/studio");
const studioEntryPoint = path.resolve(studioDir, "src/index.ts");
const outputDir = path.resolve(repoRoot, "output");

const PROGRESS_UPDATE_INTERVAL_MS = 2000;
const LAMBDA_POLL_INTERVAL_MS = 3000;
// A/B thumbnail testing (PROJECT_PLAN.md Phase 5) — render every variant so
// Upload.thumbnailVariant can pick between them at publish time.
const THUMBNAIL_COMPOSITION_IDS = ["Thumbnail16x9", "Thumbnail16x9B"] as const;

interface RenderResult {
  outputUrl: string;
  thumbnailUrls: string[];
}

let bundleLocationPromise: Promise<string> | null = null;
function getBundleLocation(): Promise<string> {
  bundleLocationPromise ??= bundle({
    entryPoint: studioEntryPoint,
    // apps/studio/public/assets is a symlink to the repo-root assets/ folder
    // (see apps/studio/remotion.config.ts) — mirrors the CLI's default.
    publicDir: path.resolve(studioDir, "public"),
    // The schema re-exports from @versus-engine/shared, whose relative
    // imports use TS's ESM ".js"-suffixed convention (resolves to ".ts"
    // under tsc/tsx/vitest) — webpack needs to be told to try that too.
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          ...config.resolve?.extensionAlias,
          ".js": [".ts", ".tsx", ".js"],
        },
      },
    }),
  });
  return bundleLocationPromise;
}

async function renderLocally(
  renderJobId: string,
  comparisonSlug: string,
  composition: string,
  inputProps: Record<string, unknown>,
): Promise<RenderResult> {
  const serveUrl = await getBundleLocation();
  const compositionDef = await selectComposition({ serveUrl, id: composition, inputProps });

  await mkdir(outputDir, { recursive: true });
  const outputLocation = path.join(outputDir, `${comparisonSlug}.mp4`);

  let lastProgressUpdate = 0;
  await renderMedia({
    composition: compositionDef,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    concurrency: 2,
    onProgress: ({ progress }) => {
      const now = Date.now();
      if (now - lastProgressUpdate < PROGRESS_UPDATE_INTERVAL_MS) return;
      lastProgressUpdate = now;
      prisma.renderJob.update({ where: { id: renderJobId }, data: { progress } }).catch(() => {});
    },
  });

  const thumbnailUrls: string[] = [];
  for (const [variantIndex, thumbnailCompositionId] of THUMBNAIL_COMPOSITION_IDS.entries()) {
    const thumbnailComposition = await selectComposition({
      serveUrl,
      id: thumbnailCompositionId,
      inputProps,
    });
    const variantLetter = String.fromCharCode(65 + variantIndex); // 0 -> "A", 1 -> "B"
    const thumbnailPath = path.join(outputDir, `${comparisonSlug}-thumb-${variantLetter}.jpeg`);
    await renderStill({
      composition: thumbnailComposition,
      serveUrl,
      output: thumbnailPath,
      inputProps,
    });
    thumbnailUrls.push(thumbnailPath);
  }

  return { outputUrl: outputLocation, thumbnailUrls };
}

/**
 * Remotion Lambda path (PROJECT_PLAN.md Phase 5 "Scale & polish"), used when
 * RENDER_TARGET=lambda. Requires `pnpm lambda:deploy-function` and
 * `pnpm lambda:deploy-site` to have already run — this only invokes the
 * already-deployed function/site, it never deploys them itself.
 */
async function renderOnLambda(
  renderJobId: string,
  composition: string,
  inputProps: Record<string, unknown>,
): Promise<RenderResult> {
  const { region, functionName, serveUrl } = getLambdaRenderConfig();

  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    composition,
    serveUrl,
    codec: "h264",
    inputProps,
    // Publicly readable so the publish worker can fetch it back over HTTP
    // (readableFor() in publish-worker.ts) to stream to the YouTube API.
    privacy: "public",
  });

  let outputUrl: string | null = null;
  while (!outputUrl) {
    await new Promise((resolve) => setTimeout(resolve, LAMBDA_POLL_INTERVAL_MS));
    const progress = await getRenderProgress({ renderId, bucketName, functionName, region });
    if (progress.fatalErrorEncountered) {
      throw new Error(
        `Lambda render ${renderId} failed: ${progress.errors.map((e) => e.message).join("; ") || "unknown error"}`,
      );
    }
    await prisma.renderJob.update({ where: { id: renderJobId }, data: { progress: progress.overallProgress } });
    if (progress.done) {
      if (!progress.outputFile) {
        throw new Error(`Lambda render ${renderId} finished but returned no outputFile`);
      }
      outputUrl = progress.outputFile;
    }
  }

  const thumbnailUrls: string[] = [];
  for (const thumbnailCompositionId of THUMBNAIL_COMPOSITION_IDS) {
    const result = await renderStillOnLambda({
      region,
      functionName,
      serveUrl,
      composition: thumbnailCompositionId,
      inputProps,
      imageFormat: "jpeg",
      privacy: "public",
    });
    thumbnailUrls.push(result.url);
  }

  return { outputUrl, thumbnailUrls };
}

async function processRenderJob(payload: RenderJobPayload): Promise<void> {
  const { renderJobId, comparisonId, composition } = payload;

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { status: JobStatus.RUNNING, startedAt: new Date() },
  });

  const comparison = await prisma.comparison.findUniqueOrThrow({ where: { id: comparisonId } });
  if (!comparison.videoJson) {
    throw new Error(`Comparison ${comparisonId} has no frozen videoJson — build it before queueing a render`);
  }
  const inputProps = comparison.videoJson as Record<string, unknown>;

  const result = isLambdaRenderTarget()
    ? await renderOnLambda(renderJobId, composition, inputProps)
    : await renderLocally(renderJobId, comparison.slug, composition, inputProps);

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: {
      status: JobStatus.DONE,
      progress: 1,
      outputUrl: result.outputUrl,
      thumbnailUrls: result.thumbnailUrls,
      finishedAt: new Date(),
    },
  });

  await enqueuePendingPublish(comparisonId);
}

/**
 * Batch/scheduled comparisons (`pnpm batch --schedule ...`) get a QUEUED
 * Upload row up front, before the render exists. Once the render lands,
 * kick off the publish job here — delayed until `scheduledAt` so YouTube
 * upload timing matches the requested cadence (BullMQ delayed jobs, per
 * CLAUDE.md's Redis + BullMQ stack decision).
 */
async function enqueuePendingPublish(comparisonId: string): Promise<void> {
  const upload = await prisma.upload.findFirst({
    where: { comparisonId, status: JobStatus.QUEUED, videoId: null },
    orderBy: { createdAt: "asc" },
  });
  if (!upload) return;

  const delay = upload.scheduledAt ? Math.max(0, upload.scheduledAt.getTime() - Date.now()) : 0;
  const payload = publishJobPayloadSchema.parse({ uploadId: upload.id, comparisonId });
  await getPublishQueue().add("publish", payload, { jobId: upload.id, delay });
}

export function startRenderWorker(): Worker<RenderJobPayload> {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<RenderJobPayload>(
    RENDER_QUEUE_NAME,
    async (job: Job<RenderJobPayload>) => {
      const payload = renderJobPayloadSchema.parse(job.data);
      try {
        await processRenderJob(payload);
      } catch (error) {
        await prisma.renderJob.update({
          where: { id: payload.renderJobId },
          data: {
            status: JobStatus.FAILED,
            error: error instanceof Error ? error.message : String(error),
            finishedAt: new Date(),
          },
        });
        throw error;
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job) => console.log(`[render-worker] done: ${job.id}`));
  worker.on("failed", (job, error) => console.error(`[render-worker] failed: ${job?.id}`, error));

  return worker;
}
