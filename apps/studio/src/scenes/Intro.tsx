import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoSting } from "../components/LogoSting";
import { Background } from "../components/Background";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames, paceSeconds } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(TIMING_SECONDS.intro, input), input.meta.fps);
}

/** Built entirely from existing VideoInput fields — never hardcoded per category (CLAUDE.md prime directive #1). */
export function buildHookQuestion(input: Pick<VideoInput, "meta">, left: string, right?: string): string {
  if (input.meta.hookQuestion) return input.meta.hookQuestion;
  // "which one wins" sidesteps singular/plural agreement with an arbitrary
  // category string ("cars", "phones", "laptops", ...) — safe for any category.
  return right ? `${left} vs ${right} — which one wins?` : `Which ${input.meta.category} wins?`;
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

export const Intro: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isPortrait = layout.orientation === "portrait";
  const titleSize = isPortrait ? 68 : 96;
  const vsSize = isPortrait ? 40 : 56;
  const hookSize = isPortrait ? 26 : 30;

  const logoOpacity = interpolate(frame, [fps * 0.9, fps * 1.4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleScale = interpolate(frame, [fps * 1.1, fps * 2.2], [1.3, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [fps * 1.1, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Clash flash — a brief bright pulse right as the title slams into place, using a theme
  // token (never a hardcoded hex) so it stays compliant across themes.
  const flashOpacity = interpolate(frame, [fps * 1.0, fps * 1.08, fps * 1.25], [0, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const [left, right] = input.meta.title.split(/\s+vs\.?\s+/i);
  const hookQuestion = buildHookQuestion(input, left ?? input.meta.title, right);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      <div
        style={{
          position: "absolute",
          top: isPortrait ? 90 : 110,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: hookOpacity,
          fontFamily: theme.fontBody,
          fontSize: hookSize,
          color: theme.textSecondary,
          letterSpacing: 1,
          padding: "0 60px",
        }}
      >
        {hookQuestion}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: flashOpacity,
          background: theme.textPrimary,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: titleSize,
            color: theme.textPrimary,
            textAlign: "center",
            lineHeight: 1.05,
            padding: "0 40px",
          }}
        >
          {left ?? input.meta.title}
        </div>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: vsSize,
            color: theme.neutralAccent,
            letterSpacing: 6,
          }}
        >
          VS
        </div>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: titleSize,
            color: theme.textPrimary,
            textAlign: "center",
            lineHeight: 1.05,
            padding: "0 40px",
          }}
        >
          {right ?? ""}
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: logoOpacity }}>
        <LogoSting theme={theme} />
      </div>
    </div>
  );
};
