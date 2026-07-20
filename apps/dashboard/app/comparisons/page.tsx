import Link from "next/link";
import { prisma } from "@versus-engine/db";

const STATUS_STYLES: Record<string, string> = {
  BUILDING: "bg-white/10 text-white/60",
  READY: "bg-sky-500/20 text-sky-300",
  RENDERED: "bg-emerald-500/20 text-emerald-300",
  PUBLISHED: "bg-purple-500/20 text-purple-300",
};

export default async function ComparisonsPage() {
  const comparisons = await prisma.comparison.findMany({
    include: { category: true, contenders: { include: { product: true }, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Comparisons</h1>
        <Link href="/comparisons/new" className="rounded-md bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500">
          Build a comparison
        </Link>
      </div>

      <div className="space-y-3">
        {comparisons.map((comparison) => (
          <Link
            key={comparison.id}
            href={`/comparisons/${comparison.id}`}
            className="block rounded-lg border border-white/10 p-4 hover:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{comparison.title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[comparison.status]}`}>
                {comparison.status}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-1">
              {comparison.category.name} ·{" "}
              {comparison.contenders.map((c) => c.product.name).join(" vs ")}
            </p>
          </Link>
        ))}
        {comparisons.length === 0 && <p className="text-white/50">No comparisons yet.</p>}
      </div>
    </div>
  );
}
