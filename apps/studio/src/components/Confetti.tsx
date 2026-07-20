import React, { useMemo } from "react";
import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

const PARTICLE_COUNT = 60;

interface Particle {
  x: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  rotationSpeed: number;
  delayFrames: number;
}

export const Confetti: React.FC<{ colors: string[]; delayFrames?: number }> = ({
  colors,
  delayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const particles = useMemo<Particle[]>(
    () =>
      new Array(PARTICLE_COUNT).fill(0).map((_, i) => ({
        x: random(`confetti-x-${i}`) * width,
        angle: random(`confetti-angle-${i}`) * Math.PI - Math.PI / 2,
        speed: 300 + random(`confetti-speed-${i}`) * 500,
        size: 8 + random(`confetti-size-${i}`) * 10,
        color: colors[i % colors.length],
        rotationSpeed: (random(`confetti-rot-${i}`) - 0.5) * 720,
        delayFrames: random(`confetti-delay-${i}`) * 10,
      })),
    [width, colors],
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((particle, i) => {
        const localFrame = frame - delayFrames - particle.delayFrames;
        const t = Math.max(localFrame, 0) / fps;
        const gravity = 900;
        const y = height * 0.15 + particle.speed * Math.sin(particle.angle) * -1 * t + 0.5 * gravity * t * t;
        const x = particle.x + particle.speed * Math.cos(particle.angle) * t * 0.4;
        const opacity = interpolate(localFrame, [0, 8, 45, 60], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const rotation = particle.rotationSpeed * t;

        if (localFrame < 0 || y > height + 40) {
          return null;
        }

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: particle.size,
              height: particle.size * 0.4,
              background: particle.color,
              opacity,
              transform: `rotate(${rotation}deg)`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
};
