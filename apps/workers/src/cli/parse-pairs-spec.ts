/** Accepts "top-<N>" — take the top N ranked products and pair them consecutively. */
export interface PairsSpec {
  strategy: "top";
  count: number;
}

export function parsePairsSpec(value: string): PairsSpec {
  const match = value.match(/^top-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid --pairs "${value}" — expected a strategy like "top-20"`);
  }
  const count = Number(match[1]);
  if (count < 2) {
    throw new Error(`--pairs count must be at least 2 (need at least one pair), got ${count}`);
  }
  return { strategy: "top", count };
}
