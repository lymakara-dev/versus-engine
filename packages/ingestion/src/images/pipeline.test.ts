import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { extractPalette, removeBackgroundChroma, resizeToStandardSizes, STANDARD_SIZES } from "./pipeline.js";

async function solidPng(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

async function readAlphaAt(buffer: Buffer, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return data[offset + 3]!;
}

describe("resizeToStandardSizes", () => {
  it("produces hero and thumb renditions at the configured dimensions", async () => {
    const input = await solidPng(800, 600, { r: 10, g: 200, b: 100 });
    const sizes = await resizeToStandardSizes(input);

    for (const name of Object.keys(STANDARD_SIZES) as Array<keyof typeof STANDARD_SIZES>) {
      const metadata = await sharp(sizes[name]).metadata();
      expect(metadata.width).toBe(STANDARD_SIZES[name].width);
      expect(metadata.height).toBe(STANDARD_SIZES[name].height);
    }
  });
});

describe("removeBackgroundChroma", () => {
  it("makes the near-uniform corner background transparent but keeps the subject opaque", async () => {
    const background = sharp({ create: { width: 40, height: 40, channels: 3, background: { r: 255, g: 255, b: 255 } } });
    const subject = await solidPng(10, 10, { r: 220, g: 20, b: 20 });
    const composed = await background.composite([{ input: subject, left: 15, top: 15 }]).png().toBuffer();

    const result = await removeBackgroundChroma(composed);

    expect(await readAlphaAt(result, 0, 0)).toBe(0);
    expect(await readAlphaAt(result, 39, 39)).toBe(0);
    expect(await readAlphaAt(result, 20, 20)).toBe(255);
  });
});

describe("extractPalette", () => {
  it("returns the dominant colors of a two-tone image", async () => {
    const left = await solidPng(24, 48, { r: 220, g: 20, b: 20 });
    const right = await solidPng(24, 48, { r: 20, g: 20, b: 220 });
    const composed = await sharp({ create: { width: 48, height: 48, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .composite([
        { input: left, left: 0, top: 0 },
        { input: right, left: 24, top: 0 },
      ])
      .png()
      .toBuffer();

    const palette = await extractPalette(composed, 2);

    expect(palette).toHaveLength(2);
    for (const hex of palette) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(palette).toContain("#e01010");
    expect(palette).toContain("#1010e0");
  });
});
