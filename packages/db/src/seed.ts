import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slugify, keyify, type SpecDefinitionSeed } from "@versus-engine/shared";
import { prisma, SpecDataType, SpecVisualization, ComparisonStatus, ProductStatus, type SpecDefinition } from "./index.js";
import { CAR_SPEC_DEFINITIONS, PHONE_SPEC_DEFINITIONS, LAPTOP_SPEC_DEFINITIONS } from "./seed-data/spec-definitions.js";
import { EXTRA_CAR_PRODUCTS, PHONE_PRODUCTS, LAPTOP_PRODUCTS, type DemoProduct } from "./seed-data/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplePath = path.resolve(__dirname, "../../../examples/comparison-example.json");

interface VideoInputRound {
  label: string;
  icon: string;
  visualization: "bar" | "gauge" | "counter" | "badge";
  unit: string | null;
  higherIsBetter: boolean;
  values: number[];
  displayValues: string[];
  winnerIndex: number | null;
  sfx?: string;
}

interface VideoInput {
  meta: { title: string; category: string; theme: string };
  contenders: Array<{
    name: string;
    brand: string;
    price: string;
    imageUrl: string;
    logoUrl: string;
    accentColor: string;
  }>;
  rounds: VideoInputRound[];
  verdict: { winnerIndex: number; scores: number[]; tagline: string };
}

const VISUALIZATION_MAP: Record<VideoInputRound["visualization"], SpecVisualization> = {
  bar: SpecVisualization.BAR,
  gauge: SpecVisualization.GAUGE,
  counter: SpecVisualization.COUNTER,
  badge: SpecVisualization.BADGE,
};

function parsePriceUsd(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ""));
}

async function upsertCategory(slug: string, name: string, themeKey: string) {
  return prisma.category.upsert({
    where: { slug },
    update: { name, themeKey },
    create: { slug, name, themeKey },
  });
}

async function upsertSpecDefinitions(
  categoryId: string,
  defs: SpecDefinitionSeed[],
): Promise<Map<string, SpecDefinition>> {
  const byKey = new Map<string, SpecDefinition>();
  for (const def of defs) {
    const specDef = await prisma.specDefinition.upsert({
      where: { categoryId_key: { categoryId, key: def.key } },
      update: {
        label: def.label,
        unit: def.unit ?? undefined,
        dataType: def.dataType as SpecDataType,
        higherIsBetter: def.higherIsBetter,
        visualization: def.visualization as SpecVisualization,
        displayFormat: def.displayFormat ?? undefined,
        icon: def.icon ?? undefined,
        priorityWeight: def.priorityWeight,
        sortOrder: def.sortOrder,
      },
      create: {
        categoryId,
        key: def.key,
        label: def.label,
        unit: def.unit ?? undefined,
        dataType: def.dataType as SpecDataType,
        higherIsBetter: def.higherIsBetter,
        visualization: def.visualization as SpecVisualization,
        displayFormat: def.displayFormat ?? undefined,
        icon: def.icon ?? undefined,
        priorityWeight: def.priorityWeight,
        sortOrder: def.sortOrder,
      },
    });
    byKey.set(def.key, specDef);
  }
  return byKey;
}

/**
 * Seeds one hand-authored demo Product + its SpecValues. No ProductImage is
 * created — these catalog rows (unlike the example.json cars) have no
 * licensed image asset yet, so they're render-ineligible until one is added.
 */
async function seedDemoProduct(
  categoryId: string,
  specDefsByKey: Map<string, SpecDefinition>,
  demo: DemoProduct,
) {
  const brand = await prisma.brand.upsert({
    where: { slug: slugify(demo.brand) },
    update: { name: demo.brand },
    create: { slug: slugify(demo.brand), name: demo.brand },
  });

  const productSlug = slugify(`${demo.brand}-${demo.name}${demo.variant ? `-${demo.variant}` : ""}`);
  const specsBlob: Record<string, string> = {};
  for (const [key, spec] of Object.entries(demo.specs)) {
    specsBlob[key] = spec.displayValue;
  }

  const productFields = {
    categoryId,
    brandId: brand.id,
    name: demo.name,
    variant: demo.variant ?? undefined,
    releaseYear: demo.releaseYear,
    priceUsd: demo.priceUsd,
    accentColor: demo.accentColor,
    specs: specsBlob,
    status: ProductStatus.VERIFIED,
    source: "manual",
    verifiedAt: new Date(),
  };

  const product = await prisma.product.upsert({
    where: { slug: productSlug },
    update: productFields,
    create: { slug: productSlug, ...productFields },
  });

  for (const [key, spec] of Object.entries(demo.specs)) {
    const specDef = specDefsByKey.get(key);
    if (!specDef) {
      throw new Error(`Unknown spec key "${key}" for demo product "${productSlug}" — add it to the category's SpecDefinition seed first.`);
    }
    await prisma.specValue.upsert({
      where: { productId_specDefId: { productId: product.id, specDefId: specDef.id } },
      update: {
        numberValue: spec.numberValue ?? null,
        textValue: spec.textValue ?? null,
        boolValue: spec.boolValue ?? null,
        displayValue: spec.displayValue,
      },
      create: {
        productId: product.id,
        specDefId: specDef.id,
        numberValue: spec.numberValue ?? null,
        textValue: spec.textValue ?? null,
        boolValue: spec.boolValue ?? null,
        displayValue: spec.displayValue,
      },
    });
  }

  return product;
}

async function main() {
  const raw = readFileSync(examplePath, "utf-8");
  const videoInput = JSON.parse(raw) as VideoInput;

  const category = await prisma.category.upsert({
    where: { slug: videoInput.meta.category },
    update: { name: "Cars", themeKey: videoInput.meta.theme },
    create: {
      slug: videoInput.meta.category,
      name: "Cars",
      themeKey: videoInput.meta.theme,
    },
  });

  // One SpecDefinition per round, in the order rounds appear in the payload.
  const specDefs = await Promise.all(
    videoInput.rounds.map((round, index) =>
      prisma.specDefinition.upsert({
        where: { categoryId_key: { categoryId: category.id, key: keyify(round.label) } },
        update: {
          label: round.label,
          unit: round.unit ?? undefined,
          dataType: round.visualization === "badge" ? SpecDataType.TEXT : SpecDataType.NUMBER,
          higherIsBetter: round.higherIsBetter,
          visualization: VISUALIZATION_MAP[round.visualization],
          icon: round.icon,
          sortOrder: index,
          priorityWeight: round.label === "Price" ? 1.5 : 1.0,
        },
        create: {
          categoryId: category.id,
          key: keyify(round.label),
          label: round.label,
          unit: round.unit ?? undefined,
          dataType: round.visualization === "badge" ? SpecDataType.TEXT : SpecDataType.NUMBER,
          higherIsBetter: round.higherIsBetter,
          visualization: VISUALIZATION_MAP[round.visualization],
          icon: round.icon,
          sortOrder: index,
          priorityWeight: round.label === "Price" ? 1.5 : 1.0,
        },
      }),
    ),
  );

  const products = await Promise.all(
    videoInput.contenders.map(async (contender) => {
      const brand = await prisma.brand.upsert({
        where: { slug: slugify(contender.brand) },
        update: { name: contender.brand, logoUrl: contender.logoUrl },
        create: {
          slug: slugify(contender.brand),
          name: contender.brand,
          logoUrl: contender.logoUrl,
        },
      });

      const specs: Record<string, string> = {};
      for (const round of videoInput.rounds) {
        specs[keyify(round.label)] = round.displayValues[videoInput.contenders.indexOf(contender)];
      }

      const product = await prisma.product.upsert({
        where: { slug: slugify(`${contender.brand}-${contender.name}`) },
        update: {
          name: contender.name,
          priceUsd: parsePriceUsd(contender.price),
          accentColor: contender.accentColor,
          specs,
          status: ProductStatus.VERIFIED,
          source: "manual",
          verifiedAt: new Date(),
        },
        create: {
          categoryId: category.id,
          brandId: brand.id,
          slug: slugify(`${contender.brand}-${contender.name}`),
          name: contender.name,
          releaseYear: 2026,
          priceUsd: parsePriceUsd(contender.price),
          accentColor: contender.accentColor,
          specs,
          status: ProductStatus.VERIFIED,
          source: "manual",
          verifiedAt: new Date(),
        },
      });

      await prisma.productImage.upsert({
        where: { id: `${product.id}-hero` },
        update: {},
        create: {
          id: `${product.id}-hero`,
          productId: product.id,
          kind: "cutout",
          url: contender.imageUrl,
          license: "press-kit",
        },
      });

      return product;
    }),
  );

  for (let contenderIndex = 0; contenderIndex < products.length; contenderIndex++) {
    const product = products[contenderIndex];
    for (let roundIndex = 0; roundIndex < videoInput.rounds.length; roundIndex++) {
      const round = videoInput.rounds[roundIndex];
      const specDef = specDefs[roundIndex];
      const isNumeric = round.visualization !== "badge";

      await prisma.specValue.upsert({
        where: { productId_specDefId: { productId: product.id, specDefId: specDef.id } },
        update: {
          numberValue: isNumeric ? round.values[contenderIndex] : null,
          textValue: isNumeric ? null : round.displayValues[contenderIndex],
          displayValue: round.displayValues[contenderIndex],
        },
        create: {
          productId: product.id,
          specDefId: specDef.id,
          numberValue: isNumeric ? round.values[contenderIndex] : null,
          textValue: isNumeric ? null : round.displayValues[contenderIndex],
          displayValue: round.displayValues[contenderIndex],
        },
      });
    }
  }

  const comparisonSlug = slugify(videoInput.meta.title);
  const comparison = await prisma.comparison.upsert({
    where: { slug: comparisonSlug },
    update: {
      title: videoInput.meta.title,
      tagline: videoInput.verdict.tagline,
      status: ComparisonStatus.READY,
      videoJson: videoInput as unknown as object,
      winnerIndex: videoInput.verdict.winnerIndex,
      scores: videoInput.verdict.scores,
    },
    create: {
      categoryId: category.id,
      slug: comparisonSlug,
      title: videoInput.meta.title,
      tagline: videoInput.verdict.tagline,
      status: ComparisonStatus.READY,
      videoJson: videoInput as unknown as object,
      winnerIndex: videoInput.verdict.winnerIndex,
      scores: videoInput.verdict.scores,
    },
  });

  for (let position = 0; position < products.length; position++) {
    await prisma.comparisonContender.upsert({
      where: { comparisonId_position: { comparisonId: comparison.id, position } },
      update: { productId: products[position].id },
      create: {
        comparisonId: comparison.id,
        productId: products[position].id,
        position,
      },
    });
  }

  // Full car SpecDefinition catalog (adds "top_speed" on top of the 6 the
  // video payload already produced) + the rest of the 4-car demo roster.
  const carSpecDefs = await upsertSpecDefinitions(category.id, CAR_SPEC_DEFINITIONS);
  for (const demo of EXTRA_CAR_PRODUCTS) {
    await seedDemoProduct(category.id, carSpecDefs, demo);
  }

  const phonesCategory = await upsertCategory("phones", "Phones", "circuit");
  const phoneSpecDefs = await upsertSpecDefinitions(phonesCategory.id, PHONE_SPEC_DEFINITIONS);
  for (const demo of PHONE_PRODUCTS) {
    await seedDemoProduct(phonesCategory.id, phoneSpecDefs, demo);
  }

  const laptopsCategory = await upsertCategory("laptops", "Laptops", "grid");
  const laptopSpecDefs = await upsertSpecDefinitions(laptopsCategory.id, LAPTOP_SPEC_DEFINITIONS);
  for (const demo of LAPTOP_PRODUCTS) {
    await seedDemoProduct(laptopsCategory.id, laptopSpecDefs, demo);
  }

  console.log(
    `Seeded category "${category.slug}" with ${products.length + EXTRA_CAR_PRODUCTS.length} products and comparison "${comparison.slug}".`,
  );
  console.log(`Seeded category "phones" with ${PHONE_PRODUCTS.length} products.`);
  console.log(`Seeded category "laptops" with ${LAPTOP_PRODUCTS.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
