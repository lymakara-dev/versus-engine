/**
 * AI-generated title/description/tags/tagline for a comparison (PROJECT_PLAN.md
 * §6 step 2). Follows the same AnthropicLike-interface pattern as
 * packages/ingestion/src/normalize/ai-normalizer.ts so it's testable without a
 * live API key, plus a deterministic fallback for when no client is configured.
 */
import { z } from "zod";

export interface AnthropicLike {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export interface MetadataContender {
  name: string;
  brand: string;
  price: string;
}

export interface MetadataRound {
  label: string;
  displayValues: string[];
  winnerIndex: number | null;
}

export interface GenerateMetadataInput {
  category: string;
  contenders: MetadataContender[];
  rounds: MetadataRound[];
  verdict: { winnerIndex: number | null; scores: number[] };
}

const comparisonMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).min(1),
  tagline: z.string(),
});
export type ComparisonMetadata = z.infer<typeof comparisonMetadataSchema>;

export function buildMetadataPrompt(input: GenerateMetadataInput): string {
  return [
    "You write YouTube metadata for a faceless product-comparison channel. Given the",
    "category, contenders, per-round results, and final verdict below, return ONLY a",
    "JSON object with these keys:",
    '  "title": a punchy YouTube title under 100 characters (e.g. "GR Corolla vs Civic Type R — There\'s a Clear Winner")',
    '  "description": a 2-4 sentence YouTube description summarizing the matchup and verdict',
    '  "tags": an array of 8-15 lowercase YouTube search tags',
    '  "tagline": a single on-screen verdict line under 90 characters, shown during the winner reveal',
    "",
    `Category: ${input.category}`,
    "Contenders:",
    JSON.stringify(input.contenders, null, 2),
    "Round results:",
    JSON.stringify(input.rounds, null, 2),
    "Verdict:",
    JSON.stringify(input.verdict, null, 2),
  ].join("\n");
}

export function parseMetadataResponse(responseText: string): unknown {
  const trimmed = responseText.trim();
  const jsonText = trimmed.startsWith("```") ? trimmed.replace(/^```(json)?/, "").replace(/```$/, "").trim() : trimmed;
  return JSON.parse(jsonText);
}

export interface GenerateComparisonMetadataOptions {
  input: GenerateMetadataInput;
  client: AnthropicLike;
  model?: string;
}

export async function generateComparisonMetadata(options: GenerateComparisonMetadataOptions): Promise<ComparisonMetadata> {
  const { input, client, model = "claude-sonnet-5" } = options;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildMetadataPrompt(input) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("AI metadata response had no text content");
  }

  return comparisonMetadataSchema.parse(parseMetadataResponse(textBlock.text));
}

/** Deterministic metadata used when no Anthropic client is configured (e.g. local dev without an API key). */
export function fallbackComparisonMetadata(input: GenerateMetadataInput): ComparisonMetadata {
  const names = input.contenders.map((c) => c.name);
  const matchup = names.join(" vs ");
  const winnerName = input.verdict.winnerIndex !== null ? names[input.verdict.winnerIndex] : null;
  const scoreLine = input.verdict.scores.join("–");

  const title = winnerName ? `${matchup} — ${winnerName} Wins` : `${matchup} — Too Close to Call`;
  const tagline = winnerName
    ? `${winnerName} takes it, ${scoreLine} on points.`
    : `Dead heat, ${scoreLine} on points — it comes down to what matters to you.`;

  const roundLabels = input.rounds.map((r) => r.label).join(", ");
  const description = `${matchup}: a head-to-head ${input.category} comparison across ${input.rounds.length} rounds — ${roundLabels}. ${tagline}`;

  const tags = Array.from(
    new Set([
      input.category,
      "comparison",
      "vs",
      ...names.flatMap((name) => name.toLowerCase().split(/\s+/)),
      ...input.contenders.map((c) => c.brand.toLowerCase()),
    ]),
  ).filter(Boolean);

  return { title, description, tags, tagline };
}
