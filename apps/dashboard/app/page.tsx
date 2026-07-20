import Link from "next/link";
import { prisma, ProductStatus } from "@versus-engine/db";

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true, comparisons: true } } },
    orderBy: { name: "asc" },
  });

  const verifiedCount = await prisma.product.count({ where: { status: ProductStatus.VERIFIED } });
  const draftCount = await prisma.product.count({ where: { status: ProductStatus.DRAFT } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Versus Engine</h1>
        <p className="text-white/60 mt-1">
          {verifiedCount} verified products · {draftCount} awaiting review
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border border-white/10 p-4">
            <h2 className="font-medium">{category.name}</h2>
            <p className="text-sm text-white/60 mt-1">
              {category._count.products} products · {category._count.comparisons} comparisons
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link href="/products" className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Browse products
        </Link>
        <Link href="/comparisons/new" className="rounded-md bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500">
          Build a comparison
        </Link>
      </div>
    </div>
  );
}
