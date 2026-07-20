import Link from "next/link";
import { prisma, ProductStatus } from "@versus-engine/db";
import { createComparison } from "./actions";

export default async function NewComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categorySlug } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const selectedCategory = categorySlug ?? categories[0]?.slug;
  const products = selectedCategory
    ? await prisma.product.findMany({
        where: { category: { slug: selectedCategory }, status: ProductStatus.VERIFIED },
        include: { brand: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Build a comparison</h1>
        <p className="text-white/60 mt-1">
          Pick 2 or more VERIFIED products from the same category. The round-selection heuristic picks the
          6–8 most interesting spec battles automatically.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/comparisons/new?category=${category.slug}`}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedCategory === category.slug ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {products.length < 2 ? (
        <p className="text-white/50">
          Not enough VERIFIED products in this category yet.{" "}
          <Link href={`/products?category=${selectedCategory}`} className="underline">
            Review drafts
          </Link>
          .
        </p>
      ) : (
        <form action={createComparison} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 p-3 hover:bg-white/5 cursor-pointer"
              >
                <input type="checkbox" name="productIds" value={product.id} className="accent-emerald-500" />
                <span>
                  {product.brand.name} {product.name}
                  {product.variant ? ` ${product.variant}` : ""}
                  {product.priceUsd ? <span className="text-white/50"> · ${product.priceUsd.toString()}</span> : null}
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500">
            Build comparison
          </button>
        </form>
      )}
    </div>
  );
}
