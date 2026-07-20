import { describe, expect, it } from "vitest";
import { parseYears } from "./parse-years.js";

describe("parseYears", () => {
  it("expands an inclusive range", () => {
    expect(parseYears("2024-2026")).toEqual([2024, 2025, 2026]);
  });

  it("parses a comma-separated list", () => {
    expect(parseYears("2024, 2026")).toEqual([2024, 2026]);
  });

  it("parses a single year", () => {
    expect(parseYears("2026")).toEqual([2026]);
  });

  it("rejects a backwards range", () => {
    expect(() => parseYears("2026-2024")).toThrow(/end must be >= start/);
  });

  it("rejects garbage input", () => {
    expect(() => parseYears("abc")).toThrow(/Invalid year/);
  });
});
