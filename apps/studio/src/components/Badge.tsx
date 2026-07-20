import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

export const Badge: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 48 }}>
      {contenders.map((contender, index) => {
        const scale = spring({
          frame: frame - index * 4,
          fps,
          config: { damping: 12, mass: 0.6 },
        });

        return (
          <div
            key={contender.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              transform: `scale(${scale})`,
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
