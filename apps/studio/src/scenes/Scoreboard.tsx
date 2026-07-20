import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TIMING_SECONDS, specBattleSeconds, secondsToFrames } from "../timing";
import type { SfxCue } from "../audio/types";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

/** Spans the spec-battle + winner-reveal window as a persistent corner overlay. */
export function getDuration(input: VideoInput): number {
  return secondsToFrames(specBattleSeconds(input.rounds.length) + TIMING_SECONDS.winnerReveal, input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [];
}

export const Scoreboard: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const roundFrames = secondsToFrames(TIMING_SECONDS.specBattleRound, fps);
  const isPortrait = layout.orientation === "portrait";

  const roundsElapsed = Math.min(Math.floor(frame / roundFrames) + 1, input.rounds.length);

  const scores = input.contenders.map((_, contenderIndex) =>
    input.rounds
      .slice(0, roundsElapsed)
      .filter((round) => round.winnerIndex === contenderIndex).length,
  );

  const framesIntoCurrentRound = frame % roundFrames;
  const justScored = framesIntoCurrentRound < fps * 0.4 && frame < roundFrames * input.rounds.length;

  return (
    <div
      style={{
        position: "absolute",
        top: isPortrait ? 32 : 48,
        right: isPortrait ? 32 : 48,
        display: "flex",
        gap: isPortrait ? 12 : 20,
        padding: isPortrait ? "12px 18px" : "18px 28px",
        borderRadius: 18,
        background: `${theme.surface}dd`,
        boxShadow: `0 4px 24px #00000066`,
      }}
    >
      {input.contenders.map((contender, index) => {
        const pop = justScored
          ? spring({ frame: framesIntoCurrentRound, fps, config: { damping: 10, mass: 0.5 } })
          : 1;

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
            <span style={{ fontFamily: theme.fontBody, fontSize: 18, color: theme.textSecondary }}>
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
