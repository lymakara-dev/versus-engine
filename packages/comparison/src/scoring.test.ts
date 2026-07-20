import { describe, expect, it } from "vitest";
import { computeVerdict } from "./scoring.js";

describe("computeVerdict", () => {
  it("tallies round wins per contender", () => {
    expect(computeVerdict([0, 1, 0, null, 1, 0], 2)).toEqual({ winnerIndex: 0, scores: [3, 2] });
  });

  it("returns a null winnerIndex on an overall tie", () => {
    expect(computeVerdict([0, 1], 2)).toEqual({ winnerIndex: null, scores: [1, 1] });
  });

  it("handles no rounds won by anyone", () => {
    expect(computeVerdict([null, null], 2)).toEqual({ winnerIndex: null, scores: [0, 0] });
  });
});
