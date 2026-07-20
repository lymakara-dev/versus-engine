import { describe, expect, it } from "vitest";
import { computeRoundRetention, retentionAtRatio } from "./retention-correlation.js";

describe("retentionAtRatio", () => {
  const curve = [
    { elapsedVideoTimeRatio: 0, audienceWatchRatio: 1 },
    { elapsedVideoTimeRatio: 0.5, audienceWatchRatio: 0.6 },
    { elapsedVideoTimeRatio: 1, audienceWatchRatio: 0.2 },
  ];

  it("interpolates linearly between points", () => {
    expect(retentionAtRatio(curve, 0.25)).toBeCloseTo(0.8);
  });

  it("clamps below the first point", () => {
    expect(retentionAtRatio(curve, -0.1)).toBe(1);
  });

  it("clamps above the last point", () => {
    expect(retentionAtRatio(curve, 1.5)).toBe(0.2);
  });

  it("returns 0 for an empty curve", () => {
    expect(retentionAtRatio([], 0.5)).toBe(0);
  });
});

describe("computeRoundRetention", () => {
  it("maps each round's time range to a start/end retention and drop-off", () => {
    const curve = [
      { elapsedVideoTimeRatio: 0, audienceWatchRatio: 1 },
      { elapsedVideoTimeRatio: 1, audienceWatchRatio: 0 },
    ];
    const rounds = [
      { label: "Horsepower", specKey: "horsepower" },
      { label: "Price", specKey: "price" },
    ];
    const roundRanges = [
      { startSec: 0, endSec: 10 },
      { startSec: 10, endSec: 20 },
    ];

    const result = computeRoundRetention(curve, 20, rounds, roundRanges);

    expect(result).toEqual([
      { roundIndex: 0, label: "Horsepower", specKey: "horsepower", retentionAtStart: 1, retentionAtEnd: 0.5, dropOff: 0.5 },
      { roundIndex: 1, label: "Price", specKey: "price", retentionAtStart: 0.5, retentionAtEnd: 0, dropOff: 0.5 },
    ]);
  });

  it("falls back to null specKey when a round has none", () => {
    const curve = [{ elapsedVideoTimeRatio: 0, audienceWatchRatio: 1 }];
    const result = computeRoundRetention(curve, 10, [{ label: "Mystery" }], [{ startSec: 0, endSec: 5 }]);
    expect(result[0].specKey).toBeNull();
  });
});
