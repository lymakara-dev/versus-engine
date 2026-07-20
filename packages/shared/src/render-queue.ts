import { z } from "zod";

/** BullMQ queue name shared between the dashboard (producer) and the render worker (consumer). */
export const RENDER_QUEUE_NAME = "render";

export const compositionIdSchema = z.enum(["Comparison16x9", "ComparisonShort9x16"]);
export type CompositionId = z.infer<typeof compositionIdSchema>;

export const renderJobPayloadSchema = z.object({
  renderJobId: z.string(),
  comparisonId: z.string(),
  composition: compositionIdSchema,
});
export type RenderJobPayload = z.infer<typeof renderJobPayloadSchema>;
