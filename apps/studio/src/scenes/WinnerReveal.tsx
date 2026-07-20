import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Crown } from "../components/Crown";
import { Confetti } from "../components/Confetti";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(TIMING_SECONDS.winnerReveal, input.meta.fps);
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  return [{ frame: 0, src: sfxSrc(input.verdict.sfx ?? "drumroll-confetti") }];
}

export const WinnerReveal: React.FC<{ input: VideoInput; theme: Theme }> = ({ input, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winner = input.verdict.winnerIndex !== null ? input.contenders[input.verdict.winnerIndex] : null;
  const winnerColor = winner?.accentColor ?? theme.neutralAccent;

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const nameScale = interpolate(frame, [fps * 0.6, fps * 1.2], [0.6, 1], {
    easing: Easing.out(Easing.back(1.6)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const nameOpacity = interpolate(frame, [fps * 0.6, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [fps * 2, fps * 2.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scoreLine = input.verdict.scores
    .map((score, index) => `${input.contenders[index].name} ${score}`)
    .join("  –  ");

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      <Confetti colors={input.contenders.map((c) => c.accentColor).concat(theme.neutralAccent)} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 20,
          padding: "0 160px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
            opacity: titleOpacity,
            fontFamily: theme.fontBody,
            fontSize: 34,
            color: theme.textSecondary,
            letterSpacing: 4,
          }}
        >
          WINNER
        </div>
        {winner && (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Crown color={winnerColor} delayFrames={fps * 0.15} />
          </div>
        )}
        {winner && (
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              opacity: nameOpacity,
              transform: `scale(${nameScale})`,
              fontFamily: theme.fontDisplay,
              fontSize: 88,
              color: winnerColor,
              textShadow: `0 0 40px ${winnerColor}`,
              textAlign: "center",
            }}
          >
            {winner.brand} {winner.name}
          </div>
        )}
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
            fontFamily: theme.fontBody,
            fontSize: 28,
            color: theme.textSecondary,
          }}
        >
          {scoreLine}
        </div>
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            opacity: taglineOpacity,
            fontFamily: theme.fontBody,
            fontSize: 32,
            color: theme.textPrimary,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {input.verdict.tagline}
        </div>
      </div>
    </div>
  );
};
