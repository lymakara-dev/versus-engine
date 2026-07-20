import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

export const LogoSting: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [0, 4, 14], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, fps * 0.6], [1.6, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.textPrimary,
          opacity: flashOpacity,
        }}
      />
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          fontFamily: theme.fontDisplay,
          fontSize: 64,
          letterSpacing: 8,
          color: theme.textPrimary,
          textTransform: "uppercase",
        }}
      >
        Versus <span style={{ color: theme.neutralAccent }}>Engine</span>
      </div>
    </div>
  );
};
