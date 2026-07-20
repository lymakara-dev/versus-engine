import { z } from "zod";

/**
 * Output contract for every ingestion adapter (vPIC, CSV, AI normalizer, future
 * scrapers). packages/db upserts this shape into Product/SpecValue — adapters
 * never talk to Prisma directly, so each source stays swappable.
 */

export const specDataTypeSchema = z.enum(["NUMBER", "TEXT", "BOOLEAN"]);
export type SpecDataType = z.infer<typeof specDataTypeSchema>;

export const normalizedSpecValueSchema = z
  .object({
    key: z.string(), // matches SpecDefinition.key for the product's category
    dataType: specDataTypeSchema,
    numberValue: z.number().nullable().optional(),
    textValue: z.string().nullable().optional(),
    boolValue: z.boolean().nullable().optional(),
    displayValue: z.string(),
    confidence: z.number().min(0).max(1).default(1),
  })
  .refine(
    (spec) =>
      (spec.dataType === "NUMBER" && spec.numberValue != null) ||
      (spec.dataType === "TEXT" && spec.textValue != null) ||
      (spec.dataType === "BOOLEAN" && spec.boolValue != null),
    { message: "value field matching dataType must be set" },
  );
export type NormalizedSpecValue = z.infer<typeof normalizedSpecValueSchema>;

export const productStatusSchema = z.enum(["DRAFT", "VERIFIED", "ARCHIVED"]);
export type ProductStatusInput = z.infer<typeof productStatusSchema>;

export const normalizedProductSchema = z.object({
  categorySlug: z.string(),
  brand: z.string(),
  name: z.string(),
  variant: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  priceUsd: z.number().nonnegative().nullable().optional(),
  status: productStatusSchema.default("DRAFT"),
  source: z.string(), // "vpic" | "csv" | "ai-research" | "scraper:<name>"
  sourceUrl: z.string().nullable().optional(),
  specs: z.record(z.string(), z.unknown()).default({}), // raw, untouched blob
  normalizedSpecs: z.array(normalizedSpecValueSchema).default([]),
});
export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;

/** One SpecDefinition, as declared by category seed data. */
export const specDefinitionSeedSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().nullable().optional(),
  dataType: specDataTypeSchema.default("NUMBER"),
  higherIsBetter: z.boolean().default(true),
  visualization: z.enum(["BAR", "GAUGE", "COUNTER", "BADGE"]).default("BAR"),
  displayFormat: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  priorityWeight: z.number().default(1),
  sortOrder: z.number().int().default(0),
});
export type SpecDefinitionSeed = z.infer<typeof specDefinitionSeedSchema>;
