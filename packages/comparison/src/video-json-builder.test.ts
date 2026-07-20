import { describe, expect, it } from "vitest";
import { buildVideoInput, type ContenderInput } from "./video-json-builder.js";
import type { RoundCandidate } from "./round-selection.js";

const contenders: ContenderInput[] = [
  {
    name: "GR Corolla",
    brand: "Toyota",
    price: "$39,995",
    imageUrl: "assets/products/toyota-gr-corolla-2026-cutout.png",
    logoUrl: "assets/brands/toyota.png",
    accentColor: "#EB0A1E",
  },
  {
    name: "Civic Type R",
    brand: "Honda",
    price: "$45,895",
    imageUrl: "assets/products/honda-civic-type-r-2026-cutout.png",
    logoUrl: "assets/brands/honda.png",
    accentColor: "#CC0000",
  },
];

function numberRound(overrides: Partial<RoundCandidate> & { key: string; nums: number[] }): RoundCandidate {
  return {
    key: overrides.key,
    label: overrides.label ?? overrides.key,
    icon: overrides.icon ?? "zap",
    unit: overrides.unit ?? "hp",
    dataType: "NUMBER",
    visualization: overrides.visualization ?? "BAR",
    higherIsBetter: overrides.higherIsBetter ?? true,
    priorityWeight: overrides.priorityWeight ?? 1,
    displayFormat: overrides.displayFormat ?? null,
    values: overrides.nums.map((n) => ({ numberValue: n, textValue: null, boolValue: null, displayValue: `${n}` })),
  };
}

const selectedRounds: RoundCandidate[] = [
  numberRound({ key: "horsepower", label: "Horsepower", nums: [300, 315], higherIsBetter: true }),
  numberRound({ key: "0_100", label: "0–100 km/h", nums: [4.9, 5.3], higherIsBetter: false, unit: "s" }),
  numberRound({ key: "price", label: "Price", nums: [39995, 45895], higherIsBetter: false, unit: "USD" }),
];

describe("buildVideoInput", () => {
  it("produces a schema-valid VideoInput", () => {
    const result = buildVideoInput({
      title: "GR Corolla vs Civic Type R",
      category: "cars",
      theme: "speed",
      music: { src: "assets/music/drive-loop-128bpm.mp3", loop: true, volumeDb: -14 },
      contenders,
      selectedRounds,
      tagline: "The Civic Type R takes it.",
    });

    expect(result.meta.resolution).toEqual({ width: 1920, height: 1080 });
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[0].winnerIndex).toBe(1); // more horsepower
    expect(result.rounds[1].winnerIndex).toBe(0); // faster 0-100
  });

  it("computes the overall verdict from round winners", () => {
    const result = buildVideoInput({
      title: "GR Corolla vs Civic Type R",
      category: "cars",
      theme: "speed",
      music: { src: "assets/music/drive-loop-128bpm.mp3", loop: true, volumeDb: -14 },
      contenders,
      selectedRounds,
      tagline: "Close one.",
    });

    // horsepower -> 1, 0-100 -> 0, price (39995 cheaper) -> 0
    expect(result.verdict.scores).toEqual([2, 1]);
    expect(result.verdict.winnerIndex).toBe(0);
  });

  it("uses 9:16 resolution for the Shorts aspect", () => {
    const result = buildVideoInput({
      title: "GR Corolla vs Civic Type R",
      category: "cars",
      theme: "speed",
      aspect: "9:16",
      music: { src: "assets/music/drive-loop-128bpm.mp3", loop: true, volumeDb: -14 },
      contenders,
      selectedRounds,
      tagline: "Close one.",
    });

    expect(result.meta.resolution).toEqual({ width: 1080, height: 1920 });
  });
});
