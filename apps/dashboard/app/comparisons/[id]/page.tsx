import { notFound } from "next/navigation";
import { prisma } from "@versus-engine/db";
import { parseVideoInput } from "@versus-engine/shared";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { RenderStatus } from "@/components/RenderStatus";
import { queueRender, setThumbnailVariant } from "./actions";

export default async function ComparisonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const comparison = await prisma.comparison.findUnique({
    where: { id },
    include: {
      category: true,
      contenders: { include: { product: { include: { brand: true } } }, orderBy: { position: "asc" } },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      uploads: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!comparison) notFound();

  const videoInput = comparison.videoJson ? parseVideoInput(comparison.videoJson) : null;
  const latestRenderJob = comparison.renderJobs[0] ?? null;
  const latestUpload = comparison.uploads[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{comparison.title}</h1>
        <p className="text-white/60 mt-1">
          {comparison.category.name} · {comparison.contenders.map((c) => c.product.name).join(" vs ")}
        </p>
        {comparison.tagline && <p className="text-white/80 mt-2 italic">&ldquo;{comparison.tagline}&rdquo;</p>}
      </div>

      {videoInput ? (
        <PreviewPlayer videoInput={videoInput} />
      ) : (
        <p className="text-white/50">No frozen videoJson on this comparison yet.</p>
      )}

      {comparison.description && <p className="text-white/70 text-sm">{comparison.description}</p>}

      {comparison.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {comparison.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <form
          action={async () => {
            "use server";
            await queueRender(comparison.id);
          }}
        >
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500">
            {latestRenderJob ? "Re-check / queue render" : "Queue render"}
          </button>
        </form>

        {latestRenderJob && (
          <RenderStatus
            renderJobId={latestRenderJob.id}
            initial={{
              status: latestRenderJob.status,
              progress: latestRenderJob.progress,
              outputUrl: latestRenderJob.outputUrl,
              thumbnailUrls: latestRenderJob.thumbnailUrls,
              error: latestRenderJob.error,
            }}
          />
        )}

        {latestRenderJob && latestRenderJob.thumbnailUrls.length > 1 && latestUpload && (
          <div className="rounded-lg border border-white/10 p-4 space-y-2">
            <span className="text-sm font-medium">Thumbnail (A/B test):</span>
            <div className="flex gap-4">
              {latestRenderJob.thumbnailUrls.map((url, index) => (
                <form
                  key={url}
                  action={async () => {
                    "use server";
                    await setThumbnailVariant(comparison.id, latestUpload.id, index);
                  }}
                >
                  <button
                    type="submit"
                    className={`rounded-md px-3 py-1.5 text-sm border ${
                      latestUpload.thumbnailVariant === index
                        ? "border-emerald-500 bg-emerald-600/20"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    Variant {String.fromCharCode(65 + index)}
                    {latestUpload.thumbnailVariant === index ? " (selected)" : ""}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
