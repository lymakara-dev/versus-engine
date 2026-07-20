import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

const ANTICIPATION_SECONDS = 0.4;
const RACE_SECONDS = 1.1;

export const AnimatedBar: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = secondsToFrames(ANTICIPATION_SECONDS, fps);
  const raceFrames = secondsToFrames(RACE_SECONDS, fps);
  const maxValue = Math.max(...contenders.map((c) => Math.abs(c.value)), 1);

  return (
    <div style={{ width: "100%" }}>
      {contenders.map((contender, index) => {
        const targetPercent = (Math.abs(contender.value) / maxValue) * 100;
        const overshoot = contender.isWinner ? targetPercent * 1.04 : targetPercent;

        const percent = interpolate(
          frame,
          [holdFrames, holdFrames + raceFrames, holdFrames + raceFrames + 8],
          [0, overshoot, targetPercent],
          {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );

        return (
          <div
            key={contender.name}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginBottom: index < contenders.length - 1 ? 28 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 10,
                fontFamily: theme.fontBody,
                color: theme.textSecondary,
                fontSize: 28,
              }}
            >
              <span>{contender.name}</span>
              <span
                style={{
                  color: contender.isWinner ? contender.color : theme.textPrimary,
                  fontWeight: 700,
                }}
              >
                {contender.displayValue}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 40,
                borderRadius: 20,
                background: theme.surface,
                overflow: "hidden",
                boxShadow: `inset 0 0 0 2px ${theme.backgroundTo}`,
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  borderRadius: 20,
                  background: contender.color,
                  boxShadow: contender.isWinner ? `0 0 24px ${contender.color}` : "none",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
