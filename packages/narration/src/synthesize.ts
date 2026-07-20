import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseBuffer } from "music-metadata";
import type { NarrationClip, VideoInput } from "@versus-engine/shared";
import { buildNarrationScript } from "./script.js";
import type { NarrationProvider } from "./provider.js";

export interface SynthesizeNarrationOptions {
  provider: NarrationProvider;
  /** Absolute directory to write the synthesized mp3 files to. */
  outputDir: string;
  /** Path prefix the studio resolves via staticFile(), e.g. "assets/narration" — stored as-is in the frozen videoJson. */
  assetPathPrefix: string;
  /** Used to name output files, e.g. the comparison's slug. */
  slugHint: string;
}

const WORDS_PER_SECOND = 2.5; // ~150wpm speaking pace — fallback only, if duration probing fails

function estimateDurationSec(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, wordCount / WORDS_PER_SECOND);
}

/**
 * Scripts, synthesizes, and saves one narration clip per line (hook, one per
 * round, verdict), returning them as NarrationClip[] ready to attach to a
 * VideoInput before it's frozen (PROJECT_PLAN.md Phase 5). Each clip's audio
 * file is probed with music-metadata for its real duration rather than
 * trusting the provider or an estimate, since AudioTrack's music-ducking
 * window is sized off `durationSec`.
 */
export async function synthesizeNarration(
  input: Pick<VideoInput, "meta" | "contenders" | "rounds" | "verdict">,
  options: SynthesizeNarrationOptions,
): Promise<NarrationClip[]> {
  const lines = buildNarrationScript(input);
  await mkdir(options.outputDir, { recursive: true });

  const clips: NarrationClip[] = [];
  for (const line of lines) {
    const audio = await options.provider.synthesize(line.text);
    const fileName = `${options.slugHint}-${line.id}.mp3`;
    await writeFile(path.join(options.outputDir, fileName), audio);

    const metadata = await parseBuffer(audio, "audio/mpeg").catch(() => null);
    const durationSec = metadata?.format.duration ?? estimateDurationSec(line.text);

    clips.push({
      text: line.text,
      audioSrc: `${options.assetPathPrefix}/${fileName}`,
      startSec: line.anchorSec,
      durationSec,
    });
  }
  return clips;
}
