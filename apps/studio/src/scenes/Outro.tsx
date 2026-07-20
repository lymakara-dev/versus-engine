import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Icon } from "../components/Icon";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(TIMING_SECONDS.outro, input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

export const Outro: React.FC<{ input: VideoInput; theme: Theme }> = ({ input, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bellRing = spring({ frame, fps, config: { damping: 8, mass: 0.5 } });
  const bellRotation = interpolate(bellRing, [0, 1], [-25, 0]);

  const textOpacity = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const teaserOpacity = interpolate(frame, [fps * 1.6, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          gap: 28,
        }}
      >
        <div style={{ transform: `rotate(${bellRotation}deg)` }}>
          <Icon name="bell-ring" size={90} color={theme.neutralAccent} />
        </div>
        <div
          style={{
            opacity: textOpacity,
            fontFamily: theme.fontDisplay,
            fontSize: 56,
            color: theme.textPrimary,
            letterSpacing: 2,
          }}
        >
          SUBSCRIBE FOR MORE HEAD-TO-HEADS
        </div>
        <div
          style={{
            opacity: teaserOpacity,
            fontFamily: theme.fontBody,
            fontSize: 30,
            color: theme.textSecondary,
          }}
        >
          Next up: which {input.meta.category} takes the crown?
        </div>
      </div>
    </div>
  );
};
