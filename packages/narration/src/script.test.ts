import { describe, expect, it } from "vitest";
import type { VideoInput } from "@versus-engine/shared";
import { buildNarrationScript } from "./script.js";

const input: Pick<VideoInput, "meta" | "contenders" | "rounds" | "verdict"> = {
  meta: {
    title: "GR Corolla vs Civic Type R",
    category: "cars",
    theme: "speed",
    aspect: "16:9",
    fps: 30,
    resolution: { width: 1920, height: 1080 },
  },
  contenders: [
    { name: "GR Corolla", brand: "Toyota", price: "$39,995", imageUrl: "a.png", logoUrl: "a-logo.png", accentColor: "#f00" },
    { name: "Civic Type R", brand: "Honda", price: "$45,895", imageUrl: "b.png", logoUrl: "b-logo.png", accentColor: "#00f" },
  ],
  rounds: [
    {
      label: "Horsepower",
      icon: "gauge",
      visualization: "bar",
      unit: "hp",
      higherIsBetter: true,
      values: [300, 315],
      displayValues: ["300 hp", "315 hp"],
      winnerIndex: 1,
      specKey: "horsepower",
    },
    {
      label: "Price",
      icon: "dollar-sign",
      visualization: "counter",
      unit: "USD",
      higherIsBetter: false,
      values: [39995, 45895],
      displayValues: ["$39,995", "$45,895"],
      winnerIndex: 0,
      specKey: "price",
    },
  ],
  verdict: { winnerIndex: 1, scores: [1, 1], tagline: "Too close to call." },
};

describe("buildNarrationScript", () => {
  it("produces one line for the hook, one per round, and one for the verdict", () => {
    const lines = buildNarrationScript(input);
    expect(lines.map((l) => l.id)).toEqual(["hook", "round-0", "round-1", "verdict"]);
  });

  it("mentions both contenders and names the round winner", () => {
    const lines = buildNarrationScript(input);
    const round0 = lines.find((l) => l.id === "round-0")!;
    expect(round0.text).toContain("GR Corolla");
    expect(round0.text).toContain("Civic Type R");
    expect(round0.text).toContain("Civic Type R takes this round.");
  });

  it("anchors lines in increasing timeline order", () => {
    const lines = buildNarrationScript(input);
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].anchorSec).toBeGreaterThan(lines[i - 1].anchorSec);
    }
  });

  it("uses the verdict tagline verbatim", () => {
    const lines = buildNarrationScript(input);
    expect(lines.find((l) => l.id === "verdict")!.text).toBe("Too close to call.");
  });
});
