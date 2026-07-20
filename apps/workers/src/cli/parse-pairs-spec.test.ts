import { describe, expect, it } from "vitest";
import { parsePairsSpec } from "./parse-pairs-spec.js";

describe("parsePairsSpec", () => {
  it("parses a top-N strategy", () => {
    expect(parsePairsSpec("top-20")).toEqual({ strategy: "top", count: 20 });
  });

  it("rejects counts below 2", () => {
    expect(() => parsePairsSpec("top-1")).toThrow(/at least 2/);
  });

  it("rejects an unknown strategy", () => {
    expect(() => parsePairsSpec("random-20")).toThrow(/Invalid --pairs/);
  });

  it("rejects garbage input", () => {
    expect(() => parsePairsSpec("top")).toThrow(/Invalid --pairs/);
  });
});
