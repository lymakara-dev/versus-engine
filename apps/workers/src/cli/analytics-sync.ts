#!/usr/bin/env node
/**
 * `pnpm analytics:sync` — Phase 5 analytics feedback loop. Pulls per-video
 * stats + audience retention from the YouTube Analytics API v2 for every
 * published Upload, stores them (VideoAnalytics/RoundRetention), and
 * correlates the retention curve back to individual rounds using the exact
 * scene timing the studio rendered with (@versus-engine/shared's
 * computeRoundTimeRangesSec/computeTotalDurationSec). Safe to re-run —
 * each sync fully replaces that upload's stored analytics (CLAUDE.md
 * "Idempotent jobs").
 */
import { prisma } from "@versus-engine/db";
import { parseVideoInput, computeRoundTimeRangesSec, computeTotalDurationSec } from "@versus-engine/shared";
import { getYoutubeAnalyticsClient } from "../lib/youtube-analytics-client.js";
import { computeRoundRetention, type RetentionPoint } from "../lib/retention-correlation.js";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function findColumnIndex(columnHeaders: Array<{ name?: string | null }>, name: string): number {
  const index = columnHeaders.findIndex((header) => header.name === name);
  if (index === -1) throw new Error(`YouTube Analytics response is missing expected column "${name}"`);
  return index;
}

async function fetchHeadlineStats(
  videoId: string,
  startDate: string,
  endDate: string,
): Promise<{ views: number; avgViewDurationSec: number | null; avgViewPercentage: number | null }> {
  const analytics = getYoutubeAnalyticsClient();
  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,averageViewDuration,averageViewPercentage",
    filters: `video==${videoId}`,
  });

  const row = response.data.rows?.[0];
  const headers = response.data.columnHeaders ?? [];
  if (!row) return { views: 0, avgViewDurationSec: null, avgViewPercentage: null };

  return {
    views: Number(row[findColumnIndex(headers, "views")] ?? 0),
    avgViewDurationSec: Number(row[findColumnIndex(headers, "averageViewDuration")] ?? 0),
    avgViewPercentage: Number(row[findColumnIndex(headers, "averageViewPercentage")] ?? 0),
  };
}

/** Impressions/CTR require the YouTube Studio "impressions" metrics, which aren't available for every channel — best-effort. */
async function fetchImpressionStats(
  videoId: string,
  startDate: string,
  endDate: string,
): Promise<{ impressions: number; impressionsCtr: number | null }> {
  try {
    const analytics = getYoutubeAnalyticsClient();
    const response = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "impressions,impressionsClickThroughRate",
      filters: `video==${videoId}`,
    });
    const row = response.data.rows?.[0];
    const headers = response.data.columnHeaders ?? [];
    if (!row) return { impressions: 0, impressionsCtr: null };
    return {
      impressions: Number(row[findColumnIndex(headers, "impressions")] ?? 0),
      impressionsCtr: Number(row[findColumnIndex(headers, "impressionsClickThroughRate")] ?? 0),
    };
  } catch (error) {
    console.warn(
      `  (impressions unavailable for ${videoId}: ${error instanceof Error ? error.message : error})`,
    );
    return { impressions: 0, impressionsCtr: null };
  }
}

async function fetchRetentionCurve(videoId: string, startDate: string, endDate: string): Promise<RetentionPoint[]> {
  const analytics = getYoutubeAnalyticsClient();
  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    dimensions: "elapsedVideoTimeRatio",
    metrics: "audienceWatchRatio",
    filters: `video==${videoId}`,
  });

  const headers = response.data.columnHeaders ?? [];
  const ratioIndex = findColumnIndex(headers, "elapsedVideoTimeRatio");
  const watchIndex = findColumnIndex(headers, "audienceWatchRatio");

  return (response.data.rows ?? []).map((row) => ({
    elapsedVideoTimeRatio: Number(row[ratioIndex]),
    audienceWatchRatio: Number(row[watchIndex]),
  }));
}

async function syncUpload(upload: {
  id: string;
  videoId: string;
  publishedAt: Date | null;
  comparisonId: string;
}): Promise<void> {
  const comparison = await prisma.comparison.findUniqueOrThrow({ where: { id: upload.comparisonId } });
  if (!comparison.videoJson) {
    console.warn(`  skip ${upload.videoId}: comparison ${comparison.id} has no frozen videoJson`);
    return;
  }
  const videoInput = parseVideoInput(comparison.videoJson);

  const startDate = isoDate(upload.publishedAt ?? comparison.createdAt);
  const endDate = isoDate(new Date());

  const [headline, impressions, retentionCurve] = await Promise.all([
    fetchHeadlineStats(upload.videoId, startDate, endDate),
    fetchImpressionStats(upload.videoId, startDate, endDate),
    fetchRetentionCurve(upload.videoId, startDate, endDate),
  ]);

  const videoAnalytics = await prisma.videoAnalytics.upsert({
    where: { uploadId: upload.id },
    update: {
      views: headline.views,
      impressions: impressions.impressions,
      impressionsCtr: impressions.impressionsCtr,
      avgViewDurationSec: headline.avgViewDurationSec,
      avgViewPercentage: headline.avgViewPercentage,
      retentionCurve: retentionCurve as unknown as object,
      fetchedAt: new Date(),
    },
    create: {
      uploadId: upload.id,
      views: headline.views,
      impressions: impressions.impressions,
      impressionsCtr: impressions.impressionsCtr,
      avgViewDurationSec: headline.avgViewDurationSec,
      avgViewPercentage: headline.avgViewPercentage,
      retentionCurve: retentionCurve as unknown as object,
    },
  });

  const totalDurationSec = computeTotalDurationSec(videoInput);
  const roundRanges = computeRoundTimeRangesSec(videoInput);
  const roundRetention = computeRoundRetention(retentionCurve, totalDurationSec, videoInput.rounds, roundRanges);

  await prisma.$transaction([
    prisma.roundRetention.deleteMany({ where: { videoAnalyticsId: videoAnalytics.id } }),
    prisma.roundRetention.createMany({
      data: roundRetention.map((r) => ({
        videoAnalyticsId: videoAnalytics.id,
        comparisonId: comparison.id,
        categoryId: comparison.categoryId,
        roundIndex: r.roundIndex,
        label: r.label,
        specKey: r.specKey,
        retentionAtStart: r.retentionAtStart,
        retentionAtEnd: r.retentionAtEnd,
        dropOff: r.dropOff,
      })),
    }),
  ]);

  console.log(
    `  ${upload.videoId}: ${headline.views} views, ${roundRetention.length} rounds correlated`,
  );
}

async function main() {
  const uploads = await prisma.upload.findMany({
    where: { videoId: { not: null } },
    select: { id: true, videoId: true, publishedAt: true, comparisonId: true },
  });

  if (uploads.length === 0) {
    console.log("No published uploads to sync yet.");
    return;
  }

  console.log(`Syncing analytics for ${uploads.length} upload(s)...`);
  let succeeded = 0;
  for (const upload of uploads) {
    if (!upload.videoId) continue;
    try {
      await syncUpload({ ...upload, videoId: upload.videoId });
      succeeded++;
    } catch (error) {
      console.error(`  ${upload.videoId} FAILED: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`Analytics sync done: ${succeeded}/${uploads.length} uploads.`);
  if (succeeded === 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
