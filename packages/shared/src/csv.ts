import { z } from "zod";

/**
 * Fixed columns every product-import CSV must have. Any other column is
 * treated as a raw spec: "spec_<key>" -> Product.specs[key]. Category-agnostic
 * on purpose — this is the shape packages/ingestion's CSV adapter parses into.
 */
export const csvRowSchema = z
  .object({
    category: z.string().min(1),
    brand: z.string().min(1),
    name: z.string().min(1),
    variant: z.string().optional(),
    releaseYear: z.string().optional(),
    priceUsd: z.string().optional(),
    source: z.string().default("csv"),
    sourceUrl: z.string().optional(),
    verified: z.string().optional(), // "true" | "false"
  })
  .passthrough();
export type CsvRow = z.infer<typeof csvRowSchema>;

export const SPEC_COLUMN_PREFIX = "spec_";

export function isSpecColumn(column: string): boolean {
  return column.startsWith(SPEC_COLUMN_PREFIX);
}

export function specKeyFromColumn(column: string): string {
  return column.slice(SPEC_COLUMN_PREFIX.length);
}
