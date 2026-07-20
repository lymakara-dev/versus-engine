import { describe, expect, it } from "vitest";
import { parseScheduleIntervalMs, scheduledAtFor } from "./parse-schedule.js";

describe("parseScheduleIntervalMs", () => {
  it("returns null for 'now'", () => {
    expect(parseScheduleIntervalMs("now")).toBeNull();
  });

  it("parses hourly/daily/weekly", () => {
    expect(parseScheduleIntervalMs("hourly")).toBe(60 * 60 * 1000);
    expect(parseScheduleIntervalMs("daily")).toBe(24 * 60 * 60 * 1000);
    expect(parseScheduleIntervalMs("weekly")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("rejects an unknown cadence", () => {
    expect(() => parseScheduleIntervalMs("monthly")).toThrow(/Invalid --schedule/);
  });
});

describe("scheduledAtFor", () => {
  it("staggers each index by one more interval", () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    const dayMs = 24 * 60 * 60 * 1000;
    expect(scheduledAtFor(0, dayMs, now)).toEqual(new Date("2026-07-21T00:00:00.000Z"));
    expect(scheduledAtFor(1, dayMs, now)).toEqual(new Date("2026-07-22T00:00:00.000Z"));
  });
});
