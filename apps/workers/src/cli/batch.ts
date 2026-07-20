#!/usr/bin/env node
/**
 * `pnpm batch --category <slug> --pairs top-<N> [--schedule now|hourly|daily|weekly] [--aspect 16:9|9:16]`
 *
 * Builds+renders a batch of comparisons in one category, and (unless
 * --schedule now) stages their publish times so `pnpm worker`'s publish
 * worker rolls them out at a steady cadence (PROJECT_PLAN.md §6 step 6 /
 * §8 Phase 4 batch CLI).
 */
import { parseArgs } from "node:util";
import { prisma, ProductStatus, JobStatus } from "@versus-engine/db";
import { buildAndSaveComparison } from "@versus-engine/comparison";
import { renderJobPayloadSchema, compositionIdSchema, type CompositionId } from "@versus-engine/shared";
import { parsePairsSpec } from "./parse-pairs-spec.js";
import { pairTopRanked } from "./pair-products.js";
import { parseScheduleIntervalMs, scheduledAtFor } from "./parse-schedule.js";
import { getRenderQueue } from "../lib/render-queue-client.js";

// Bump alongside apps/dashboard/app/comparisons/[id]/actions.ts's TEMPLATE_VERSION
// whenever the studio's rendering behavior changes (CLAUDE.md "renders keyed
// by comparison id + template version").
const TEMPLATE_VERSION = "phase-4";

const USAGE =
  "Usage: pnpm batch --category <slug> --pairs top-<N> [--schedule now|hourly|daily|weekly] [--aspect 16:9|9:16]";

async function main() {
  const { values } = parseArgs({
    options: {
      category: { type: "string" },
      pairs: { type: "string" },
      schedule: { type: "string", default: "now" },
      aspect: { type: "string", default: "16:9" },
    },
  });

  if (!values.category || !values.pairs) {
    throw new Error(USAGE);
  }

  const pairsSpec = parsePairsSpec(values.pairs);
  const intervalMs = parseScheduleIntervalMs(values.schedule);
  const aspect = values.aspect === "9:16" ? "9:16" : "16:9";
  const composition: CompositionId = compositionIdSchema.parse(
    aspect === "9:16" ? "ComparisonShort9x16" : "Comparison16x9",
  );

  const category = await prisma.category.findUnique({ where: { slug: values.category } });
  if (!category) {
    throw new Error(`Unknown category "${values.category}"`);
  }

  // "Top" = highest-priced VERIFIED products — a simple, defensible proxy
  // for "flagship matchups" until a richer ranking signal (views, recency)
  // exists.
  const ranked = await prisma.product.findMany({
    where: { categoryId: category.id, status: ProductStatus.VERIFIED, priceUsd: { not: null } },
    orderBy: { priceUsd: "desc" },
  });

  const pairs = pairTopRanked(ranked, pairsSpec.count);
  if (pairs.length === 0) {
    throw new Error(
      `Not enough VERIFIED, priced products in "${values.category}" to build any pairs (found ${ranked.length}).`,
    );
  }

  console.log(
    `Batch: ${pairs.length} comparison(s) in "${values.category}", schedule=${values.schedule}, aspect=${aspect}`,
  );

  let succeeded = 0;
  for (const [index, [a, b]] of pairs.entries()) {
    try {
      const { built, comparison } = await buildAndSaveComparison({ productIds: [a.id, b.id], aspect });

      const renderJob = await prisma.renderJob.create({
        data: { comparisonId: comparison.id, composition, templateVer: TEMPLATE_VERSION, status: JobStatus.QUEUED },
      });
      const payload = renderJobPayloadSchema.parse({
        renderJobId: renderJob.id,
        comparisonId: comparison.id,
        composition,
      });
      await getRenderQueue().add("render", payload, { jobId: renderJob.id });

      const scheduledAt = intervalMs === null ? null : scheduledAtFor(index, intervalMs);
      await prisma.upload.create({
        data: { comparisonId: comparison.id, platform: "youtube", scheduledAt, status: JobStatus.QUEUED },
      });

      succeeded++;
      console.log(
        `  [${index + 1}/${pairs.length}] ${built.videoInput.meta.title} -> render ${renderJob.id}` +
          (scheduledAt ? `, publish scheduled ${scheduledAt.toISOString()}` : ", publish immediately after render"),
      );
    } catch (error) {
      console.error(
        `  [${index + 1}/${pairs.length}] ${a.name} vs ${b.name} FAILED: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`Batch done: ${succeeded}/${pairs.length} comparisons queued.`);
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
