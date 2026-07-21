export interface SfxCue {
  /** Absolute frame within the full composition timeline. */
  frame: number;
  src: string;
  durationInFrames?: number;
  /** Override the default -6dB music duck depth for this cue (e.g. a deeper duck under the WinnerReveal drumroll). */
  duckDb?: number;
  /** When true, this cue only ducks the music bed and plays no audio file of its own (e.g. RoundRecap's tension hold). */
  silent?: boolean;
}

export function sfxSrc(name: string): string {
  return `assets/sfx/${name}.mp3`;
}
