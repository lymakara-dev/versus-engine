#!/usr/bin/env node
/** `pnpm worker` — long-running BullMQ consumer for the render queue (PROJECT_PLAN.md §3 RENDER worker). */
import { startRenderWorker } from "../workers/render-worker.js";

const worker = startRenderWorker();
console.log("Render worker listening for jobs...");

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
