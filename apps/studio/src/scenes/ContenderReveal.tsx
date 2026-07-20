import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { PricePill } from "../components/PricePill";
import { sfxSrc, type SfxCue } from "../audio/types";
import { contenderRevealSeconds, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(contenderRevealSeconds(input.contenders.length), input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

const ContenderCard: React.FC<{
  contender: VideoInput["contenders"][number];
  index: number;
  total: number;
  theme: Theme;
}> = ({ contender, index, total, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * fps * 0.35;
  const fromLeft = index % 2 === 0;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  const translateX = (1 - progress) * (fromLeft ? -400 : 400);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        opacity: progress,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          width: 340,
          height: 340,
          borderRadius: 24,
          background: contender.accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${contender.accentColor}55`,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(contender.imageUrl)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 48,
          color: theme.textPrimary,
          textAlign: "center",
        }}
      >
        {contender.name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: theme.fontBody,
          fontSize: 28,
          color: theme.textSecondary,
        }}
      >
        <Img src={staticFile(contender.logoUrl)} style={{ height: 32, objectFit: "contain" }} />
        {contender.brand}
      </div>
      <PricePill price={contender.price} color={contender.accentColor} theme={theme} />
    </div>
  );
};

export const ContenderReveal: React.FC<{ input: VideoInput; theme: Theme }> = ({ input, theme }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <Background theme={theme} />
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        padding: "0 120px",
      }}
    >
      {input.contenders.map((contender, index) => (
        <ContenderCard
          key={contender.name}
          contender={contender}
          index={index}
          total={input.contenders.length}
          theme={theme}
        />
      ))}
    </div>
  </div>
);
