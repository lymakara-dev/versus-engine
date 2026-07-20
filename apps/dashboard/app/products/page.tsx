import Link from "next/link";
import { prisma } from "@versus-engine/db";
import { approveProduct } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-500/20 text-amber-300",
  VERIFIED: "bg-emerald-500/20 text-emerald-300",
  ARCHIVED: "bg-white/10 text-white/50",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categorySlug } = await searchParams;

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const products = await prisma.product.findMany({
    where: categorySlug ? { category: { slug: categorySlug } } : undefined,
    include: { brand: true, category: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-white/60 mt-1">Only VERIFIED products are eligible for a comparison render.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link
          href="/products"
          className={`rounded-full px-3 py-1 text-sm ${!categorySlug ? "bg-white/20" : "bg-white/5 hover:bg-white/10"}`}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className={`rounded-full px-3 py-1 text-sm ${
              categorySlug === category.slug ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/50 border-b border-white/10">
            <th className="py-2 font-normal">Name</th>
            <th className="py-2 font-normal">Category</th>
            <th className="py-2 font-normal">Price</th>
            <th className="py-2 font-normal">Status</th>
            <th className="py-2 font-normal">Source</th>
            <th className="py-2 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-white/5">
              <td className="py-2">
                {product.brand.name} {product.name}
                {product.variant ? ` ${product.variant}` : ""}
              </td>
              <td className="py-2 text-white/70">{product.category.name}</td>
              <td className="py-2 text-white/70">{product.priceUsd ? `$${product.priceUsd}` : "—"}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[product.status]}`}>
                  {product.status}
                </span>
              </td>
              <td className="py-2 text-white/50">{product.source ?? "—"}</td>
              <td className="py-2">
                {product.status === "DRAFT" && (
                  <form
                    action={async () => {
                      "use server";
                      await approveProduct(product.id);
                    }}
                  >
                    <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1 text-xs hover:bg-emerald-500">
                      Approve
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {products.length === 0 && <p className="text-white/50">No products in this category yet.</p>}
    </div>
  );
}
