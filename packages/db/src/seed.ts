import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prisma, SpecDataType, SpecVisualization, ComparisonStatus, ProductStatus } from "./index.js";

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function keyify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[°–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function parsePriceUsd(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ""));
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

  console.log(`Seeded category "${category.slug}" with ${products.length} products and comparison "${comparison.slug}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
