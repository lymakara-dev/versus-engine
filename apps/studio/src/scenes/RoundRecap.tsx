import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Icon } from "../components/Icon";
import { computeLeaders } from "./ScoreboardHUD";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames, paceSeconds } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

const TILE_STAGGER_SECONDS = 0.35;
const TENSION_HOLD_SECONDS = 0.5;
/** Scores within this many points of each other at recap time count as a "close matchup" tension hold. */
const CLOSE_MATCHUP_MARGIN = 1;

export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(TIMING_SECONDS.roundRecap, input), input.meta.fps);
}

function finalScores(input: VideoInput): number[] {
  return input.contenders.map(
    (_, i) => input.rounds.filter((round) => round.winnerIndex === i).length,
  );
}

function isCloseMatchup(scores: number[]): boolean {
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted.length >= 2 && sorted[0] - sorted[1] <= CLOSE_MATCHUP_MARGIN;
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  if (!isCloseMatchup(finalScores(input))) return [];

  const durationFrames = getDuration(input);
  const holdFrames = secondsToFrames(paceSeconds(TENSION_HOLD_SECONDS, input), input.meta.fps);
  // Silent marker — only ducks the music bed for the tension hold at the tail of the recap, no audio file of its own.
  return [
    {
      frame: durationFrames - holdFrames,
      src: sfxSrc("ding"),
      durationInFrames: holdFrames,
      duckDb: -8,
      silent: true,
    },
  ];
}

export const RoundRecap: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = layout.orientation === "portrait";
  const durationFrames = getDuration(input);

  const scores = finalScores(input);
  const closeMatchup = isCloseMatchup(scores);
  const holdFrames = secondsToFrames(paceSeconds(TENSION_HOLD_SECONDS, input), fps);
  const inTensionHold = closeMatchup && frame > durationFrames - holdFrames;
  const tensionDim = inTensionHold
    ? interpolate(frame, [durationFrames - holdFrames, durationFrames], [1, 0.72], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const staggerFrames = secondsToFrames(paceSeconds(TILE_STAGGER_SECONDS, input), fps);
  const leaders = computeLeaders(input.rounds, input.contenders.length);
  const finalLeader = leaders[leaders.length - 1];

  return (
    <div style={{ position: "absolute", inset: 0, opacity: tensionDim }}>
      <Background theme={theme} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isPortrait ? 28 : 36,
          padding: isPortrait ? "0 48px" : "0 140px",
        }}
      >
        <div
          style={{
            fontFamily: theme.fontBody,
            fontSize: isPortrait ? 20 : 24,
            color: theme.textSecondary,
            letterSpacing: 3,
          }}
        >
          {closeMatchup ? "IT COMES DOWN TO THIS" : "ROUND RECAP"}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: isPortrait ? 10 : 14,
            maxWidth: isPortrait ? 640 : 1200,
          }}
        >
          {input.rounds.map((round, index) => {
            const tileProgress = spring({
              frame: frame - index * staggerFrames,
              fps,
              config: { damping: 16, mass: 0.7 },
            });

            return (
              <div
                key={round.label}
                style={{
                  opacity: tileProgress,
                  transform: `translateY(${(1 - tileProgress) * 24}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isPortrait ? "8px 12px" : "10px 16px",
                  borderRadius: 12,
                  background: `${theme.surface}dd`,
                }}
              >
                <Icon name={round.icon} size={isPortrait ? 16 : 18} color={theme.neutralAccent} />
                <span
                  style={{
                    fontFamily: theme.fontBody,
                    fontSize: isPortrait ? 14 : 16,
                    color: theme.textSecondary,
                  }}
                >
                  {round.label}
                </span>
                <span
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: isPortrait ? 14 : 16,
                    color:
                      round.winnerIndex !== null
                        ? input.contenders[round.winnerIndex].accentColor
                        : theme.textSecondary,
                  }}
                >
                  {round.winnerIndex !== null ? input.contenders[round.winnerIndex].name : "TIE"}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: isPortrait ? 48 : 96, marginTop: 12 }}>
          {input.contenders.map((contender, index) => {
            const countProgress = spring({
              frame: frame - input.rounds.length * staggerFrames,
              fps,
              config: { damping: 18, mass: 0.8 },
            });
            const animatedScore = interpolate(countProgress, [0, 1], [0, scores[index]], {
              easing: Easing.out(Easing.cubic),
            });
            const isLeader = finalLeader === index;

            return (
              <div
                key={contender.name}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: isPortrait ? 48 : 64,
                    color: isLeader ? contender.accentColor : theme.textPrimary,
                    textShadow: isLeader ? `0 0 20px ${contender.accentColor}` : "none",
                  }}
                >
                  {Math.round(animatedScore)}
                </span>
                <span style={{ fontFamily: theme.fontBody, fontSize: isPortrait ? 18 : 22, color: theme.textSecondary }}>
                  {contender.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
