/**
 * Scene durations, in seconds — the renderer's entry point per CLAUDE.md
 * ("define scene durations in apps/studio/src/timing.ts"). The actual
 * numbers live in @versus-engine/shared so the Phase 5 analytics feedback
 * loop (apps/workers) can correlate YouTube retention curves back to
 * individual rounds using the exact same timing, without depending on this
 * Remotion-only package.
 */
export { TIMING_SECONDS, secondsToFrames, contenderRevealSeconds, specBattleSeconds } from "@versus-engine/shared";
