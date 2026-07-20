/** Accepts "now" (render only, no scheduled publish) or a cadence for staggering publish times across a batch. */
const INTERVALS_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export function parseScheduleIntervalMs(value: string): number | null {
  if (value === "now") return null;
  const intervalMs = INTERVALS_MS[value];
  if (intervalMs === undefined) {
    throw new Error(`Invalid --schedule "${value}" — expected one of: now, hourly, daily, weekly`);
  }
  return intervalMs;
}

/** The i-th (0-indexed) video in a scheduled batch publishes `(i + 1) * intervalMs` from now. */
export function scheduledAtFor(index: number, intervalMs: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + (index + 1) * intervalMs);
}
