/**
 * Pure math for the Phase 5 analytics feedback loop: turns a YouTube
 * audienceRetention curve (elapsedVideoTimeRatio -> audienceWatchRatio,
 * 0-1 x 0-1) into a per-round retention snapshot, using the same round
 * timing (@versus-engine/shared's computeRoundTimeRangesSec) the studio
 * used to render the video in the first place.
 */

export interface RetentionPoint {
  elapsedVideoTimeRatio: number;
  audienceWatchRatio: number;
}

/** Linearly interpolates audienceWatchRatio at an arbitrary point on the timeline, clamping at the curve's ends. */
export function retentionAtRatio(curve: RetentionPoint[], ratio: number): number {
  if (curve.length === 0) return 0;
  const sorted = [...curve].sort((a, b) => a.elapsedVideoTimeRatio - b.elapsedVideoTimeRatio);

  if (ratio <= sorted[0].elapsedVideoTimeRatio) return sorted[0].audienceWatchRatio;
  const last = sorted[sorted.length - 1];
  if (ratio >= last.elapsedVideoTimeRatio) return last.audienceWatchRatio;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (ratio >= a.elapsedVideoTimeRatio && ratio <= b.elapsedVideoTimeRatio) {
      const span = b.elapsedVideoTimeRatio - a.elapsedVideoTimeRatio;
      const t = span === 0 ? 0 : (ratio - a.elapsedVideoTimeRatio) / span;
      return a.audienceWatchRatio + (b.audienceWatchRatio - a.audienceWatchRatio) * t;
    }
  }
  return last.audienceWatchRatio;
}

export interface RoundRetentionResult {
  roundIndex: number;
  label: string;
  specKey: string | null;
  retentionAtStart: number;
  retentionAtEnd: number;
  dropOff: number;
}

export function computeRoundRetention(
  curve: RetentionPoint[],
  totalDurationSec: number,
  rounds: Array<{ label: string; specKey?: string | null }>,
  roundRanges: Array<{ startSec: number; endSec: number }>,
): RoundRetentionResult[] {
  return rounds.map((round, index) => {
    const range = roundRanges[index];
    const startRatio = totalDurationSec > 0 ? range.startSec / totalDurationSec : 0;
    const endRatio = totalDurationSec > 0 ? range.endSec / totalDurationSec : 0;
    const retentionAtStart = retentionAtRatio(curve, startRatio);
    const retentionAtEnd = retentionAtRatio(curve, endRatio);
    return {
      roundIndex: index,
      label: round.label,
      specKey: round.specKey ?? null,
      retentionAtStart,
      retentionAtEnd,
      dropOff: retentionAtStart - retentionAtEnd,
    };
  });
}
