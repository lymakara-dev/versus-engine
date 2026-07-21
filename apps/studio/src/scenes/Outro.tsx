import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Icon } from "../components/Icon";
import { sfxSrc, type SfxCue } from "../audio/types";
import { outroSeconds, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

const DEFAULT_CTA_TEXT = "Disagree? Comment your pick 👇";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(outroSeconds(input), input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

export const Outro: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = layout.orientation === "portrait";

  // Shorts' Outro is hard-cut to 2s (see outroSeconds) — every beat below is compressed to fit.
  const textStart = isPortrait ? 0.15 : 0.3;
  const textEnd = isPortrait ? 0.4 : 0.8;
  const ctaStart = isPortrait ? 0.5 : 1.0;
  const ctaEnd = isPortrait ? 0.75 : 1.5;
  const teaserStart = isPortrait ? 0.9 : 1.6;
  const teaserEnd = isPortrait ? 1.2 : 2.2;

  const bellRing = spring({ frame, fps, config: { damping: 8, mass: 0.5 } });
  const bellRotation = interpolate(bellRing, [0, 1], [-25, 0]);

  const textOpacity = interpolate(frame, [fps * textStart, fps * textEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [fps * ctaStart, fps * ctaEnd], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const teaserOpacity = interpolate(frame, [fps * teaserStart, fps * teaserEnd], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaText = input.engagement?.ctaText ?? DEFAULT_CTA_TEXT;
  // "another ... showdown" avoids verb agreement with an arbitrary category string ("cars", "phones", ...).
  const nextTeaser = input.engagement?.nextTeaser ?? `Next up: another ${input.meta.category} showdown`;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          padding: isPortrait ? "0 60px" : 0,
          // YouTube end-screen safe zone (16:9 only — Shorts has no end-screen elements):
          // content stays inside the left ~62% column, leaving x 68-100% / y 60-100%
          // clear for the real subscribe + suggested-video end-screen overlay.
          ...(isPortrait ? {} : { width: "62%", left: 0, right: "auto" }),
        }}
      >
        <div style={{ transform: `rotate(${bellRotation}deg)` }}>
          <Icon name="bell-ring" size={isPortrait ? 70 : 90} color={theme.neutralAccent} />
        </div>
        <div
          style={{
            opacity: textOpacity,
            fontFamily: theme.fontDisplay,
            fontSize: isPortrait ? 42 : 52,
            color: theme.textPrimary,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          SUBSCRIBE FOR MORE HEAD-TO-HEADS
        </div>
        <div
          style={{
            opacity: ctaOpacity,
            fontFamily: theme.fontBody,
            fontSize: isPortrait ? 22 : 26,
            color: theme.neutralAccent,
            textAlign: "center",
          }}
        >
          {ctaText}
        </div>
        <div
          style={{
            opacity: teaserOpacity,
            fontFamily: theme.fontBody,
            fontSize: isPortrait ? 22 : 26,
            color: theme.textSecondary,
            textAlign: "center",
          }}
        >
          {nextTeaser}
        </div>
      </div>
    </div>
  );
};
