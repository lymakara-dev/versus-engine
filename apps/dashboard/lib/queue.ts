import { Queue } from "bullmq";
import IORedis from "ioredis";
import { RENDER_QUEUE_NAME } from "@versus-engine/shared";

const globalForQueue = globalThis as unknown as {
  renderQueue?: Queue;
  redisConnection?: IORedis;
};

function getConnection(): IORedis {
  globalForQueue.redisConnection ??= new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  return globalForQueue.redisConnection;
}

export function getRenderQueue(): Queue {
  globalForQueue.renderQueue ??= new Queue(RENDER_QUEUE_NAME, { connection: getConnection() });
  return globalForQueue.renderQueue;
}
