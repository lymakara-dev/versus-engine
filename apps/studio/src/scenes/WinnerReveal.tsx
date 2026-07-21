import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Crown } from "../components/Crown";
import { Confetti } from "../components/Confetti";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames, paceSeconds } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

/** Deeper than the default -6dB duck — the drumroll is the video's biggest suspense beat. */
const DRUMROLL_DUCK_DB = -10;

export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(TIMING_SECONDS.winnerReveal, input), input.meta.fps);
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  return [{ frame: 0, src: sfxSrc(input.verdict.sfx ?? "drumroll-confetti"), duckDb: DRUMROLL_DUCK_DB }];
}

export const WinnerReveal: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = layout.orientation === "portrait";
  const nameSize = isPortrait ? 60 : 88;

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

  // Respect tags for non-winning contenders — only rendered when authored data actually
  // supplies a strength; never fabricated by the renderer.
  const respectTags = input.contenders
    .map((contender, index) => ({ contender, index }))
    .filter(({ index }) => index !== input.verdict.winnerIndex && input.contenders[index].bestFor);
  const respectOpacity = interpolate(frame, [fps * 2.6, fps * 3.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          padding: isPortrait ? "0 60px" : "0 160px",
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
              fontSize: nameSize,
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
        {respectTags.length > 0 && (
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              opacity: respectOpacity,
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
            {respectTags.map(({ contender }) => (
              <div
                key={contender.name}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  border: `1.5px solid ${contender.accentColor}`,
                  fontFamily: theme.fontBody,
                  fontSize: 20,
                  color: theme.textSecondary,
                }}
              >
                {contender.name} — Best for: {contender.bestFor}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
