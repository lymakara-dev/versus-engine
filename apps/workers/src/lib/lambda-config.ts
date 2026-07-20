/**
 * Shared config for Remotion Lambda (PROJECT_PLAN.md Phase 5 "Scale &
 * polish" / stack decision "renderMedia() locally -> Remotion Lambda at
 * scale"). AWS credentials are read by @remotion/lambda itself from
 * REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY (its own env
 * vars, deliberately distinct from AWS_* to avoid clashing with other AWS
 * SDKs) — nothing to wire up here beyond making sure they're set.
 */
import { getRegions, type AwsRegion } from "@remotion/lambda";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env var — see .env.example (Phase 5: Remotion Lambda)`);
  }
  return value;
}

export function isLambdaRenderTarget(): boolean {
  return process.env.RENDER_TARGET === "lambda";
}

export function getLambdaRegion(): AwsRegion {
  const region = process.env.REMOTION_AWS_REGION ?? "us-east-1";
  if (!(getRegions() as readonly string[]).includes(region)) {
    throw new Error(`REMOTION_AWS_REGION "${region}" is not a valid AWS region for Remotion Lambda`);
  }
  return region as AwsRegion;
}

export interface LambdaRenderConfig {
  region: AwsRegion;
  functionName: string;
  serveUrl: string;
}

/** Config needed to invoke an already-deployed function against an already-deployed site (used by the render worker). */
export function getLambdaRenderConfig(): LambdaRenderConfig {
  return {
    region: getLambdaRegion(),
    functionName: requireEnv("REMOTION_LAMBDA_FUNCTION_NAME"),
    serveUrl: requireEnv("REMOTION_LAMBDA_SERVE_URL"),
  };
}
