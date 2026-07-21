import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

const ANTICIPATION_SECONDS = 0.3;
const COUNT_SECONDS = 1.4;
const SETTLE_SECONDS = 0.3;

function suffixOf(displayValue: string): string {
  return displayValue.replace(/^-?[\d,.]+/, "");
}

function decimalsOf(displayValue: string): number {
  return displayValue.match(/\.(\d+)/)?.[1].length ?? 0;
}

export const Counter: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = secondsToFrames(ANTICIPATION_SECONDS, fps);
  const countFrames = secondsToFrames(COUNT_SECONDS, fps);
  const settleFrames = secondsToFrames(SETTLE_SECONDS, fps);

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 96 }}>
      {contenders.map((contender) => {
        const decimals = decimalsOf(contender.displayValue);
        const suffix = suffixOf(contender.displayValue);
        const animatedValue = interpolate(
          frame,
          [holdFrames, holdFrames + countFrames],
          [0, contender.value],
          { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const settleProgress = interpolate(
          frame,
          [holdFrames + countFrames, holdFrames + countFrames + settleFrames],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const winnerPulse = contender.isWinner
          ? interpolate(settleProgress, [0, 0.5, 1], [1, 1.06, 1])
          : 1;
        const loserFade = contender.isWinner ? 1 : interpolate(settleProgress, [0, 1], [1, 0.8]);

        return (
          <div
            key={contender.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: loserFade,
              filter: `saturate(${loserFade})`,
              transform: `scale(${winnerPulse})`,
            }}
          >
            <div
              style={{
                fontFamily: theme.fontDisplay,
                fontSize: 96,
                color: contender.isWinner ? contender.color : theme.textPrimary,
                textShadow: contender.isWinner ? `0 0 28px ${contender.color}` : "none",
              }}
            >
              {animatedValue.toFixed(decimals)}
              <span style={{ fontSize: 44, marginLeft: 8 }}>{suffix.trim()}</span>
            </div>
            <span style={{ fontFamily: theme.fontBody, color: theme.textSecondary, fontSize: 26 }}>
              {contender.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
