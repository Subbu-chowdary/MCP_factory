/**
 * Built-in Reddit OAuth flow for standalone usage.
 *
 * When no REDDIT_ACCESS_TOKEN is set, this module:
 * 1. Checks for a cached token in ~/.reddit-mcp/token.json
 * 2. If expired, refreshes it automatically
 * 3. If no token exists, spins up a local HTTP server on a random port,
 *    opens the browser to Reddit's auth page, waits for the callback,
 *    exchanges the code for tokens, and caches them.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { exec } from "child_process";

const TOKEN_DIR = join(homedir(), ".reddit-mcp");
const TOKEN_FILE = join(TOKEN_DIR, "token.json");

const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

const SCOPES = [
  "identity", "read", "submit", "edit", "vote", "save",
  "subscribe", "mysubreddits", "privatemessages", "history", "flair", "report",
];

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch ms
  token_type?: string;
  scope?: string;
}

/**
 * Get a valid Reddit access token.
 * Priority: env var > cached token (refresh if needed) > interactive OAuth flow
 */
export async function getAccessToken(): Promise<string> {
  // 1. Check env var first (MCP Bind / manual setup)
  const envToken = process.env.REDDIT_ACCESS_TOKEN;
  if (envToken) return envToken;

  // 2. Check cached token
  const cached = loadCachedToken();
  if (cached) {
    // If not expired, use it
    if (cached.expires_at && cached.expires_at > Date.now() + 60_000) {
      return cached.access_token;
    }
    // Try refresh
    if (cached.refresh_token) {
      const refreshed = await refreshToken(cached.refresh_token);
      if (refreshed) return refreshed.access_token;
    }
  }

  // 3. Interactive OAuth flow
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "No REDDIT_ACCESS_TOKEN set and no REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET for OAuth flow.\n" +
      "Either:\n" +
      "  1. Set REDDIT_ACCESS_TOKEN env var directly, or\n" +
      "  2. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to enable OAuth login, or\n" +
      "  3. Use MCP Bind (mcpbind.com) for automatic OAuth"
    );
  }

  console.error("No Reddit token found. Starting OAuth login flow...");
  const token = await runOAuthFlow(clientId, clientSecret);
  return token.access_token;
}

function loadCachedToken(): TokenData | null {
  try {
    if (!existsSync(TOKEN_FILE)) return null;
    const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    if (data.access_token) return data as TokenData;
    return null;
  } catch {
    return null;
  }
}

function saveCachedToken(token: TokenData): void {
  if (!existsSync(TOKEN_DIR)) {
    mkdirSync(TOKEN_DIR, { recursive: true });
  }
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), { mode: 0o600 });
}

async function refreshToken(refreshTokenStr: string): Promise<TokenData | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
    });

    const response = await fetch(REDDIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
        "User-Agent": "mcp-factory:reddit-mcp-server:1.0.0",
      },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;
    const token: TokenData = {
      access_token: data.access_token as string,
      refresh_token: (data.refresh_token as string) || refreshTokenStr,
      expires_at: Date.now() + ((data.expires_in as number) || 3600) * 1000,
      token_type: data.token_type as string,
      scope: data.scope as string,
    };

    saveCachedToken(token);
    console.error("Reddit token refreshed successfully.");
    return token;
  } catch {
    return null;
  }
}

async function runOAuthFlow(clientId: string, clientSecret: string): Promise<TokenData> {
  return new Promise((resolve, reject) => {
    const state = randomBytes(16).toString("hex");

    // Start local server on random port
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "/", `http://localhost`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<html><body><h2>Reddit OAuth Error</h2><p>${error}</p><p>You can close this tab.</p></body></html>`);
        server.close();
        reject(new Error(`Reddit OAuth error: ${error}`));
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<html><body><h2>Invalid callback</h2><p>Missing code or state mismatch.</p></body></html>`);
        server.close();
        reject(new Error("Invalid OAuth callback"));
        return;
      }

      // Exchange code for token
      const redirectUri = `http://localhost:${(server.address() as any).port}/callback`;
      exchangeCode(clientId, clientSecret, code, redirectUri)
        .then((token) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<html><body style="font-family:sans-serif;text-align:center;padding:40px">` +
            `<h2>Reddit Connected!</h2>` +
            `<p>You can close this tab and return to your terminal.</p>` +
            `</body></html>`
          );
          server.close();
          resolve(token);
        })
        .catch((err) => {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>Token exchange failed</h2><p>${err.message}</p></body></html>`);
          server.close();
          reject(err);
        });
    });

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      const redirectUri = `http://localhost:${port}/callback`;

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        state,
        redirect_uri: redirectUri,
        duration: "permanent",
        scope: SCOPES.join(" "),
      });

      const authUrl = `${REDDIT_AUTH_URL}?${params.toString()}`;

      console.error(`\nOpening browser for Reddit login...`);
      console.error(`If browser doesn't open, visit:\n${authUrl}\n`);

      openBrowser(authUrl);

      // Timeout after 2 minutes
      setTimeout(() => {
        server.close();
        reject(new Error("OAuth flow timed out after 2 minutes"));
      }, 120_000);
    });
  });
}

async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<TokenData> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      "User-Agent": "mcp-factory:reddit-mcp-server:1.0.0",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (!data.access_token) {
    throw new Error(`Reddit returned no access_token: ${JSON.stringify(data)}`);
  }

  const token: TokenData = {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string | undefined,
    expires_at: Date.now() + ((data.expires_in as number) || 3600) * 1000,
    token_type: data.token_type as string,
    scope: data.scope as string,
  };

  saveCachedToken(token);
  console.error("Reddit OAuth successful! Token cached at ~/.reddit-mcp/token.json");
  return token;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.error("Could not open browser automatically.");
  });
}
