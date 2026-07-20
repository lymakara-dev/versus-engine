import { google, type youtubeAnalytics_v2 } from "googleapis";
import { getOAuthClient, requireEnv } from "./youtube-client.js";

/**
 * YouTube Analytics API v2 client (Phase 5 analytics feedback loop), sharing
 * the same OAuth app/refresh token as the publish worker's Data API v3
 * client — the yt-analytics.readonly scope is requested alongside
 * youtube.upload in `pnpm youtube:auth` (see youtube-auth.ts).
 */
export function getYoutubeAnalyticsClient(): youtubeAnalytics_v2.Youtubeanalytics {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: requireEnv("YOUTUBE_REFRESH_TOKEN") });
  return google.youtubeAnalytics({ version: "v2", auth: oauth2Client });
}
