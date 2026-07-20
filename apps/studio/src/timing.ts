/**
 * All scene durations are authored in seconds here and converted to frames
 * against the actual composition fps — never hardcode frame counts in scenes.
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
