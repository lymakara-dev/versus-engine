import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

const ANTICIPATION_SECONDS = 0.4;
const RACE_SECONDS = 1.2;
const RADIUS = 90;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const Gauge: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = secondsToFrames(ANTICIPATION_SECONDS, fps);
  const raceFrames = secondsToFrames(RACE_SECONDS, fps);
  const maxValue = Math.max(...contenders.map((c) => Math.abs(c.value)), 1);

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 72 }}>
      {contenders.map((contender) => {
        const fraction = Math.abs(contender.value) / maxValue;
        const fillFraction = interpolate(frame, [holdFrames, holdFrames + raceFrames], [0, fraction], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const dashOffset = CIRCUMFERENCE * (1 - fillFraction);

        return (
          <div
            key={contender.name}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
          >
            <svg width={220} height={220} viewBox="0 0 220 220">
              <circle
                cx={110}
                cy={110}
                r={RADIUS}
                fill="none"
                stroke={theme.surface}
                strokeWidth={STROKE}
              />
              <circle
                cx={110}
                cy={110}
                r={RADIUS}
                fill="none"
                stroke={contender.color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 110 110)"
                style={{
                  filter: contender.isWinner ? `drop-shadow(0 0 12px ${contender.color})` : undefined,
                }}
              />
              <text
                x="110"
                y="118"
                textAnchor="middle"
                fontFamily={theme.fontDisplay}
                fontSize={34}
                fill={theme.textPrimary}
              >
                {contender.displayValue}
              </text>
            </svg>
            <span style={{ fontFamily: theme.fontBody, color: theme.textSecondary, fontSize: 26 }}>
              {contender.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
