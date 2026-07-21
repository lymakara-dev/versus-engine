import type { VideoInput } from "./video-input.js";

/**
 * Scene durations, authored in seconds (CLAUDE.md Remotion convention: "All
 * timing derives from useVideoConfig().fps — never hardcode frame counts as
 * magic numbers; define scene durations in apps/studio/src/timing.ts in
 * seconds"). Lives here, in shared, rather than only in apps/studio, so the
 * Phase 5 analytics feedback loop (apps/workers) can correlate YouTube
 * retention curves back to individual rounds using the exact same numbers
 * the renderer used — apps/studio/src/timing.ts re-exports this as the
 * renderer's entry point.
 */
export const TIMING_SECONDS = {
  intro: 4,
  contenderRevealBase: 2.5,
  contenderRevealPerContender: 1.75,
  specBattleRound: 4.5,
  roundRecap: 4.5,
  winnerReveal: 6,
  outro: 5,
  sceneTransition: 0.6,
};

/** Shorts (9:16) plays 1.5x faster than the 16:9 cut — the pattern-interrupt cadence that keeps retention on vertical video. */
const PORTRAIT_PACING_FACTOR = 1 / 1.5;

/** Outro is hard-cut on Shorts (not just paced) so the last frame can loop cleanly back into the Intro hook. */
const SHORTS_OUTRO_SECONDS = 2;

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/** Applies the 1.5x Shorts pacing factor to any TIMING_SECONDS-derived duration. Landscape is unchanged. */
export function paceSeconds(seconds: number, input: Pick<VideoInput, "meta">): number {
  return input.meta.aspect === "9:16" ? seconds * PORTRAIT_PACING_FACTOR : seconds;
}

export function contenderRevealSeconds(contenderCount: number): number {
  return (
    TIMING_SECONDS.contenderRevealBase +
    TIMING_SECONDS.contenderRevealPerContender * contenderCount
  );
}

export function specBattleSeconds(roundCount: number): number {
  return TIMING_SECONDS.specBattleRound * roundCount;
}

/** Outro's own duration, honoring the Shorts hard-cut instead of the general pacing factor. */
export function outroSeconds(input: Pick<VideoInput, "meta">): number {
  return input.meta.aspect === "9:16" ? SHORTS_OUTRO_SECONDS : TIMING_SECONDS.outro;
}

export interface SceneBoundariesSec {
  introStartSec: number;
  contenderRevealStartSec: number;
  specBattleStartSec: number;
  roundRecapStartSec: number;
  winnerRevealStartSec: number;
  outroStartSec: number;
}

/**
 * Absolute start second of each scene on the full composition timeline —
 * mirrors Comparison16x9.tsx's scene order (Intro, ContenderReveal,
 * SpecBattle, RoundRecap, WinnerReveal, Outro) and its
 * computeSceneStartFrames, each scene overlapped by one sceneTransition
 * (also paced on Shorts). The single source of truth for everything below
 * that needs to place something on the timeline without duplicating this
 * arithmetic (round retention correlation, narration script anchoring,
 * total duration).
 */
export function computeSceneBoundariesSec(
  input: Pick<VideoInput, "meta" | "contenders" | "rounds">,
): SceneBoundariesSec {
  const durations = [
    paceSeconds(TIMING_SECONDS.intro, input),
    paceSeconds(contenderRevealSeconds(input.contenders.length), input),
    paceSeconds(specBattleSeconds(input.rounds.length), input),
    paceSeconds(TIMING_SECONDS.roundRecap, input),
    paceSeconds(TIMING_SECONDS.winnerReveal, input),
    outroSeconds(input),
  ];
  const transitionSec = paceSeconds(TIMING_SECONDS.sceneTransition, input);
  const starts: number[] = [0];
  for (let i = 1; i < durations.length; i++) {
    starts.push(starts[i - 1] + durations[i - 1] - transitionSec);
  }
  return {
    introStartSec: starts[0],
    contenderRevealStartSec: starts[1],
    specBattleStartSec: starts[2],
    roundRecapStartSec: starts[3],
    winnerRevealStartSec: starts[4],
    outroStartSec: starts[5],
  };
}

/** Total composition duration in seconds — mirrors Comparison16x9.tsx's computeTotalDurationInFrames, without needing an fps. */
export function computeTotalDurationSec(input: Pick<VideoInput, "meta" | "contenders" | "rounds">): number {
  return computeSceneBoundariesSec(input).outroStartSec + outroSeconds(input);
}

/**
 * Absolute [startSec, endSec) for each SpecBattle round within the full
 * composition timeline.
 */
export function computeRoundTimeRangesSec(
  input: Pick<VideoInput, "meta" | "contenders" | "rounds">,
): Array<{ startSec: number; endSec: number }> {
  const { specBattleStartSec } = computeSceneBoundariesSec(input);
  const roundSec = paceSeconds(TIMING_SECONDS.specBattleRound, input);

  return input.rounds.map((_, index) => {
    const startSec = specBattleStartSec + index * roundSec;
    return { startSec, endSec: startSec + roundSec };
  });
}
