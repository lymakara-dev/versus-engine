import { Queue } from "bullmq";
import IORedis from "ioredis";
import { RENDER_QUEUE_NAME } from "@versus-engine/shared";

let connection: IORedis | null = null;
let queue: Queue | null = null;

/** Producer-side handle used by `pnpm batch` to enqueue render jobs (mirrors apps/dashboard/lib/queue.ts). */
export function getRenderQueue(): Queue {
  connection ??= new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
  queue ??= new Queue(RENDER_QUEUE_NAME, { connection });
  return queue;
}
