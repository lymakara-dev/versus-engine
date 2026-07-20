import React from "react";
import { Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Icon } from "../components/Icon";
import { AnimatedBar } from "../components/AnimatedBar";
import { Gauge } from "../components/Gauge";
import { Counter } from "../components/Counter";
import { Badge } from "../components/Badge";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, specBattleSeconds, secondsToFrames } from "../timing";
import type { Theme } from "../theme";
import type { Round, VideoInput } from "../schema";
import type { RoundContenderVisual } from "../components/types";

const IMPACT_SECONDS = 1.5;

export function getDuration(input: VideoInput): number {
  return secondsToFrames(specBattleSeconds(input.rounds.length), input.meta.fps);
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  const roundFrames = secondsToFrames(TIMING_SECONDS.specBattleRound, input.meta.fps);
  const impactFrames = secondsToFrames(IMPACT_SECONDS, input.meta.fps);

  return input.rounds.map((round, index) => ({
    frame: index * roundFrames + impactFrames,
    src: sfxSrc(round.sfx ?? "ding"),
  }));
}

const VISUALIZATION_COMPONENTS = {
  bar: AnimatedBar,
  gauge: Gauge,
  counter: Counter,
  badge: Badge,
};

const RoundCard: React.FC<{ round: Round; contenders: VideoInput["contenders"]; theme: Theme }> = ({
  round,
  contenders,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = spring({ frame, fps, config: { damping: 14 } });

  const visuals: RoundContenderVisual[] = contenders.map((contender, index) => ({
    name: contender.name,
    displayValue: round.displayValues[index],
    value: round.values[index],
    color: contender.accentColor,
    isWinner: round.winnerIndex === index,
  }));

  const VisualizationComponent = VISUALIZATION_COMPONENTS[round.visualization];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: "0 220px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: headerProgress,
          transform: `translateY(${(1 - headerProgress) * -30}px)`,
        }}
      >
        <Icon name={round.icon} size={44} color={theme.neutralAccent} />
        <span style={{ fontFamily: theme.fontDisplay, fontSize: 52, color: theme.textPrimary }}>
          {round.label}
        </span>
      </div>
      <div style={{ width: "100%" }}>
        <VisualizationComponent contenders={visuals} theme={theme} />
      </div>
    </div>
  );
};

export const SpecBattle: React.FC<{ input: VideoInput; theme: Theme }> = ({ input, theme }) => {
  const { fps } = useVideoConfig();
  const roundFrames = secondsToFrames(TIMING_SECONDS.specBattleRound, fps);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      {input.rounds.map((round, index) => (
        <Sequence key={round.label} from={index * roundFrames} durationInFrames={roundFrames}>
          <RoundCard round={round} contenders={input.contenders} theme={theme} />
        </Sequence>
      ))}
    </div>
  );
};
