import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { parseVideoInput, type VideoInput } from "../schema";
import { getTheme } from "../theme";
import { getLayout } from "../layout";
import { TIMING_SECONDS, secondsToFrames } from "../timing";
import { AudioTrack } from "../audio/AudioTrack";
import type { SfxCue } from "../audio/types";
import * as IntroScene from "../scenes/Intro";
import * as ContenderRevealScene from "../scenes/ContenderReveal";
import * as SpecBattleScene from "../scenes/SpecBattle";
import * as ScoreboardScene from "../scenes/Scoreboard";
import * as WinnerRevealScene from "../scenes/WinnerReveal";
import * as OutroScene from "../scenes/Outro";

const SEQUENTIAL_SCENES = [IntroScene, ContenderRevealScene, SpecBattleScene, WinnerRevealScene, OutroScene];

export function computeTotalDurationInFrames(input: VideoInput): number {
  const transitionFrames = secondsToFrames(TIMING_SECONDS.sceneTransition, input.meta.fps);
  const durations = SEQUENTIAL_SCENES.map((scene) => scene.getDuration(input));
  const totalRaw = durations.reduce((sum, d) => sum + d, 0);
  return totalRaw - transitionFrames * (SEQUENTIAL_SCENES.length - 1);
}

function computeSceneStartFrames(input: VideoInput): number[] {
  const transitionFrames = secondsToFrames(TIMING_SECONDS.sceneTransition, input.meta.fps);
  const durations = SEQUENTIAL_SCENES.map((scene) => scene.getDuration(input));
  const starts: number[] = [0];
  for (let i = 1; i < durations.length; i++) {
    starts.push(starts[i - 1] + durations[i - 1] - transitionFrames);
  }
  return starts;
}

function computeAllSfxCues(input: VideoInput): SfxCue[] {
  const starts = computeSceneStartFrames(input);
  return SEQUENTIAL_SCENES.flatMap((scene, index) =>
    scene.getSfxCues(input).map((cue) => ({ ...cue, frame: cue.frame + starts[index] })),
  );
}

/**
 * Optional TTS narration (PROJECT_PLAN.md Phase 5) — each clip's
 * startSec/durationSec are already absolute positions on the full
 * composition timeline (computed once by packages/narration using the same
 * @versus-engine/shared timing math), so no per-scene offsetting is needed
 * here the way computeAllSfxCues needs it.
 */
function computeNarrationCues(input: VideoInput): SfxCue[] {
  return (input.narration ?? []).map((clip) => ({
    frame: secondsToFrames(clip.startSec, input.meta.fps),
    src: clip.audioSrc,
    durationInFrames: secondsToFrames(clip.durationSec, input.meta.fps),
  }));
}

/**
 * Renders both the 16:9 and 9:16 (Shorts) aspect ratios — the scene
 * components are identical either way and adapt via the `layout` prop
 * (derived from `input.meta.aspect`); only the `<Composition>` registration
 * in Root.tsx (id, width/height, example props) differs. See
 * ComparisonShort9x16.tsx.
 */
export const Comparison16x9: React.FC<VideoInput> = (props) => {
  const input = parseVideoInput(props);
  const { fps } = useVideoConfig();
  const theme = getTheme(input.meta.theme);
  const layout = getLayout(input);
  const transitionFrames = secondsToFrames(TIMING_SECONDS.sceneTransition, fps);

  const [introD, revealD, battleD, winnerD, outroD] = SEQUENTIAL_SCENES.map((scene) =>
    scene.getDuration(input),
  );
  const sceneStarts = useMemo(() => computeSceneStartFrames(input), [input]);
  const totalDuration = useMemo(() => computeTotalDurationInFrames(input), [input]);
  const audioCues = useMemo(
    () => [...computeAllSfxCues(input), ...computeNarrationCues(input)],
    [input],
  );
  const scoreboardDuration = ScoreboardScene.getDuration(input);

  const transitionTiming = () => springTiming({ config: { damping: 200 }, durationInFrames: transitionFrames });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundFrom }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={introD}>
          <IntroScene.Intro input={input} theme={theme} layout={layout} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transitionTiming()} />
        <TransitionSeries.Sequence durationInFrames={revealD}>
          <ContenderRevealScene.ContenderReveal input={input} theme={theme} layout={layout} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide()} timing={transitionTiming()} />
        <TransitionSeries.Sequence durationInFrames={battleD}>
          <SpecBattleScene.SpecBattle input={input} theme={theme} layout={layout} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={transitionTiming()} />
        <TransitionSeries.Sequence durationInFrames={winnerD}>
          <WinnerRevealScene.WinnerReveal input={input} theme={theme} layout={layout} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={transitionTiming()} />
        <TransitionSeries.Sequence durationInFrames={outroD}>
          <OutroScene.Outro input={input} theme={theme} layout={layout} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Sequence from={sceneStarts[2]} durationInFrames={scoreboardDuration} layout="none">
        <ScoreboardScene.Scoreboard input={input} theme={theme} layout={layout} />
      </Sequence>

      <AudioTrack music={input.music} cues={audioCues} totalDurationInFrames={totalDuration} fps={fps} />
    </AbsoluteFill>
  );
};
