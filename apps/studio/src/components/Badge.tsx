import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

const SETTLE_START_SECONDS = 0.6;
const SETTLE_SECONDS = 0.3;

export const Badge: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settleStartFrames = secondsToFrames(SETTLE_START_SECONDS, fps);
  const settleFrames = secondsToFrames(SETTLE_SECONDS, fps);

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 48 }}>
      {contenders.map((contender, index) => {
        const scale = spring({
          frame: frame - index * 4,
          fps,
          config: { damping: 12, mass: 0.6 },
        });

        const settleProgress = interpolate(
          frame,
          [settleStartFrames, settleStartFrames + settleFrames],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const winnerPulse = contender.isWinner
          ? interpolate(settleProgress, [0, 0.5, 1], [1, 1.05, 1])
          : 1;
        const loserFade = contender.isWinner ? 1 : interpolate(settleProgress, [0, 1], [1, 0.8]);

        return (
          <div
            key={contender.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: loserFade,
              filter: `saturate(${loserFade})`,
              transform: `scale(${scale * winnerPulse})`,
            }}
          >
            <div
              style={{
                padding: "28px 44px",
                borderRadius: 24,
                fontFamily: theme.fontDisplay,
                fontSize: 44,
                color: contender.isWinner ? theme.backgroundFrom : theme.textPrimary,
                background: contender.isWinner ? contender.color : theme.surface,
                boxShadow: contender.isWinner ? `0 0 28px ${contender.color}` : "none",
                border: `2px solid ${contender.isWinner ? contender.color : theme.textSecondary}`,
              }}
            >
              {contender.displayValue}
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
