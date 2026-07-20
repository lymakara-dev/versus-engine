import { z } from "zod";

/** BullMQ queue name shared between the render worker (producer, on completion) and the publish worker (consumer). */
export const PUBLISH_QUEUE_NAME = "publish";

export const publishJobPayloadSchema = z.object({
  uploadId: z.string(),
  comparisonId: z.string(),
});
export type PublishJobPayload = z.infer<typeof publishJobPayloadSchema>;
