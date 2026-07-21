import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { PricePill } from "../components/PricePill";
import { sfxSrc, type SfxCue } from "../audio/types";
import { contenderRevealSeconds, secondsToFrames, paceSeconds } from "../timing";
import type { Theme } from "../theme";
import type { VideoInput } from "../schema";
import type { SceneLayout } from "../layout";

export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(contenderRevealSeconds(input.contenders.length), input), input.meta.fps);
}

export function getSfxCues(): SfxCue[] {
  return [{ frame: 0, src: sfxSrc("whoosh") }];
}

/**
 * Generic "doubt" stat for the reveal beat — flags contenders that cost more
 * than the cheapest one in the matchup, using existing data only (no
 * category branching): prefers the round conventionally keyed "price"
 * (every seeded category's SpecDefinitions include one), falling back to
 * parsing digits out of contender.price directly when no such round exists.
 */
export function computePriceDoubt(input: Pick<VideoInput, "contenders" | "rounds">, contenderIndex: number): string | null {
  const priceRound = input.rounds.find((round) => round.specKey === "price");
  const parseAmount = (text: string) => Number(text.replace(/[^\d.]/g, "")) || 0;
  const prefixOf = (text: string) => text.match(/^[^\d]*/)?.[0] ?? "";

  const amounts = priceRound
    ? priceRound.values
    : input.contenders.map((c) => parseAmount(c.price));
  const displays = priceRound ? priceRound.displayValues : input.contenders.map((c) => c.price);

  const cheapestIndex = amounts.reduce((best, value, i) => (value < amounts[best] ? i : best), 0);
  if (contenderIndex === cheapestIndex || amounts[contenderIndex] <= amounts[cheapestIndex]) return null;

  const delta = amounts[contenderIndex] - amounts[cheapestIndex];
  const prefix = prefixOf(displays[contenderIndex]);
  return `but ${prefix}${delta.toLocaleString()} more`;
}

const ContenderCard: React.FC<{
  contender: VideoInput["contenders"][number];
  index: number;
  total: number;
  theme: Theme;
  isPortrait: boolean;
  doubt: string | null;
  sceneDurationFrames: number;
}> = ({ contender, index, theme, isPortrait, doubt, sceneDurationFrames }) => {
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

  // Slow Ken Burns drift across the full scene so the product photo never sits static.
  const kenBurnsScale = interpolate(frame, [0, sceneDurationFrames], [1, 1.08], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const doubtOpacity = interpolate(frame - delay, [fps * 1.1, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${kenBurnsScale})`,
          }}
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
      {doubt && (
        <div
          style={{
            opacity: doubtOpacity,
            fontFamily: theme.fontBody,
            fontSize: isPortrait ? 18 : 22,
            color: theme.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          {doubt}
        </div>
      )}
    </div>
  );
};

export const ContenderReveal: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const isPortrait = layout.orientation === "portrait";
  const sceneDurationFrames = getDuration(input);

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
            doubt={computePriceDoubt(input, index)}
            sceneDurationFrames={sceneDurationFrames}
          />
        ))}
      </div>
    </div>
  );
};
