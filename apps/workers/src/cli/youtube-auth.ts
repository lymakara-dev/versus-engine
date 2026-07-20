#!/usr/bin/env node
/**
 * `pnpm youtube:auth` — one-time interactive OAuth flow to mint a
 * YOUTUBE_REFRESH_TOKEN for the publish worker. Requires YOUTUBE_CLIENT_ID,
 * YOUTUBE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI (a loopback URL, e.g.
 * http://localhost:8765/oauth2callback — must also be registered as an
 * authorized redirect URI on the OAuth client in Google Cloud Console) to
 * already be set in .env.
 */
import http from "node:http";

// yt-analytics.readonly (Phase 5) powers `pnpm analytics:sync` — re-run this
// command if an existing refresh token predates that scope being added.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

async function main() {
  const { getOAuthClient } = await import("../lib/youtube-client.js");
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error(
      "Set YOUTUBE_REDIRECT_URI in .env first, e.g. http://localhost:8765/oauth2callback",
    );
  }
  const redirectUrl = new URL(redirectUri);
  const port = Number(redirectUrl.port) || 80;

  const oauth2Client = getOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces Google to re-issue a refresh_token even if this app was previously authorized
    scope: SCOPES,
  });

  console.log("1. Visit this URL and authorize the app:\n");
  console.log(authUrl);
  console.log(`\n2. Waiting for the OAuth redirect on ${redirectUri} ...`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", redirectUri);
      if (url.pathname !== redirectUrl.pathname) {
        res.writeHead(404).end();
        return;
      }
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(error ? `<h1>Authorization failed: ${error}</h1>` : "<h1>Authorized — you can close this tab.</h1>");
      server.close();
      if (error) reject(new Error(error));
      else if (authCode) resolve(authCode);
      else reject(new Error("OAuth callback did not include a code"));
    });
    server.listen(port);
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh_token. Revoke prior access at https://myaccount.google.com/permissions and re-run this command.",
    );
  }

  console.log("\nSuccess! Add this to your .env:\n");
  console.log(`YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
