import React from "react";
import { Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Icon } from "../components/Icon";
import { AnimatedBar } from "../components/AnimatedBar";
import { Gauge } from "../components/Gauge";
import { Counter } from "../components/Counter";
import { Badge } from "../components/Badge";
import { TugOfWarDuel } from "../components/TugOfWarDuel";
import { sfxSrc, type SfxCue } from "../audio/types";
import { TIMING_SECONDS, specBattleSeconds, secondsToFrames, paceSeconds } from "../timing";
import type { Theme } from "../theme";
import type { Round, VideoInput } from "../schema";
import type { RoundContenderVisual } from "../components/types";
import type { SceneLayout } from "../layout";

const IMPACT_SECONDS = 1.5;

export function getDuration(input: VideoInput): number {
  return secondsToFrames(paceSeconds(specBattleSeconds(input.rounds.length), input), input.meta.fps);
}

export function getSfxCues(input: VideoInput): SfxCue[] {
  const roundFrames = secondsToFrames(paceSeconds(TIMING_SECONDS.specBattleRound, input), input.meta.fps);
  const impactFrames = secondsToFrames(paceSeconds(IMPACT_SECONDS, input), input.meta.fps);

  return input.rounds.map((round, index) => ({
    frame: index * roundFrames + impactFrames,
    src: sfxSrc(round.sfx ?? "ding"),
  }));
}

/** Bar-round treatments rotate deterministically so back-to-back "bar" rounds never look identical (retention pattern-interrupt). */
const BAR_TREATMENTS = [AnimatedBar, TugOfWarDuel, Gauge];

const NON_BAR_VISUALIZATION_COMPONENTS = {
  gauge: Gauge,
  counter: Counter,
  badge: Badge,
};

/** Running count of "bar"-visualization rounds seen so far, per round index — the deterministic treatment-rotation key. */
export function computeBarRoundIndices(rounds: Round[]): number[] {
  let seen = 0;
  return rounds.map((round) => {
    if (round.visualization !== "bar") return -1;
    const index = seen;
    seen += 1;
    return index;
  });
}

const RoundCard: React.FC<{
  round: Round;
  contenders: VideoInput["contenders"];
  theme: Theme;
  isPortrait: boolean;
  barTreatmentIndex: number;
  roundIndex: number;
  roundCount: number;
}> = ({ round, contenders, theme, isPortrait, barTreatmentIndex, roundIndex, roundCount }) => {
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

  const VisualizationComponent =
    round.visualization === "bar"
      ? BAR_TREATMENTS[barTreatmentIndex % BAR_TREATMENTS.length]
      : NON_BAR_VISUALIZATION_COMPONENTS[round.visualization];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isPortrait ? 40 : 56,
        padding: isPortrait ? "0 64px" : "0 220px",
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
        <Icon name={round.icon} size={isPortrait ? 36 : 44} color={theme.neutralAccent} />
        <span
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: isPortrait ? 40 : 52,
            color: theme.textPrimary,
            textAlign: "center",
          }}
        >
          {round.label}
        </span>
      </div>
      <div style={{ width: "100%" }}>
        <VisualizationComponent contenders={visuals} theme={theme} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {new Array(roundCount).fill(0).map((_, dotIndex) => (
          <div
            key={dotIndex}
            style={{
              width: dotIndex === roundIndex ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: dotIndex <= roundIndex ? theme.neutralAccent : theme.surface,
              transition: "none",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 8,
            fontFamily: theme.fontBody,
            fontSize: 16,
            color: theme.textSecondary,
            letterSpacing: 1,
          }}
        >
          ROUND {roundIndex + 1}/{roundCount}
        </span>
      </div>
    </div>
  );
};

export const SpecBattle: React.FC<{ input: VideoInput; theme: Theme; layout: SceneLayout }> = ({
  input,
  theme,
  layout,
}) => {
  const { fps } = useVideoConfig();
  const roundFrames = secondsToFrames(paceSeconds(TIMING_SECONDS.specBattleRound, input), fps);
  const isPortrait = layout.orientation === "portrait";
  const barRoundIndices = computeBarRoundIndices(input.rounds);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background theme={theme} />
      {input.rounds.map((round, index) => (
        <Sequence key={round.label} from={index * roundFrames} durationInFrames={roundFrames}>
          <RoundCard
            round={round}
            contenders={input.contenders}
            theme={theme}
            isPortrait={isPortrait}
            barTreatmentIndex={barRoundIndices[index]}
            roundIndex={index}
            roundCount={input.rounds.length}
          />
        </Sequence>
      ))}
    </div>
  );
};
