import { describe, expect, it } from "vitest";
import {
  fallbackComparisonMetadata,
  generateComparisonMetadata,
  parseMetadataResponse,
  type AnthropicLike,
  type GenerateMetadataInput,
} from "./metadata.js";

const input: GenerateMetadataInput = {
  category: "cars",
  contenders: [
    { name: "GR Corolla", brand: "Toyota", price: "$39,995" },
    { name: "Civic Type R", brand: "Honda", price: "$45,895" },
  ],
  rounds: [
    { label: "Horsepower", displayValues: ["300 hp", "315 hp"], winnerIndex: 1 },
    { label: "0–100 km/h", displayValues: ["4.9 s", "5.3 s"], winnerIndex: 0 },
  ],
  verdict: { winnerIndex: 1, scores: [3, 3] },
};

function mockClient(responseText: string): AnthropicLike {
  return {
    messages: {
      create: async () => ({ content: [{ type: "text", text: responseText }] }),
    },
  };
}

describe("parseMetadataResponse", () => {
  it("parses raw JSON", () => {
    expect(parseMetadataResponse('{"title":"a"}')).toEqual({ title: "a" });
  });

  it("strips markdown code fences", () => {
    expect(parseMetadataResponse('```json\n{"title":"a"}\n```')).toEqual({ title: "a" });
  });
});

describe("generateComparisonMetadata", () => {
  it("returns parsed metadata from the model response", async () => {
    const client = mockClient(
      JSON.stringify({
        title: "GR Corolla vs Civic Type R — There's a Clear Winner",
        description: "Two hot hatches go head to head.",
        tags: ["cars", "toyota", "honda"],
        tagline: "Dead heat on points — but the Type R takes it.",
      }),
    );

    const result = await generateComparisonMetadata({ input, client });
    expect(result.title).toContain("Clear Winner");
    expect(result.tags).toContain("toyota");
  });

  it("throws when the model returns no text content", async () => {
    const client: AnthropicLike = { messages: { create: async () => ({ content: [] }) } };
    await expect(generateComparisonMetadata({ input, client })).rejects.toThrow(/no text content/);
  });
});

describe("fallbackComparisonMetadata", () => {
  it("names the winner when there is one", () => {
    const result = fallbackComparisonMetadata(input);
    expect(result.title).toContain("Civic Type R Wins");
    expect(result.tagline).toContain("Civic Type R");
  });

  it("handles an overall tie", () => {
    const tied: GenerateMetadataInput = { ...input, verdict: { winnerIndex: null, scores: [3, 3] } };
    const result = fallbackComparisonMetadata(tied);
    expect(result.title).toContain("Too Close to Call");
  });

  it("produces deduplicated lowercase tags", () => {
    const result = fallbackComparisonMetadata(input);
    expect(result.tags).toContain("toyota");
    expect(result.tags).toContain("honda");
    expect(new Set(result.tags).size).toBe(result.tags.length);
  });
});
