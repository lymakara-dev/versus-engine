// The 9:16 Shorts variant reuses the exact same component as Comparison16x9
// (which adapts via the `layout` prop derived from `input.meta.aspect`) —
// only the `<Composition>` registration in Root.tsx differs (id,
// 1080x1920 dimensions, portrait example props).
export { Comparison16x9 as ComparisonShort9x16, computeTotalDurationInFrames } from "./Comparison16x9";
