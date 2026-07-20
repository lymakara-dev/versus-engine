import type { VideoInput } from "./schema";

/**
 * Derived once per composition (alongside `theme`) and threaded into every
 * scene as an explicit prop — mirrors how `theme` is resolved once and
 * passed down, so scenes never re-derive it (CLAUDE.md "layout props").
 */
export interface SceneLayout {
  orientation: "landscape" | "portrait";
}

export function getLayout(input: VideoInput): SceneLayout {
  return { orientation: input.meta.aspect === "9:16" ? "portrait" : "landscape" };
}
