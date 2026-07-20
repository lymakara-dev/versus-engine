import { interpolate } from "remotion";
import type { SfxCue } from "./types";

const DUCK_DB = -6;
const DUCK_ATTACK_SECONDS = 0.2;
const DUCK_HOLD_SECONDS = 0.6;
const DUCK_RELEASE_SECONDS = 0.5;
const FADE_OUT_SECONDS = 2;

export function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

/**
 * Builds a per-frame volume function for the looping music bed: base level
 * from music.volumeDb, ducked -6dB around every SFX cue, fading out over
 * the last two seconds of the composition.
 */
export function createMusicVolumeFn(
  cues: SfxCue[],
  baseVolumeDb: number,
  totalDurationInFrames: number,
  fps: number,
): (frame: number) => number {
  const baseLinear = dbToLinear(baseVolumeDb);
  const duckLinear = dbToLinear(baseVolumeDb + DUCK_DB);
  const attackFrames = Math.round(DUCK_ATTACK_SECONDS * fps);
  const holdFrames = Math.round(DUCK_HOLD_SECONDS * fps);
  const releaseFrames = Math.round(DUCK_RELEASE_SECONDS * fps);
  const fadeFrames = Math.round(FADE_OUT_SECONDS * fps);

  return (frame: number) => {
    let gain = baseLinear;

    for (const cue of cues) {
      // Narration cues (Phase 5) carry their own durationInFrames — the
      // music should stay ducked for the whole spoken line, not just the
      // default blip-length hold used for one-shot SFX.
      const duckStart = cue.frame - attackFrames;
      const duckBottom = cue.frame;
      const duckHoldEnd = cue.frame + (cue.durationInFrames ?? holdFrames);
      const duckEnd = duckHoldEnd + releaseFrames;

      if (frame >= duckStart && frame <= duckEnd) {
        const duckedGain = interpolate(
          frame,
          [duckStart, duckBottom, duckHoldEnd, duckEnd],
          [baseLinear, duckLinear, duckLinear, baseLinear],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        gain = Math.min(gain, duckedGain);
      }
    }

    const fadeGain = interpolate(
      frame,
      [totalDurationInFrames - fadeFrames, totalDurationInFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    return gain * fadeGain;
  };
}
