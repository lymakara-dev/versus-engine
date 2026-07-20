#!/usr/bin/env node
/**
 * `pnpm ingest vpic --make Toyota --years 2024-2026 [--category cars]`
 * `pnpm ingest csv <file> [--status draft|verified]`
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ingestVpicMakeYears, parseProductsCsv } from "@versus-engine/ingestion";
import { prisma } from "@versus-engine/db";
import { upsertNormalizedProduct } from "../db/upsert-product.js";
import { parseYears } from "./parse-years.js";

async function runVpic(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      make: { type: "string" },
      years: { type: "string" },
      category: { type: "string", default: "cars" },
    },
  });

  if (!values.make || !values.years) {
    throw new Error("Usage: pnpm ingest vpic --make <make> --years <2024-2026|2024,2025> [--category cars]");
  }

  const products = await ingestVpicMakeYears({
    make: values.make,
    years: parseYears(values.years),
    categorySlug: values.category,
  });

  for (const product of products) {
    await upsertNormalizedProduct(product);
  }

  console.log(`vPIC: ingested ${products.length} ${values.category} products for "${values.make}".`);
}

async function runCsv(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      status: { type: "string" },
    },
  });

  const file = positionals[0];
  if (!file) {
    throw new Error("Usage: pnpm ingest csv <file> [--status draft|verified]");
  }

  const defaultStatus = values.status?.toUpperCase() === "VERIFIED" ? "VERIFIED" : undefined;
  // pnpm --filter runs this script with cwd = apps/workers, so resolve
  // relative paths against the directory the user actually invoked pnpm from.
  const resolvedFile = path.resolve(process.env.INIT_CWD ?? process.cwd(), file);
  const csvText = readFileSync(resolvedFile, "utf-8");
  const products = parseProductsCsv(csvText, { defaultStatus });

  for (const product of products) {
    await upsertNormalizedProduct(product);
  }

  console.log(`CSV: ingested ${products.length} products from "${file}".`);
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);

  switch (subcommand) {
    case "vpic":
      await runVpic(rest);
      break;
    case "csv":
      await runCsv(rest);
      break;
    default:
      console.error("Usage: pnpm ingest <vpic|csv> [options]");
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
