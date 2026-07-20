-- AlterTable
ALTER TABLE "RenderJob" DROP COLUMN "thumbnailUrl",
ADD COLUMN     "thumbnailUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "thumbnailVariant" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VideoAnalytics" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "impressionsCtr" DOUBLE PRECISION,
    "avgViewDurationSec" DOUBLE PRECISION,
    "avgViewPercentage" DOUBLE PRECISION,
    "retentionCurve" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRetention" (
    "id" TEXT NOT NULL,
    "videoAnalyticsId" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "specKey" TEXT,
    "categoryId" TEXT NOT NULL,
    "retentionAtStart" DOUBLE PRECISION NOT NULL,
    "retentionAtEnd" DOUBLE PRECISION NOT NULL,
    "dropOff" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RoundRetention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalytics_uploadId_key" ON "VideoAnalytics"("uploadId");

-- CreateIndex
CREATE INDEX "RoundRetention_categoryId_specKey_idx" ON "RoundRetention"("categoryId", "specKey");

-- AddForeignKey
ALTER TABLE "VideoAnalytics" ADD CONSTRAINT "VideoAnalytics_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRetention" ADD CONSTRAINT "RoundRetention_videoAnalyticsId_fkey" FOREIGN KEY ("videoAnalyticsId") REFERENCES "VideoAnalytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

