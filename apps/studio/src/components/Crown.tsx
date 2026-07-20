import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "./Icon";

export const Crown: React.FC<{ color: string; delayFrames?: number }> = ({
  color,
  delayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - delayFrames;

  const dropY = spring({
    frame: localFrame,
    fps,
    config: { damping: 10, mass: 1.1, stiffness: 140 },
    from: -220,
    to: 0,
  });

  const rotate = interpolate(localFrame, [0, 20], [-12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glow = interpolate(localFrame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `translateY(${dropY}px) rotate(${rotate}deg)`,
        filter: `drop-shadow(0 0 ${24 * glow}px ${color})`,
      }}
    >
      <Icon name="crown" size={120} color={color} strokeWidth={1.75} />
    </div>
  );
};
