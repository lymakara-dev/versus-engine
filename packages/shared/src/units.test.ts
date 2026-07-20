import { describe, expect, it } from "vitest";
import { ftLbToNm, lbToKg, mphToKmh, round } from "./units.js";

describe("unit conversions", () => {
  it("converts lb to kg", () => {
    expect(round(lbToKg(3252), 0)).toBe(1475);
  });

  it("converts mph to km/h", () => {
    expect(round(mphToKmh(60), 1)).toBe(96.6);
  });

  it("converts ft-lb to Nm", () => {
    expect(round(ftLbToNm(295), 0)).toBe(400);
  });
});
