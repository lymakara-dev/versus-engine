import { google, type youtube_v3 } from "googleapis";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env var — see .env.example (Phase 4: YouTube Data API v3)`);
  }
  return value;
}

/** OAuth2 client with only client id/secret/redirect wired up — used by `pnpm youtube:auth` to mint a refresh token. */
export function getOAuthClient(): InstanceType<typeof google.auth.OAuth2> {
  return new google.auth.OAuth2(
    requireEnv("YOUTUBE_CLIENT_ID"),
    requireEnv("YOUTUBE_CLIENT_SECRET"),
    requireEnv("YOUTUBE_REDIRECT_URI"),
  );
}

/** Authenticated YouTube Data API v3 client for the publish worker — requires YOUTUBE_REFRESH_TOKEN from `pnpm youtube:auth`. */
export function getYoutubeClient(): youtube_v3.Youtube {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: requireEnv("YOUTUBE_REFRESH_TOKEN") });
  return google.youtube({ version: "v3", auth: oauth2Client });
}
