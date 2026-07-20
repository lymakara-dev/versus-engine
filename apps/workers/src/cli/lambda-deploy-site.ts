#!/usr/bin/env node
/**
 * `pnpm lambda:deploy-site` — bundles apps/studio and uploads it to the
 * Remotion Lambda S3 bucket (PROJECT_PLAN.md Phase 5). Run this again after
 * every studio change that should ship to Lambda renders; the render worker
 * always renders whatever's at REMOTION_LAMBDA_SERVE_URL, so a stale deploy
 * silently serves an old template.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploySite, getOrCreateBucket } from "@remotion/lambda";
import { getLambdaRegion } from "../lib/lambda-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const studioEntryPoint = path.resolve(repoRoot, "apps/studio/src/index.ts");
const SITE_NAME = "versus-engine";

async function main() {
  const region = getLambdaRegion();
  const { bucketName } = await getOrCreateBucket({ region });

  const { serveUrl } = await deploySite({
    bucketName,
    region,
    siteName: SITE_NAME,
    entryPoint: studioEntryPoint,
  });

  console.log(`Deployed site "${SITE_NAME}" to bucket ${bucketName} in ${region}.\n`);
  console.log("Add this to your .env:\n");
  console.log(`REMOTION_LAMBDA_SERVE_URL="${serveUrl}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
