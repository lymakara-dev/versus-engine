import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fetchModelsForMakeYear, ingestVpicMakeYears, mapVpicResultsToProducts } from "./vpic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/vpic-models-toyota-2026.json"), "utf-8"),
);

function fakeFetch(body: unknown, ok = true) {
  return vi.fn(async () =>
    ({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    }) as unknown as Response,
  );
}

describe("fetchModelsForMakeYear", () => {
  it("parses the vPIC results array", async () => {
    const fetchImpl = fakeFetch(fixture);
    const results = await fetchModelsForMakeYear("Toyota", 2026, { fetchImpl });
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ Model_Name: "Corolla" });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/GetModelsForMakeYear/make/Toyota/modelyear/2026"),
    );
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = fakeFetch({}, false);
    await expect(fetchModelsForMakeYear("Toyota", 2026, { fetchImpl })).rejects.toThrow(/500/);
  });
});

describe("mapVpicResultsToProducts", () => {
  it("maps raw results to DRAFT NormalizedProducts", () => {
    const products = mapVpicResultsToProducts(fixture.Results, 2026, "cars");
    expect(products).toHaveLength(3);
    expect(products[0]).toMatchObject({
      categorySlug: "cars",
      brand: "Toyota",
      name: "Corolla",
      releaseYear: 2026,
      status: "DRAFT",
      source: "vpic",
    });
    expect(products[0]!.specs).toMatchObject({ make: "Toyota", model: "Corolla", modelYear: 2026 });
  });
});

describe("ingestVpicMakeYears", () => {
  it("dedupes across overlapping years and rate-limits requests", async () => {
    const fetchImpl = fakeFetch(fixture);
    const start = Date.now();
    const products = await ingestVpicMakeYears({
      make: "Toyota",
      years: [2025, 2026],
      fetchImpl,
      minIntervalMs: 20,
    });
    const elapsed = Date.now() - start;

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(elapsed).toBeGreaterThanOrEqual(20);
    // Same 3 models come back for both years -> 6 distinct (brand, model, year) products.
    expect(products).toHaveLength(6);
    expect(new Set(products.map((p) => p.releaseYear))).toEqual(new Set([2025, 2026]));
  });
});
