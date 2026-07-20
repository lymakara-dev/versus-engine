#!/usr/bin/env node
/** `pnpm worker` — long-running BullMQ consumers for the render + publish queues (PROJECT_PLAN.md §3 RENDER/PUBLISHER workers). */
import { startRenderWorker } from "../workers/render-worker.js";
import { startPublishWorker } from "../workers/publish-worker.js";

const renderWorker = startRenderWorker();
const publishWorker = startPublishWorker();
console.log("Render + publish workers listening for jobs...");

async function shutdown() {
  await Promise.all([renderWorker.close(), publishWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
