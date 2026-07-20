/**
 * Bulk CSV importer. Used for categories without a free official API
 * (phones, laptops — see PROJECT_PLAN.md §4) and for hand-curated batches
 * of any category. Fixed columns: category, brand, name, variant,
 * releaseYear, priceUsd, source, sourceUrl, verified. Every other column
 * "spec_<key>" becomes a raw spec keyed to a SpecDefinition.key.
 */
import { parse } from "csv-parse/sync";
import {
  csvRowSchema,
  isSpecColumn,
  specKeyFromColumn,
  type CsvRow,
  type NormalizedProduct,
} from "@versus-engine/shared";

export interface ParseProductsCsvOptions {
  /** Fallback status for rows that don't set `verified`. */
  defaultStatus?: "DRAFT" | "VERIFIED";
}

export function parseProductsCsv(csvText: string, options: ParseProductsCsvOptions = {}): NormalizedProduct[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((record) => rowToProduct(csvRowSchema.parse(record), options));
}

function rowToProduct(row: CsvRow, options: ParseProductsCsvOptions): NormalizedProduct {
  const specs: Record<string, string> = {};
  for (const [column, value] of Object.entries(row as Record<string, unknown>)) {
    if (!isSpecColumn(column) || typeof value !== "string" || value === "") continue;
    specs[specKeyFromColumn(column)] = value;
  }

  const verifiedRaw = row.verified?.trim().toLowerCase();
  const status: "DRAFT" | "VERIFIED" =
    verifiedRaw === "true" ? "VERIFIED" : verifiedRaw === "false" ? "DRAFT" : (options.defaultStatus ?? "DRAFT");

  return {
    categorySlug: row.category,
    brand: row.brand,
    name: row.name,
    variant: row.variant || null,
    releaseYear: row.releaseYear ? Number(row.releaseYear) : null,
    priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
    status,
    source: row.source || "csv",
    sourceUrl: row.sourceUrl || null,
    specs,
    normalizedSpecs: [],
  };
}
