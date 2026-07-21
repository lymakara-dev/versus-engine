import { describe, expect, it } from "vitest";
import {
  TIMING_SECONDS,
  computeRoundTimeRangesSec,
  computeSceneBoundariesSec,
  computeTotalDurationSec,
  contenderRevealSeconds,
  outroSeconds,
  paceSeconds,
} from "./timing.js";

function fakeInput(contenderCount: number, roundCount: number, aspect: "16:9" | "9:16" = "16:9") {
  return {
    meta: { aspect },
    contenders: new Array(contenderCount).fill(null),
    rounds: new Array(roundCount).fill(null),
  } as unknown as {
    meta: import("./video-input.js").VideoInput["meta"];
    contenders: import("./video-input.js").Contender[];
    rounds: import("./video-input.js").Round[];
  };
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

  it("places RoundRecap between SpecBattle and WinnerReveal", () => {
    const boundaries = computeSceneBoundariesSec(input);
    const specBattleDurationSec = 3 * TIMING_SECONDS.specBattleRound;
    expect(boundaries.roundRecapStartSec).toBeCloseTo(
      boundaries.specBattleStartSec + specBattleDurationSec - TIMING_SECONDS.sceneTransition,
    );
    expect(boundaries.winnerRevealStartSec).toBeCloseTo(
      boundaries.roundRecapStartSec + TIMING_SECONDS.roundRecap - TIMING_SECONDS.sceneTransition,
    );
  });

  it("paces every scene 1.5x faster on 9:16 Shorts", () => {
    const portrait = computeSceneBoundariesSec(fakeInput(2, 3, "9:16"));
    const landscape = computeSceneBoundariesSec(input);
    expect(portrait.contenderRevealStartSec).toBeLessThan(landscape.contenderRevealStartSec);
    expect(portrait.introStartSec).toBe(0);
  });
});

describe("paceSeconds", () => {
  it("divides by 1.5 on 9:16 and is a no-op on 16:9", () => {
    expect(paceSeconds(6, fakeInput(2, 3, "9:16"))).toBeCloseTo(4);
    expect(paceSeconds(6, input)).toBe(6);
  });
});

describe("outroSeconds", () => {
  it("hard-cuts to 2s on Shorts instead of the usual pacing factor", () => {
    expect(outroSeconds(fakeInput(2, 3, "9:16"))).toBe(2);
    expect(outroSeconds(input)).toBe(TIMING_SECONDS.outro);
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
