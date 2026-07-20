/**
 * Phase 5 analytics feedback loop: turns historical YouTube retention data
 * (RoundRetention rows, populated by `pnpm analytics:sync`) into the
 * `retentionBoosts` map round-selection.ts's `selectRounds` accepts —
 * closing the loop PROJECT_PLAN.md Phase 5 describes as "pull YouTube
 * Analytics to learn which matchups/rounds retain viewers".
 */
import { prisma } from "@versus-engine/db";

const MIN_SAMPLES = 3;
const SENSITIVITY = 2;
const MIN_BOOST = 0.7;
const MAX_BOOST = 1.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Looks up every spec key with enough retention history in this category,
 * and scores it relative to the category's average drop-off: specs that
 * lose fewer viewers than average get a small boost (favored in round
 * selection), specs that lose more get a small penalty. Specs with fewer
 * than MIN_SAMPLES observations are left out entirely — selectRounds treats
 * a missing key as a neutral 1x multiplier.
 */
export async function getRetentionBoosts(categoryId: string): Promise<Record<string, number>> {
  const rows = await prisma.roundRetention.findMany({
    where: { categoryId, specKey: { not: null } },
    select: { specKey: true, dropOff: true },
  });

  const bySpecKey = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.specKey) continue;
    const list = bySpecKey.get(row.specKey) ?? [];
    list.push(row.dropOff);
    bySpecKey.set(row.specKey, list);
  }

  const eligible = [...bySpecKey.entries()].filter(([, dropOffs]) => dropOffs.length >= MIN_SAMPLES);
  if (eligible.length === 0) return {};

  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const categoryAverageDropOff = average(eligible.flatMap(([, dropOffs]) => dropOffs));

  const boosts: Record<string, number> = {};
  for (const [specKey, dropOffs] of eligible) {
    const specAverageDropOff = average(dropOffs);
    boosts[specKey] = clamp(1 + (categoryAverageDropOff - specAverageDropOff) * SENSITIVITY, MIN_BOOST, MAX_BOOST);
  }
  return boosts;
}
