/**
 * The one place packages/ingestion's source-agnostic NormalizedProduct
 * output touches Prisma. Idempotent: everything is upserted on natural keys
 * (category slug, brand slug, product slug, productId+specDefId) so re-
 * running an ingest is always safe (CLAUDE.md "Idempotent jobs").
 */
import { prisma, ProductStatus, type Category } from "@versus-engine/db";
import { slugify, type NormalizedProduct } from "@versus-engine/shared";
import { coerceSpecValue } from "./coerce-spec-value.js";

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

async function upsertCategory(slug: string): Promise<Category> {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name: titleCase(slug) },
  });
}

export async function upsertNormalizedProduct(product: NormalizedProduct) {
  const category = await upsertCategory(product.categorySlug);

  const brand = await prisma.brand.upsert({
    where: { slug: slugify(product.brand) },
    update: { name: product.brand },
    create: { slug: slugify(product.brand), name: product.brand },
  });

  const slug = slugify(`${product.brand}-${product.name}${product.variant ? `-${product.variant}` : ""}`);
  const status = product.status as ProductStatus;

  const dbProduct = await prisma.product.upsert({
    where: { slug },
    update: {
      name: product.name,
      variant: product.variant ?? undefined,
      releaseYear: product.releaseYear ?? undefined,
      priceUsd: product.priceUsd ?? undefined,
      status,
      source: product.source,
      sourceUrl: product.sourceUrl ?? undefined,
      specs: product.specs as unknown as object,
      verifiedAt: status === ProductStatus.VERIFIED ? new Date() : undefined,
    },
    create: {
      categoryId: category.id,
      brandId: brand.id,
      slug,
      name: product.name,
      variant: product.variant ?? undefined,
      releaseYear: product.releaseYear ?? undefined,
      priceUsd: product.priceUsd ?? undefined,
      status,
      source: product.source,
      sourceUrl: product.sourceUrl ?? undefined,
      specs: product.specs as unknown as object,
      verifiedAt: status === ProductStatus.VERIFIED ? new Date() : undefined,
    },
  });

  const specDefs = await prisma.specDefinition.findMany({ where: { categoryId: category.id } });
  const specDefsByKey = new Map(specDefs.map((def) => [def.key, def]));

  // Raw string specs (vPIC, CSV) get coerced against whatever SpecDefinition
  // already exists for this category — unknown keys are left in `specs` but
  // don't produce a SpecValue row until a matching SpecDefinition is seeded.
  for (const [key, rawValue] of Object.entries(product.specs)) {
    if (typeof rawValue !== "string" && typeof rawValue !== "number") continue;
    const specDef = specDefsByKey.get(key);
    if (!specDef) continue;
    const typed = coerceSpecValue(specDef.dataType, String(rawValue));
    if (!typed) continue;
    await prisma.specValue.upsert({
      where: { productId_specDefId: { productId: dbProduct.id, specDefId: specDef.id } },
      update: typed,
      create: { productId: dbProduct.id, specDefId: specDef.id, ...typed },
    });
  }

  // AI-normalized specs are already typed and carry a confidence score.
  for (const spec of product.normalizedSpecs) {
    const specDef = specDefsByKey.get(spec.key);
    if (!specDef) continue;
    const fields = {
      numberValue: spec.numberValue ?? null,
      textValue: spec.textValue ?? null,
      boolValue: spec.boolValue ?? null,
      displayValue: spec.displayValue,
      confidence: spec.confidence,
    };
    await prisma.specValue.upsert({
      where: { productId_specDefId: { productId: dbProduct.id, specDefId: specDef.id } },
      update: fields,
      create: { productId: dbProduct.id, specDefId: specDef.id, ...fields },
    });
  }

  return dbProduct;
}
