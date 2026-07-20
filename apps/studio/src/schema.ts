import { z } from "zod";

export const visualizationSchema = z.enum(["bar", "gauge", "counter", "badge"]);
export type Visualization = z.infer<typeof visualizationSchema>;

export const contenderSchema = z.object({
  name: z.string(),
  brand: z.string(),
  price: z.string(),
  imageUrl: z.string(),
  logoUrl: z.string(),
  accentColor: z.string(),
});
export type Contender = z.infer<typeof contenderSchema>;

export const roundSchema = z
  .object({
    label: z.string(),
    icon: z.string(),
    visualization: visualizationSchema,
    unit: z.string().nullable(),
    higherIsBetter: z.boolean(),
    values: z.array(z.number()),
    displayValues: z.array(z.string()),
    winnerIndex: z.number().int().nullable(),
    sfx: z.string().optional(),
  })
  .refine((round) => round.values.length === round.displayValues.length, {
    message: "values and displayValues must be parallel arrays of equal length",
  });
export type Round = z.infer<typeof roundSchema>;

export const verdictSchema = z.object({
  winnerIndex: z.number().int().nullable(),
  scores: z.array(z.number().int()),
  tagline: z.string(),
  sfx: z.string().optional(),
});
export type Verdict = z.infer<typeof verdictSchema>;

export const videoInputSchema = z
  .object({
    meta: z.object({
      title: z.string(),
      category: z.string(),
      theme: z.string(),
      aspect: z.enum(["16:9", "9:16"]).default("16:9"),
      fps: z.number().int().positive().default(30),
      resolution: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    }),
    music: z.object({
      src: z.string(),
      loop: z.boolean(),
      volumeDb: z.number(),
    }),
    contenders: z.array(contenderSchema).min(2),
    rounds: z.array(roundSchema).min(1),
    verdict: verdictSchema,
  })
  .refine(
    (input) =>
      input.rounds.every(
        (round) =>
          round.values.length === input.contenders.length &&
          round.displayValues.length === input.contenders.length,
      ),
    { message: "each round's values/displayValues must have one entry per contender" },
  )
  .refine((input) => input.verdict.scores.length === input.contenders.length, {
    message: "verdict.scores must have one entry per contender",
  });

export type VideoInput = z.infer<typeof videoInputSchema>;

export function parseVideoInput(data: unknown): VideoInput {
  const result = videoInputSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid VideoInput payload:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return result.data;
}
