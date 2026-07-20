// Library entry point for consumers embedding the composition directly (e.g.
// the dashboard's <Player>). Deliberately does NOT call registerRoot() —
// that only belongs to the Remotion CLI/Studio entry point (./index.ts).
export { Comparison16x9, computeTotalDurationInFrames } from "./compositions/Comparison16x9";
export * from "./schema";
