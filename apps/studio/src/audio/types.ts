export interface SfxCue {
  /** Absolute frame within the full composition timeline. */
  frame: number;
  src: string;
  durationInFrames?: number;
}

export function sfxSrc(name: string): string {
  return `assets/sfx/${name}.mp3`;
}
