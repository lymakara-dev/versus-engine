import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TIMING_SECONDS, specBattleSeconds, secondsToFrames, paceSeconds } from "../timing";
import { sfxSrc, type SfxCue } from "../audio/types";
import type { Theme } from "../theme";
import type { Round, VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

const LEAD_FLOURISH_SECONDS = 0.5;

/** Persistent overlay pinned to SpecBattle only — RoundRecap becomes the "big" version of the same tally, so the HUD fades out before it begins. */
export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(specBattleSeconds(input.rounds.length), input), input.meta.fps);
}

/** Leader (or null if tied) after each round has been counted, index-parallel to `rounds`. Pure, deterministic — the single source of truth shared by the visual swap flourish and its SFX cue. */
export function computeLeaders(rounds: Round[], contenderCount: number): Array<number | null> {
  const scores = new Array(contenderCount).fill(0);
  const leaders: Array<number | null> = [];

  for (const round of rounds) {
    if (round.winnerIndex !== null) scores[round.winnerIndex] += 1;
    const max = Math.max(...scores);
    const atMax = scores.reduce<number[]>((acc, score, i) => (score === max ? [...acc, i] : acc), []);
    leaders.push(atMax.length === 1 ? atMax[0] : null);
  }

  return leaders;
}

/** Round indices (0-based) where the leader flips to a different contender — the lead-change flourish beats. */
export function computeLeadChangeRoundIndices(rounds: Round[], contenderCount: number): number[] {
  const leaders = computeLeaders(rounds, contenderCount);
  const changed: number[] = [];
  for (let i = 1; i < leaders.length; i++) {
    if (leaders[i] !== null && leaders[i] !== leaders[i - 1]) changed.push(i);
  }
  return changed;
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  const roundFrames = secondsToFrames(paceSeconds(TIMING_SECONDS.specBattleRound, input), input.meta.fps);
  const leadChangeIndices = computeLeadChangeRoundIndices(input.rounds, input.contenders.length);
  // Reuses "whoosh-ding" — distinct from the plain per-round "ding" — so a lead change reads
  // as a bigger beat than a normal round win, without needing a new licensed SFX asset.
  return leadChangeIndices.map((roundIndex) => ({
    frame: roundIndex * roundFrames,
    src: sfxSrc("whoosh-ding"),
  }));
}

export const ScoreboardHUD: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const roundFrames = secondsToFrames(paceSeconds(TIMING_SECONDS.specBattleRound, input), fps);
  const isPortrait = layout.orientation === "portrait";

  const roundsElapsed = Math.min(Math.floor(frame / roundFrames) + 1, input.rounds.length);
  const leaders = computeLeaders(input.rounds, input.contenders.length);
  const currentLeader = roundsElapsed > 0 ? leaders[roundsElapsed - 1] : null;
  const previousLeader = roundsElapsed > 1 ? leaders[roundsElapsed - 2] : null;
  const isTied = currentLeader === null;
  const leadJustChangedThisRound =
    roundsElapsed > 1 && currentLeader !== null && currentLeader !== previousLeader;

  const scores = input.contenders.map((_, contenderIndex) =>
    input.rounds
      .slice(0, roundsElapsed)
      .filter((round) => round.winnerIndex === contenderIndex).length,
  );

  const framesIntoCurrentRound = frame % roundFrames;
  const justScored = framesIntoCurrentRound < fps * 0.4 && frame < roundFrames * input.rounds.length;
  const flourishWindowFrames = secondsToFrames(LEAD_FLOURISH_SECONDS, fps);
  // A brief rise-then-fall pulse confined to the start of the round it fires in — not a sustained state.
  const justChangedLead = leadJustChangedThisRound && framesIntoCurrentRound < flourishWindowFrames;
  const flourishProgress = leadJustChangedThisRound
    ? interpolate(
        framesIntoCurrentRound,
        [0, flourishWindowFrames * 0.4, flourishWindowFrames],
        [0, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  // Fades out over the HUD's final 0.4s so it doesn't overlap RoundRecap's own (bigger) tally.
  const sceneDurationFrames = getDuration(input);
  const fadeOutOpacity =
    frame > sceneDurationFrames - fps * 0.4
      ? Math.max(0, 1 - (frame - (sceneDurationFrames - fps * 0.4)) / (fps * 0.4))
      : 1;

  return (
    <div
      style={{
        position: "absolute",
        top: isPortrait ? 32 : 48,
        left: isPortrait ? "50%" : undefined,
        right: isPortrait ? undefined : 48,
        transform: isPortrait
          ? "translateX(-50%)"
          : justChangedLead
            ? `scale(${1 + flourishProgress * 0.12})`
            : undefined,
        display: "flex",
        gap: isPortrait ? 12 : 20,
        padding: isPortrait ? "12px 18px" : "18px 28px",
        borderRadius: 18,
        background: `${theme.surface}dd`,
        boxShadow: justChangedLead
          ? `0 4px 24px #00000066, 0 0 ${24 * flourishProgress}px ${theme.neutralAccent}`
          : `0 4px 24px #00000066`,
        opacity: fadeOutOpacity,
      }}
    >
      {isTied && roundsElapsed > 1 && (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: theme.fontBody,
            fontSize: 12,
            letterSpacing: 2,
            color: theme.neutralAccent,
          }}
        >
          TIED
        </div>
      )}
      {input.contenders.map((contender, index) => {
        const pop = justScored
          ? spring({ frame: framesIntoCurrentRound, fps, config: { damping: 10, mass: 0.5 } })
          : 1;
        const isLeader = currentLeader === index;

        return (
          <div
            key={contender.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              transform: `scale(${0.9 + 0.15 * pop})`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fontBody,
                fontSize: 18,
                color: isLeader ? theme.textPrimary : theme.textSecondary,
              }}
            >
              {contender.name}
            </span>
            <span
              style={{
                fontFamily: theme.fontDisplay,
                fontSize: 34,
                color: contender.accentColor,
              }}
            >
              {scores[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
