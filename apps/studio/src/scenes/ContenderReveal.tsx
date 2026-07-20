import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { PricePill } from "../components/PricePill";
import { sfxSrc, type SfxCue } from "../audio/types";
import { contenderRevealSeconds, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

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
  isPortrait: boolean;
}> = ({ contender, index, theme, isPortrait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * fps * 0.35;
  const fromLeft = index % 2 === 0;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, mass: 0.8 },
  });

  // Landscape: cards slide in from alternating sides. Portrait: cards are
  // stacked, so they all slide up from below instead.
  const translateX = isPortrait ? 0 : (1 - progress) * (fromLeft ? -400 : 400);
  const translateY = isPortrait ? (1 - progress) * 160 : 0;
  const imageSize = isPortrait ? 220 : 340;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isPortrait ? 12 : 20,
        opacity: progress,
        transform: `translate(${translateX}px, ${translateY}px)`,
      }}
    >
      <div
        style={{
          width: imageSize,
          height: imageSize,
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
          fontSize: isPortrait ? 36 : 48,
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
          fontSize: isPortrait ? 22 : 28,
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

export const ContenderReveal: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const isPortrait = layout.orientation === "portrait";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: isPortrait ? 36 : 80,
          padding: isPortrait ? "80px 60px" : "0 120px",
        }}
      >
        {input.contenders.map((contender, index) => (
          <ContenderCard
            key={contender.name}
            contender={contender}
            index={index}
            total={input.contenders.length}
            theme={theme}
            isPortrait={isPortrait}
          />
        ))}
      </div>
    </div>
  );
};
