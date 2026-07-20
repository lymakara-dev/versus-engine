/**
 * NHTSA vPIC (Vehicle Product Information Catalog) adapter.
 *
 * Source: https://vpic.nhtsa.dot.gov/api/ — a free, public, no-auth-required
 * US government API. Terms: public domain data, no rate limit is published,
 * but we self-limit (see `createRateLimiter`) to be a polite consumer and
 * because batch ingests can span hundreds of make/year combinations.
 *
 * vPIC only gives us the catalog backbone (make, model, model year) — no
 * horsepower/torque/price. Per PROJECT_PLAN.md §4, those get enriched later
 * via CSV import or the AI normalizer, so every product this adapter creates
 * lands as ProductStatus.DRAFT.
 */
import type { NormalizedProduct } from "@versus-engine/shared";
import { createRateLimiter, type FetchLike } from "../http.js";

const VPIC_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";
const DEFAULT_MIN_INTERVAL_MS = 250;

export interface VpicModelResult {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
}

interface VpicModelsResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: VpicModelResult[];
}

export interface FetchVpicModelsOptions {
  fetchImpl?: FetchLike;
  minIntervalMs?: number;
}

/** GetModelsForMakeYear — the one vPIC endpoint that's actually year-scoped. */
export async function fetchModelsForMakeYear(
  make: string,
  year: number,
  options: FetchVpicModelsOptions = {},
): Promise<VpicModelResult[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${VPIC_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`vPIC request failed (${response.status}): ${url}`);
  }
  const body = (await response.json()) as VpicModelsResponse;
  return body.Results ?? [];
}

export function mapVpicResultsToProducts(
  results: VpicModelResult[],
  year: number,
  categorySlug: string,
): NormalizedProduct[] {
  return results.map((result) => ({
    categorySlug,
    brand: titleCase(result.Make_Name),
    name: result.Model_Name,
    variant: null,
    releaseYear: year,
    priceUsd: null,
    status: "DRAFT",
    source: "vpic",
    sourceUrl: `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(result.Make_Name)}/modelyear/${year}?format=json`,
    specs: {
      make: titleCase(result.Make_Name),
      model: result.Model_Name,
      modelYear: year,
      vpicMakeId: result.Make_ID,
      vpicModelId: result.Model_ID,
    },
    normalizedSpecs: [],
  }));
}

export interface IngestVpicOptions extends FetchVpicModelsOptions {
  make: string;
  years: number[];
  categorySlug?: string;
}

/**
 * Ingests every model vPIC reports for `make` across `years`, deduped by
 * (brand, model, year). Safe to re-run: downstream upsert is keyed on the
 * product slug, so repeated ingests just refresh the raw specs blob.
 */
export async function ingestVpicMakeYears(options: IngestVpicOptions): Promise<NormalizedProduct[]> {
  const { make, years, categorySlug = "cars", minIntervalMs = DEFAULT_MIN_INTERVAL_MS, fetchImpl } = options;
  const { throttle } = createRateLimiter(minIntervalMs);

  const products: NormalizedProduct[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    const results = await throttle(() => fetchModelsForMakeYear(make, year, { fetchImpl }));
    for (const product of mapVpicResultsToProducts(results, year, categorySlug)) {
      const dedupeKey = `${product.brand}-${product.name}-${product.releaseYear}`.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      products.push(product);
    }
  }

  return products;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}
