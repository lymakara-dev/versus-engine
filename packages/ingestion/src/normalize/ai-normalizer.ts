/**
 * Maps a product's raw, messy `specs` blob onto a category's canonical
 * SpecDefinition keys using Claude. Output confidence is always < 1 and the
 * caller must keep the owning Product at ProductStatus.DRAFT until a human
 * approves it in the dashboard (CLAUDE.md "Data conventions").
 */
import type { NormalizedSpecValue, SpecDefinitionSeed } from "@versus-engine/shared";
import { normalizedSpecValueSchema } from "@versus-engine/shared";
import { z } from "zod";

/** Narrow slice of the Anthropic SDK client we actually call — keeps this testable without a real API key. */
export interface AnthropicLike {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

const AI_RESPONSE_MAX_CONFIDENCE = 0.9;

const aiSpecOutputSchema = z.array(
  z.object({
    key: z.string(),
    numberValue: z.number().nullable().optional(),
    textValue: z.string().nullable().optional(),
    boolValue: z.boolean().nullable().optional(),
    displayValue: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  }),
);

export interface NormalizeRawSpecsOptions {
  rawSpecs: Record<string, unknown>;
  specDefinitions: SpecDefinitionSeed[];
  client: AnthropicLike;
  model?: string;
}

export function buildNormalizerPrompt(rawSpecs: Record<string, unknown>, specDefinitions: SpecDefinitionSeed[]): string {
  return [
    "You normalize messy product specs into a canonical schema for a comparison-video generator.",
    "Given the raw specs and the target SpecDefinitions below, return a JSON array where each element maps",
    "one SpecDefinition key to a value extracted/converted from the raw specs. Convert units to match the",
    "SpecDefinition's `unit` field. Skip SpecDefinitions you cannot confidently fill. Respond with ONLY the JSON array.",
    "",
    "SpecDefinitions:",
    JSON.stringify(specDefinitions, null, 2),
    "",
    "Raw specs:",
    JSON.stringify(rawSpecs, null, 2),
  ].join("\n");
}

/** Pulls the first text block out of an Anthropic response and parses it as JSON. */
export function parseNormalizerResponse(responseText: string): unknown {
  const trimmed = responseText.trim();
  const jsonText = trimmed.startsWith("```") ? trimmed.replace(/^```(json)?/, "").replace(/```$/, "").trim() : trimmed;
  return JSON.parse(jsonText);
}

export async function normalizeRawSpecs(options: NormalizeRawSpecsOptions): Promise<NormalizedSpecValue[]> {
  const { rawSpecs, specDefinitions, client, model = "claude-sonnet-5" } = options;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: buildNormalizerPrompt(rawSpecs, specDefinitions) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("AI normalizer response had no text content");
  }

  const parsed = aiSpecOutputSchema.parse(parseNormalizerResponse(textBlock.text));
  const specDefsByKey = new Map(specDefinitions.map((def) => [def.key, def]));

  return parsed
    .filter((entry) => specDefsByKey.has(entry.key))
    .map((entry) => {
      const specDef = specDefsByKey.get(entry.key)!;
      const confidence = Math.min(entry.confidence ?? AI_RESPONSE_MAX_CONFIDENCE, AI_RESPONSE_MAX_CONFIDENCE);
      return normalizedSpecValueSchema.parse({
        key: entry.key,
        dataType: specDef.dataType,
        numberValue: entry.numberValue ?? null,
        textValue: entry.textValue ?? null,
        boolValue: entry.boolValue ?? null,
        displayValue: entry.displayValue,
        confidence,
      });
    });
}
