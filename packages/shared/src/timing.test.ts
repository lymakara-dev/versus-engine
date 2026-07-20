import { describe, expect, it } from "vitest";
import {
  TIMING_SECONDS,
  computeRoundTimeRangesSec,
  computeSceneBoundariesSec,
  computeTotalDurationSec,
  contenderRevealSeconds,
} from "./timing.js";

function fakeInput(contenderCount: number, roundCount: number) {
  return {
    contenders: new Array(contenderCount).fill(null),
    rounds: new Array(roundCount).fill(null),
  } as unknown as { contenders: import("./video-input.js").Contender[]; rounds: import("./video-input.js").Round[] };
}

const input = fakeInput(2, 3);

describe("computeSceneBoundariesSec", () => {
  it("starts at 0 and overlaps each scene by one transition", () => {
    const boundaries = computeSceneBoundariesSec(input);
    expect(boundaries.introStartSec).toBe(0);
    expect(boundaries.contenderRevealStartSec).toBeCloseTo(TIMING_SECONDS.intro - TIMING_SECONDS.sceneTransition);
    expect(boundaries.specBattleStartSec).toBeCloseTo(
      boundaries.contenderRevealStartSec + contenderRevealSeconds(2) - TIMING_SECONDS.sceneTransition,
    );
  });
});

describe("computeRoundTimeRangesSec", () => {
  it("lays out one equal-width range per round starting at specBattleStartSec", () => {
    const { specBattleStartSec } = computeSceneBoundariesSec(input);
    const ranges = computeRoundTimeRangesSec(input);
    expect(ranges).toHaveLength(3);
    expect(ranges[0].startSec).toBeCloseTo(specBattleStartSec);
    expect(ranges[1].startSec).toBeCloseTo(ranges[0].endSec);
    expect(ranges[2].endSec - ranges[2].startSec).toBeCloseTo(TIMING_SECONDS.specBattleRound);
  });
});

describe("computeTotalDurationSec", () => {
  it("equals the outro's start plus its own duration", () => {
    const total = computeTotalDurationSec(input);
    const { outroStartSec } = computeSceneBoundariesSec(input);
    expect(total).toBeCloseTo(outroStartSec + TIMING_SECONDS.outro);
  });

  it("grows with more rounds", () => {
    const fewer = computeTotalDurationSec(fakeInput(2, 1));
    const more = computeTotalDurationSec(fakeInput(2, 4));
    expect(more).toBeGreaterThan(fewer);
  });
});
