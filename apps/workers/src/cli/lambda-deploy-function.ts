#!/usr/bin/env node
/**
 * `pnpm lambda:deploy-function` — one-time (or upgrade-time) deploy of the
 * Remotion Lambda render function itself (PROJECT_PLAN.md Phase 5). Requires
 * REMOTION_AWS_ACCESS_KEY_ID/REMOTION_AWS_SECRET_ACCESS_KEY to already be
 * set in .env, and the `remotion-lambda-role`/`remotion-lambda-policy` IAM
 * setup to already exist in the AWS account (see the Remotion Lambda docs —
 * `npx remotion lambda policies role` / `npx remotion lambda policies user`).
 */
import { deployFunction } from "@remotion/lambda";
import { getLambdaRegion } from "../lib/lambda-config.js";

async function main() {
  const region = getLambdaRegion();
  const { functionName } = await deployFunction({
    region,
    timeoutInSeconds: 240,
    memorySizeInMb: 2048,
    createCloudWatchLogGroup: true,
  });

  console.log(`Deployed Lambda function "${functionName}" in ${region}.\n`);
  console.log("Add this to your .env:\n");
  console.log(`REMOTION_LAMBDA_FUNCTION_NAME="${functionName}"`);
  console.log(`REMOTION_AWS_REGION="${region}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
