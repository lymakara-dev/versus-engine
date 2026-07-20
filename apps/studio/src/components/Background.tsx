import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Theme } from "../theme";

const SpeedLines: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const offset = interpolate(frame, [0, 90], [0, -400], { extrapolateRight: "extend" });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 0.12, overflow: "hidden" }}>
      {new Array(14).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: i * 90 - 100,
            left: offset - (i % 2) * 120,
            width: "160%",
            height: 6,
            background: theme.neutralAccent,
            transform: "rotate(-8deg)",
          }}
        />
      ))}
    </div>
  );
};

const Circuit: React.FC<{ theme: Theme }> = ({ theme }) => (
  <svg
    style={{ position: "absolute", inset: 0, opacity: 0.15 }}
    width="100%"
    height="100%"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="circuit-grid" width="120" height="120" patternUnits="userSpaceOnUse">
        <path
          d="M0 60 H120 M60 0 V120"
          stroke={theme.neutralAccent}
          strokeWidth={1.5}
          fill="none"
        />
        <circle cx="60" cy="60" r="4" fill={theme.neutralAccent} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#circuit-grid)" />
  </svg>
);

export const Background: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(160deg, ${theme.backgroundFrom}, ${theme.backgroundTo})`,
    }}
  >
    {theme.motif === "speed-lines" && <SpeedLines theme={theme} />}
    {theme.motif === "circuit" && <Circuit theme={theme} />}
  </div>
);
