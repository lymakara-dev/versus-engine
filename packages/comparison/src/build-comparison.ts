/**
 * The Prisma-backed comparison builder (PROJECT_PLAN.md architecture diagram's
 * "COMPARISON builder" box): loads VERIFIED products, runs round selection +
 * scoring, generates AI metadata, and freezes the result into the VideoInput
 * contract. Persistence is idempotent, keyed by the comparison's slug
 * (CLAUDE.md "Idempotent jobs").
 */
import { prisma, ProductStatus, ComparisonStatus, type Comparison } from "@versus-engine/db";
import { slugify, videoInputSchema, type NarrationClip, type VideoInput } from "@versus-engine/shared";
import { computeRoundWinner, selectRounds, type RoundCandidate } from "./round-selection.js";
import { computeVerdict } from "./scoring.js";
import { buildVideoInput, type ContenderInput } from "./video-json-builder.js";
import { getRetentionBoosts } from "./retention-boost.js";
import {
  fallbackComparisonMetadata,
  generateComparisonMetadata,
  type AnthropicLike,
  type ComparisonMetadata,
  type GenerateMetadataInput,
} from "./metadata.js";

const DEFAULT_MUSIC = { src: "assets/music/drive-loop-128bpm.mp3", loop: true, volumeDb: -14 };
const DEFAULT_ACCENT_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

export interface BuildComparisonOptions {
  productIds: string[];
  aspect?: "16:9" | "9:16";
  client?: AnthropicLike;
  model?: string;
  /**
   * Optional TTS narration (PROJECT_PLAN.md Phase 5). Inversion of control —
   * this package never depends on @versus-engine/narration or any TTS
   * provider directly; the caller supplies a synthesize function built from
   * one (see apps/workers/src/cli/batch.ts's --narration flag).
   */
  narration?: {
    synthesize: (videoInput: VideoInput, slugHint: string) => Promise<NarrationClip[]>;
  };
}

export interface BuiltComparison {
  videoInput: VideoInput;
  metadata: ComparisonMetadata;
  winnerIndex: number | null;
  scores: number[];
  categoryId: string;
  productIds: string[];
}

function formatUsd(value: unknown): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `$${numeric.toLocaleString("en-US")}` : "N/A";
}

function pickImageUrl(images: Array<{ kind: string; url: string }>): string {
  const cutout = images.find((img) => img.kind === "cutout");
  const hero = images.find((img) => img.kind === "hero");
  return cutout?.url ?? hero?.url ?? images[0]?.url ?? "assets/products/placeholder.png";
}

/** Reads VERIFIED products + their SpecValues, picks rounds, scores them, and generates metadata. Does not touch the database. */
export async function buildComparison(options: BuildComparisonOptions): Promise<BuiltComparison> {
  const { productIds } = options;
  if (productIds.length < 2) {
    throw new Error("A comparison needs at least 2 products");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { brand: true, category: true, images: true, specValues: { include: { specDef: true } } },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = productIds.map((id) => {
    const product = byId.get(id);
    if (!product) throw new Error(`Product not found: ${id}`);
    return product;
  });

  const categoryId = ordered[0].categoryId;
  for (const product of ordered) {
    if (product.categoryId !== categoryId) {
      throw new Error("All contenders must belong to the same category");
    }
    if (product.status !== ProductStatus.VERIFIED) {
      throw new Error(`Product "${product.name}" is not VERIFIED and is not render-eligible`);
    }
  }

  const category = ordered[0].category;
  const specDefs = await prisma.specDefinition.findMany({ where: { categoryId }, orderBy: { sortOrder: "asc" } });

  const candidates: RoundCandidate[] = [];
  for (const specDef of specDefs) {
    const values = ordered.map((product) => product.specValues.find((sv) => sv.specDefId === specDef.id));
    if (values.some((v) => !v)) continue; // every contender needs a value for this round to be comparable
    candidates.push({
      key: specDef.key,
      label: specDef.label,
      icon: specDef.icon,
      unit: specDef.unit,
      dataType: specDef.dataType,
      visualization: specDef.visualization,
      higherIsBetter: specDef.higherIsBetter,
      priorityWeight: specDef.priorityWeight,
      displayFormat: specDef.displayFormat,
      values: values.map((v) => ({
        numberValue: v!.numberValue,
        textValue: v!.textValue,
        boolValue: v!.boolValue,
        displayValue: v!.displayValue,
      })),
    });
  }

  const retentionBoosts = await getRetentionBoosts(categoryId);
  const selectedRounds = selectRounds(candidates, { retentionBoosts });
  if (selectedRounds.length === 0) {
    throw new Error("No comparable spec data found for these products — verify SpecValues are seeded for this category");
  }

  const winnerIndexes = selectedRounds.map((candidate) => computeRoundWinner(candidate));
  const verdict = computeVerdict(winnerIndexes, ordered.length);

  const contenderInputs: ContenderInput[] = ordered.map((product, index) => ({
    name: product.variant ? `${product.name} ${product.variant}` : product.name,
    brand: product.brand.name,
    price: product.priceUsd != null ? formatUsd(product.priceUsd) : "N/A",
    imageUrl: pickImageUrl(product.images),
    logoUrl: product.brand.logoUrl ?? "",
    accentColor: product.accentColor ?? DEFAULT_ACCENT_COLORS[index % DEFAULT_ACCENT_COLORS.length],
  }));

  const metadataInput: GenerateMetadataInput = {
    category: category.slug,
    contenders: contenderInputs.map((c) => ({ name: c.name, brand: c.brand, price: c.price })),
    rounds: selectedRounds.map((candidate, index) => ({
      label: candidate.label,
      displayValues: candidate.values.map((v) => v.displayValue),
      winnerIndex: winnerIndexes[index],
    })),
    verdict,
  };

  const metadata = options.client
    ? await generateComparisonMetadata({ input: metadataInput, client: options.client, model: options.model })
    : fallbackComparisonMetadata(metadataInput);

  const builtVideoInput = buildVideoInput({
    title: ordered.map((p) => p.name).join(" vs "),
    category: category.slug,
    theme: category.themeKey,
    aspect: options.aspect,
    music: DEFAULT_MUSIC,
    contenders: contenderInputs,
    selectedRounds,
    tagline: metadata.tagline,
  });

  const videoInput = options.narration
    ? videoInputSchema.parse({
        ...builtVideoInput,
        narration: await options.narration.synthesize(builtVideoInput, slugify(builtVideoInput.meta.title)),
      })
    : builtVideoInput;

  return {
    videoInput,
    metadata,
    winnerIndex: verdict.winnerIndex,
    scores: verdict.scores,
    categoryId,
    productIds: ordered.map((p) => p.id),
  };
}

/** Idempotently upserts the built comparison, freezing videoJson exactly as built (CLAUDE.md "Frozen payloads"). */
export async function saveComparison(built: BuiltComparison): Promise<Comparison> {
  const slug = slugify(built.metadata.title);

  const fields = {
    categoryId: built.categoryId,
    title: built.metadata.title,
    description: built.metadata.description,
    tags: built.metadata.tags,
    tagline: built.metadata.tagline,
    status: ComparisonStatus.READY,
    videoJson: built.videoInput as unknown as object,
    winnerIndex: built.winnerIndex,
    scores: built.scores,
  };

  const comparison = await prisma.comparison.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
  });

  for (let position = 0; position < built.productIds.length; position++) {
    await prisma.comparisonContender.upsert({
      where: { comparisonId_position: { comparisonId: comparison.id, position } },
      update: { productId: built.productIds[position] },
      create: { comparisonId: comparison.id, productId: built.productIds[position], position },
    });
  }

  return comparison;
}

export async function buildAndSaveComparison(
  options: BuildComparisonOptions,
): Promise<{ built: BuiltComparison; comparison: Comparison }> {
  const built = await buildComparison(options);
  const comparison = await saveComparison(built);
  return { built, comparison };
}
