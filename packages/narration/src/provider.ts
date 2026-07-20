/**
 * TTS providers plug into synthesizeNarration() through this one interface
 * (PROJECT_PLAN.md Phase 5 "optional TTS narration track") — swapping
 * providers never touches script.ts or the studio's audio playback.
 */
export interface NarrationProvider {
  /** Synthesizes one line of narration text into audio bytes (mp3). */
  synthesize(text: string): Promise<Buffer>;
}
