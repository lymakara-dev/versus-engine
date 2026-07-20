import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoSting } from "../components/LogoSting";
import { Background } from "../components/Background";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(TIMING_SECONDS.intro, input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

export const Intro: React.FC<{ input: VideoInput; theme: Theme }> = ({ input, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  const [left, right] = input.meta.title.split(/\s+vs\.?\s+/i);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
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
            fontSize: 96,
            color: theme.textPrimary,
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          {left ?? input.meta.title}
        </div>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 56,
            color: theme.neutralAccent,
            letterSpacing: 6,
          }}
        >
          VS
        </div>
        <div
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: 96,
            color: theme.textPrimary,
            textAlign: "center",
            lineHeight: 1.05,
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
