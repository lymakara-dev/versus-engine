import { describe, expect, it } from "vitest";
import { pairTopRanked } from "./pair-products.js";

describe("pairTopRanked", () => {
  it("pairs consecutive entries", () => {
    expect(pairTopRanked([1, 2, 3, 4], 4)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("caps to the requested count before pairing", () => {
    expect(pairTopRanked([1, 2, 3, 4, 5, 6], 4)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("drops a trailing odd one out", () => {
    expect(pairTopRanked([1, 2, 3], 3)).toEqual([[1, 2]]);
  });

  it("returns no pairs when fewer than 2 entries are available", () => {
    expect(pairTopRanked([1], 5)).toEqual([]);
    expect(pairTopRanked([], 5)).toEqual([]);
  });
});
