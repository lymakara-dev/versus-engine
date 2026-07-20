import type { SpecDataType, SpecVisualization } from "@versus-engine/db";

/** One contender's typed value for a candidate spec, mirroring SpecValue's columns. */
export interface CandidateValue {
  numberValue: number | null;
  textValue: string | null;
  boolValue: boolean | null;
  displayValue: string;
}

/**
 * One SpecDefinition plus every contender's value for it — the unit the
 * round-selection heuristic (CLAUDE.md "Round selection heuristic") scores
 * and picks from. `values` is parallel to the comparison's contender order.
 */
export interface RoundCandidate {
  key: string;
  label: string;
  icon: string | null;
  unit: string | null;
  dataType: SpecDataType;
  visualization: SpecVisualization;
  higherIsBetter: boolean;
  priorityWeight: number;
  displayFormat: string | null;
  values: CandidateValue[];
}

const PRICE_KEY = "price";
const MIN_ROUNDS = 6;
const MAX_ROUNDS = 8;

function numericEncoding(candidate: RoundCandidate): number[] | null {
  if (candidate.dataType === "NUMBER") {
    const numbers = candidate.values.map((v) => v.numberValue);
    return numbers.every((n): n is number => n !== null) ? numbers : null;
  }
  if (candidate.dataType === "BOOLEAN") {
    const bools = candidate.values.map((v) => v.boolValue);
    return bools.every((b): b is boolean => b !== null) ? bools.map((b) => (b ? 1 : 0)) : null;
  }
  return null;
}

/**
 * Relative spread between contenders, in [0, +inf). 0 means no
 * differentiation (skip the round — a bar race with identical values is
 * pointless). Free text (drivetrain, chipset name, ...) can't be ranked
 * numerically, so it's scored as a binary "differs at all" signal.
 */
export function normalizedDifference(candidate: RoundCandidate): number {
  const numbers = numericEncoding(candidate);
  if (numbers) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const mean = (min + max) / 2;
    if (mean === 0) return max - min === 0 ? 0 : 1;
    return (max - min) / Math.abs(mean);
  }

  const distinctValues = new Set(candidate.values.map((v) => v.textValue));
  return distinctValues.size > 1 ? 1 : 0;
}

/**
 * `retentionBoosts` (Phase 5 analytics feedback loop) is an optional
 * specKey -> multiplier map, aggregated from historical YouTube retention
 * data (packages/comparison/src/retention-boost.ts). Missing keys — no data
 * yet, or a spec that's never been analyzed — default to 1 (no-op), so this
 * is purely an additive nudge on top of CLAUDE.md's
 * priorityWeight × normalizedDifference heuristic, never a replacement for it.
 */
export function scoreCandidate(candidate: RoundCandidate, retentionBoosts: Record<string, number> = {}): number {
  const boost = retentionBoosts[candidate.key] ?? 1;
  return candidate.priorityWeight * normalizedDifference(candidate) * boost;
}

/**
 * Index of the contender that wins this round, or null on a tie. Free text
 * (TEXT dataType) has no generic ranking — a "AWD beats FWD" judgment call
 * requires domain knowledge no SpecDefinition encodes, so text rounds are
 * always a tie for automated scoring purposes.
 */
export function computeRoundWinner(candidate: RoundCandidate): number | null {
  const numbers = numericEncoding(candidate);
  if (!numbers) return null;

  const best = candidate.higherIsBetter ? Math.max(...numbers) : Math.min(...numbers);
  const winners = numbers.reduce<number[]>((acc, value, index) => {
    if (value === best) acc.push(index);
    return acc;
  }, []);

  return winners.length === 1 ? winners[0] : null;
}

export interface SelectRoundsOptions {
  min?: number;
  max?: number;
  /** specKey -> score multiplier, from historical retention (Phase 5). Defaults to no-op. */
  retentionBoosts?: Record<string, number>;
}

/**
 * Implements CLAUDE.md's round selection heuristic: score each candidate by
 * priorityWeight × normalizedDifference, take the top 6–8, always include
 * price, cap at one badge round, and guarantee at least one round won by
 * each contender when the data allows. Input order is preserved for the
 * output (except price, which is moved to the end as the closing round).
 */
export function selectRounds(candidates: RoundCandidate[], options: SelectRoundsOptions = {}): RoundCandidate[] {
  const min = options.min ?? MIN_ROUNDS;
  const max = options.max ?? MAX_ROUNDS;
  const retentionBoosts = options.retentionBoosts ?? {};

  const priceCandidate = candidates.find((c) => c.key === PRICE_KEY) ?? null;
  const isBadge = (c: RoundCandidate) => c.visualization === "BADGE";

  const scored = candidates
    .filter((c) => c !== priceCandidate)
    .map((c) => ({ candidate: c, score: scoreCandidate(c, retentionBoosts) }))
    .sort((a, b) => b.score - a.score);

  const selected: RoundCandidate[] = [];
  if (priceCandidate) selected.push(priceCandidate);

  let badgeCount = selected.filter(isBadge).length;

  const positiveScored = scored.filter((s) => s.score > 0);
  for (const { candidate } of positiveScored) {
    if (selected.length >= max) break;
    if (isBadge(candidate) && badgeCount >= 1) continue;
    selected.push(candidate);
    if (isBadge(candidate)) badgeCount++;
  }

  // Backfill with zero-differentiation candidates only if we're still short
  // of the minimum — some content beats too few rounds, but never break the
  // badge cap to get there.
  if (selected.length < min) {
    const remaining = candidates.filter((c) => !selected.includes(c));
    for (const candidate of remaining) {
      if (selected.length >= min) break;
      if (isBadge(candidate) && badgeCount >= 1) continue;
      selected.push(candidate);
      if (isBadge(candidate)) badgeCount++;
    }
  }

  const withGuarantees = guaranteeEachContenderAWin(selected, candidates, badgeCount, retentionBoosts);

  // Preserve input order, with price moved to the end as the closing round.
  const priceKey = priceCandidate?.key;
  return candidates
    .filter((c) => withGuarantees.includes(c))
    .sort((a, b) => (a.key === priceKey ? 1 : b.key === priceKey ? -1 : 0));
}

function guaranteeEachContenderAWin(
  selected: RoundCandidate[],
  allCandidates: RoundCandidate[],
  badgeCount: number,
  retentionBoosts: Record<string, number>,
): RoundCandidate[] {
  if (selected.length === 0) return selected;
  const contenderCount = selected[0].values.length;

  const result = [...selected];
  let currentBadgeCount = badgeCount;

  const winsFor = (list: RoundCandidate[]) => {
    const wins = new Array(contenderCount).fill(0);
    for (const candidate of list) {
      const winner = computeRoundWinner(candidate);
      if (winner !== null) wins[winner]++;
    }
    return wins;
  };

  for (let contenderIndex = 0; contenderIndex < contenderCount; contenderIndex++) {
    const wins = winsFor(result);
    if (wins[contenderIndex] > 0) continue;

    const notSelected = allCandidates.filter((c) => !result.includes(c));
    const candidateWinner = notSelected
      .filter((c) => (!isBadgeCandidate(c) || currentBadgeCount < 1) && computeRoundWinner(c) === contenderIndex)
      .sort((a, b) => scoreCandidate(b, retentionBoosts) - scoreCandidate(a, retentionBoosts))[0];
    if (!candidateWinner) continue; // data doesn't allow it — leave as-is

    // Swap out the lowest-scoring round that isn't price and whose removal
    // doesn't strip another contender's only win.
    const swapOutIndex = findSwapOutIndex(result, contenderCount, retentionBoosts);
    if (swapOutIndex === -1) continue;

    const removed = result[swapOutIndex];
    result.splice(swapOutIndex, 1, candidateWinner);
    if (isBadgeCandidate(removed)) currentBadgeCount--;
    if (isBadgeCandidate(candidateWinner)) currentBadgeCount++;
  }

  return result;
}

function isBadgeCandidate(candidate: RoundCandidate): boolean {
  return candidate.visualization === "BADGE";
}

function findSwapOutIndex(
  selected: RoundCandidate[],
  contenderCount: number,
  retentionBoosts: Record<string, number>,
): number {
  const wins = new Array(contenderCount).fill(0);
  const winnerByRound = selected.map((c) => computeRoundWinner(c));
  for (const winner of winnerByRound) {
    if (winner !== null) wins[winner]++;
  }

  let bestIndex = -1;
  let bestScore = Infinity;
  selected.forEach((candidate, index) => {
    if (candidate.key === PRICE_KEY) return;
    const winner = winnerByRound[index];
    if (winner !== null && wins[winner] <= 1) return; // sole win for that contender — keep it
    const score = scoreCandidate(candidate, retentionBoosts);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
