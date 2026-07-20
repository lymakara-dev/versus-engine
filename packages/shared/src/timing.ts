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
  winnerReveal: 6,
  outro: 5,
  sceneTransition: 0.6,
};

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
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

export interface SceneBoundariesSec {
  introStartSec: number;
  contenderRevealStartSec: number;
  specBattleStartSec: number;
  winnerRevealStartSec: number;
  outroStartSec: number;
}

/**
 * Absolute start second of each scene on the full composition timeline —
 * mirrors Comparison16x9.tsx's scene order (Intro, ContenderReveal,
 * SpecBattle, WinnerReveal, Outro) and its computeSceneStartFrames, each
 * scene overlapped by one sceneTransition. The single source of truth for
 * everything below that needs to place something on the timeline without
 * duplicating this arithmetic (round retention correlation, narration
 * script anchoring, total duration).
 */
export function computeSceneBoundariesSec(input: Pick<VideoInput, "contenders" | "rounds">): SceneBoundariesSec {
  const durations = [
    TIMING_SECONDS.intro,
    contenderRevealSeconds(input.contenders.length),
    specBattleSeconds(input.rounds.length),
    TIMING_SECONDS.winnerReveal,
    TIMING_SECONDS.outro,
  ];
  const starts: number[] = [0];
  for (let i = 1; i < durations.length; i++) {
    starts.push(starts[i - 1] + durations[i - 1] - TIMING_SECONDS.sceneTransition);
  }
  return {
    introStartSec: starts[0],
    contenderRevealStartSec: starts[1],
    specBattleStartSec: starts[2],
    winnerRevealStartSec: starts[3],
    outroStartSec: starts[4],
  };
}

/** Total composition duration in seconds — mirrors Comparison16x9.tsx's computeTotalDurationInFrames, without needing an fps. */
export function computeTotalDurationSec(input: Pick<VideoInput, "contenders" | "rounds">): number {
  return computeSceneBoundariesSec(input).outroStartSec + TIMING_SECONDS.outro;
}

/**
 * Absolute [startSec, endSec) for each SpecBattle round within the full
 * composition timeline.
 */
export function computeRoundTimeRangesSec(
  input: Pick<VideoInput, "contenders" | "rounds">,
): Array<{ startSec: number; endSec: number }> {
  const { specBattleStartSec } = computeSceneBoundariesSec(input);

  return input.rounds.map((_, index) => {
    const startSec = specBattleStartSec + index * TIMING_SECONDS.specBattleRound;
    return { startSec, endSec: startSec + TIMING_SECONDS.specBattleRound };
  });
}
