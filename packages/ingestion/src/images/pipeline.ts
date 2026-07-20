/**
 * Product image pipeline: standard-size renditions, background removal, and
 * dominant-color palette extraction (used for Product.accentColor). Runs
 * once per ingested image (PROJECT_PLAN.md §4).
 *
 * Background removal here is a deterministic chroma-distance matte, tuned
 * for studio/press-kit photography on a near-solid background — no model
 * download required, so it's fast and fully unit-testable. For photos with
 * busy backgrounds, swap in an ML-based remover (e.g. @imgly/background-
 * removal-node) behind the same `BackgroundRemover` signature; the rest of
 * the pipeline doesn't care which one ran.
 */
import sharp from "sharp";

export const STANDARD_SIZES = {
  hero: { width: 1600, height: 1600 },
  thumb: { width: 400, height: 400 },
} as const;

export type StandardSizeName = keyof typeof STANDARD_SIZES;

export async function resizeToStandardSizes(
  input: Buffer,
): Promise<Record<StandardSizeName, Buffer>> {
  const entries = await Promise.all(
    (Object.entries(STANDARD_SIZES) as Array<[StandardSizeName, { width: number; height: number }]>).map(
      async ([name, size]) => {
        const buffer = await sharp(input)
          .resize(size.width, size.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        return [name, buffer] as const;
      },
    ),
  );
  return Object.fromEntries(entries) as Record<StandardSizeName, Buffer>;
}

export type BackgroundRemover = (input: Buffer) => Promise<Buffer>;

export interface RemoveBackgroundOptions {
  /** Euclidean RGB distance below which a pixel is considered background. */
  tolerance?: number;
}

/**
 * Samples the four corner pixels as the background color, then makes every
 * pixel within `tolerance` of that color transparent. Works well for product
 * photography shot on a seamless white/solid backdrop.
 */
export const removeBackgroundChroma: BackgroundRemover = async (input, options: RemoveBackgroundOptions = {}) => {
  const tolerance = options.tolerance ?? 32;
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const corners = [
    pixelAt(data, width, channels, 0, 0),
    pixelAt(data, width, channels, width - 1, 0),
    pixelAt(data, width, channels, 0, height - 1),
    pixelAt(data, width, channels, width - 1, height - 1),
  ];
  const bg = averageColor(corners);

  const output = Buffer.from(data);
  for (let i = 0; i < output.length; i += channels) {
    const distance = colorDistance([output[i]!, output[i + 1]!, output[i + 2]!], bg);
    if (distance <= tolerance) {
      output[i + 3] = 0;
    }
  }

  return sharp(output, { raw: { width, height, channels: channels as 1 | 2 | 3 | 4 } }).png().toBuffer();
};

export async function extractPalette(input: Buffer, count = 3): Promise<string[]> {
  const sampleSize = 48;
  const { data, info } = await sharp(input)
    .resize(sampleSize, sampleSize, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  // Quantize to 4 bits per channel so near-identical colors bucket together.
  const quantize = (value: number) => Math.round(value / 16) * 16;

  for (let i = 0; i < data.length; i += channels) {
    const r = quantize(data[i]!);
    const g = quantize(data[i + 1]!);
    const b = quantize(data[i + 2]!);
    const bucketKey = `${r},${g},${b}`;
    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(bucketKey, { count: 1, r, g, b });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((bucket) => rgbToHex(bucket.r, bucket.g, bucket.b));
}

function pixelAt(
  data: Buffer,
  width: number,
  channels: number,
  x: number,
  y: number,
): [number, number, number] {
  const offset = (y * width + x) * channels;
  return [data[offset]!, data[offset + 1]!, data[offset + 2]!];
}

function averageColor(colors: Array<[number, number, number]>): [number, number, number] {
  const sum = colors.reduce(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b] as [number, number, number],
    [0, 0, 0] as [number, number, number],
  );
  return [sum[0] / colors.length, sum[1] / colors.length, sum[2] / colors.length];
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
