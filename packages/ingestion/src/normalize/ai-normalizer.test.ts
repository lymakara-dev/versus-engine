import { describe, expect, it } from "vitest";
import type { SpecDefinitionSeed } from "@versus-engine/shared";
import { normalizeRawSpecs, parseNormalizerResponse, type AnthropicLike } from "./ai-normalizer.js";

const specDefinitions: SpecDefinitionSeed[] = [
  {
    key: "battery_capacity",
    label: "Battery",
    unit: "mAh",
    dataType: "NUMBER",
    higherIsBetter: true,
    visualization: "BAR",
    priorityWeight: 1,
    sortOrder: 0,
  },
  {
    key: "has_5g",
    label: "5G",
    unit: null,
    dataType: "BOOLEAN",
    higherIsBetter: true,
    visualization: "BADGE",
    priorityWeight: 1,
    sortOrder: 1,
  },
];

function mockClient(responseText: string): AnthropicLike {
  return {
    messages: {
      create: async () => ({ content: [{ type: "text", text: responseText }] }),
    },
  };
}

describe("parseNormalizerResponse", () => {
  it("parses raw JSON", () => {
    expect(parseNormalizerResponse('[{"key":"a"}]')).toEqual([{ key: "a" }]);
  });

  it("strips markdown code fences", () => {
    expect(parseNormalizerResponse('```json\n[{"key":"a"}]\n```')).toEqual([{ key: "a" }]);
  });
});

describe("normalizeRawSpecs", () => {
  it("maps known keys, clamps confidence, and drops unknown keys", async () => {
    const client = mockClient(
      JSON.stringify([
        { key: "battery_capacity", numberValue: 3650, displayValue: "3,650 mAh", confidence: 0.99 },
        { key: "has_5g", boolValue: true, displayValue: "5G" },
        { key: "unknown_spec", textValue: "foo", displayValue: "foo" },
      ]),
    );

    const result = await normalizeRawSpecs({
      rawSpecs: { battery: "3650mAh", connectivity: "5G, WiFi 6" },
      specDefinitions,
      client,
    });

    expect(result).toHaveLength(2);

    const battery = result.find((r) => r.key === "battery_capacity")!;
    expect(battery.numberValue).toBe(3650);
    expect(battery.dataType).toBe("NUMBER");
    expect(battery.confidence).toBeLessThan(1); // AI output is never fully confident

    const has5g = result.find((r) => r.key === "has_5g")!;
    expect(has5g.boolValue).toBe(true);
    expect(has5g.dataType).toBe("BOOLEAN");
  });

  it("throws when the model returns no text content", async () => {
    const client: AnthropicLike = {
      messages: { create: async () => ({ content: [] }) },
    };
    await expect(
      normalizeRawSpecs({ rawSpecs: {}, specDefinitions, client }),
    ).rejects.toThrow(/no text content/);
  });
});
