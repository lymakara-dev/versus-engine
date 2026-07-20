import { Queue } from "bullmq";
import IORedis from "ioredis";
import { PUBLISH_QUEUE_NAME } from "@versus-engine/shared";

let connection: IORedis | null = null;
let queue: Queue | null = null;

/** Producer-side handle used by the render worker to enqueue a publish job once a render completes. */
export function getPublishQueue(): Queue {
  connection ??= new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
  queue ??= new Queue(PUBLISH_QUEUE_NAME, { connection });
  return queue;
}
