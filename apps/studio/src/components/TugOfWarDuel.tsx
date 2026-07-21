import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { RoundContenderVisual } from "./types";

const ANTICIPATION_SECONDS = 0.3;
const COUNT_SECONDS = 1.4;
const SETTLE_SECONDS = 0.3;
/** Caps how far the center bar can skew toward the leader, so the meter never fully empties on the other side. */
const MAX_LEAD_SKEW = 0.35;

function suffixOf(displayValue: string): string {
  return displayValue.replace(/^-?[\d,.]+/, "");
}

function decimalsOf(displayValue: string): number {
  return displayValue.match(/\.(\d+)/)?.[1].length ?? 0;
}

/** How far past the 50/50 center the leader's margin pushes the meter — generic for any contender count. */
function leaderShareOf(contenders: RoundContenderVisual[], leaderIndex: number): number {
  const total = contenders.reduce((sum, c) => sum + Math.abs(c.value), 0) || 1;
  const rawShare = Math.abs(contenders[leaderIndex].value) / total;
  return 0.5 + Math.min(rawShare - 0.5, MAX_LEAD_SKEW);
}

/**
 * Treatment 2 for "bar" rounds — dual animated counters racing side by side
 * with a center power-meter that grows toward the leader's color as the
 * count settles, instead of a horizontal race bar (AnimatedBar) or a radial
 * fill (Gauge).
 */
export const TugOfWarDuel: React.FC<{
  contenders: RoundContenderVisual[];
  theme: Theme;
}> = ({ contenders, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = secondsToFrames(ANTICIPATION_SECONDS, fps);
  const countFrames = secondsToFrames(COUNT_SECONDS, fps);
  const settleFrames = secondsToFrames(SETTLE_SECONDS, fps);

  const leaderIndex = contenders.reduce(
    (best, c, i) => (Math.abs(c.value) > Math.abs(contenders[best].value) ? i : best),
    0,
  );
  const targetShare = leaderShareOf(contenders, leaderIndex);
  const share = interpolate(frame, [holdFrames, holdFrames + countFrames], [0.5, targetShare], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const meterInset = 50 - (share - 0.5) * 100;

  const settleProgress = interpolate(
    frame,
    [holdFrames + countFrames, holdFrames + countFrames + settleFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 96, marginBottom: 32 }}>
        {contenders.map((contender) => {
          const decimals = decimalsOf(contender.displayValue);
          const suffix = suffixOf(contender.displayValue);
          const animatedValue = interpolate(
            frame,
            [holdFrames, holdFrames + countFrames],
            [0, contender.value],
            { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const winnerPulse = contender.isWinner
            ? interpolate(settleProgress, [0, 0.5, 1], [1, 1.06, 1])
            : 1;
          const loserOpacity = contender.isWinner ? 1 : interpolate(settleProgress, [0, 1], [1, 0.8]);
          const loserSaturation = contender.isWinner ? 1 : interpolate(settleProgress, [0, 1], [1, 0.8]);

          return (
            <div
              key={contender.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: loserOpacity,
                transform: `scale(${winnerPulse})`,
                filter: `saturate(${loserSaturation})`,
              }}
            >
              <div
                style={{
                  fontFamily: theme.fontDisplay,
                  fontSize: 80,
                  color: contender.isWinner ? contender.color : theme.textPrimary,
                  textShadow: contender.isWinner ? `0 0 24px ${contender.color}` : "none",
                }}
              >
                {animatedValue.toFixed(decimals)}
                <span style={{ fontSize: 36, marginLeft: 8 }}>{suffix.trim()}</span>
              </div>
              <span style={{ fontFamily: theme.fontBody, color: theme.textSecondary, fontSize: 24 }}>
                {contender.name}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          height: 22,
          borderRadius: 11,
          background: theme.surface,
          position: "relative",
          overflow: "hidden",
          boxShadow: `inset 0 0 0 2px ${theme.backgroundTo}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${meterInset}%`,
            right: `${meterInset}%`,
            borderRadius: 11,
            background: contenders[leaderIndex].color,
            boxShadow: `0 0 16px ${contenders[leaderIndex].color}`,
          }}
        />
      </div>
    </div>
  );
};
