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
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { prisma, JobStatus } from "@versus-engine/db";
import { RENDER_QUEUE_NAME, renderJobPayloadSchema, type RenderJobPayload } from "@versus-engine/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const studioDir = path.resolve(repoRoot, "apps/studio");
const studioEntryPoint = path.resolve(studioDir, "src/index.ts");
const outputDir = path.resolve(repoRoot, "output");

const PROGRESS_UPDATE_INTERVAL_MS = 2000;
const THUMBNAIL_FRAME_FRACTION = 0.8; // land the thumbnail near the winner reveal

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

  const serveUrl = await getBundleLocation();
  const compositionDef = await selectComposition({ serveUrl, id: composition, inputProps });

  await mkdir(outputDir, { recursive: true });
  const outputLocation = path.join(outputDir, `${comparison.slug}.mp4`);
  const thumbnailPath = path.join(outputDir, `${comparison.slug}-thumb.jpeg`);

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

  await renderStill({
    composition: compositionDef,
    serveUrl,
    output: thumbnailPath,
    inputProps,
    frame: Math.floor(compositionDef.durationInFrames * THUMBNAIL_FRAME_FRACTION),
  });

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: {
      status: JobStatus.DONE,
      progress: 1,
      outputUrl: outputLocation,
      thumbnailUrl: thumbnailPath,
      finishedAt: new Date(),
    },
  });
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
