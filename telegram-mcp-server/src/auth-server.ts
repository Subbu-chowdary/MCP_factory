/**
 * Auth Server
 *
 * Spins up a local HTTP server with a web UI for Telegram OTP verification.
 * Flow: Phone number → Send OTP → Verify code → (optional 2FA) → Session saved
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { saveSession } from "./session-manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// GramJS client state during auth
let client: TelegramClient | null = null;
let pendingPhoneCodeHash: string | null = null;

function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = parseInt(process.env.TG_API_ID || process.env.TELEGRAM_API_ID || "0", 10);
  const apiHash = process.env.TG_API_HASH || process.env.TELEGRAM_API_HASH || "";

  if (!apiId || !apiHash) {
    throw new Error(
      "Missing Telegram API credentials.\n" +
      "Set TG_API_ID and TG_API_HASH env vars.\n" +
      "Get them at: https://my.telegram.org/apps"
    );
  }
  return { apiId, apiHash };
}

async function handleAPI(req: IncomingMessage, res: ServerResponse, body: string): Promise<void> {
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.pathname;

  res.setHeader("Content-Type", "application/json");

  try {
    if (path === "/api/send-code" && req.method === "POST") {
      const { phone } = JSON.parse(body);
      if (!phone) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Phone number required" }));
        return;
      }

      const { apiId, apiHash } = getApiCredentials();
      client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
      });
      await client.connect();

      const result = await client.sendCode({ apiId, apiHash }, phone);
      pendingPhoneCodeHash = result.phoneCodeHash;

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, phoneCodeHash: result.phoneCodeHash }));

    } else if (path === "/api/verify-code" && req.method === "POST") {
      const { phone, code, phoneCodeHash } = JSON.parse(body);

      if (!client || !phone || !code) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing phone, code, or session expired. Restart the flow." }));
        return;
      }

      try {
        await client.invoke(
          new (await import("telegram/tl/index.js")).Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash || pendingPhoneCodeHash || "",
            phoneCode: code,
          })
        );

        // Success — save session
        const sessionStr = (client.session as StringSession).save();
        const me = await client.getMe();

        saveSession({
          stringSession: sessionStr,
          userId: me?.id?.toString(),
          username: (me as any)?.username || undefined,
          firstName: (me as any)?.firstName || undefined,
          connectedAt: new Date().toISOString(),
        });

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, username: (me as any)?.username }));
      } catch (err: any) {
        // Check if 2FA is needed
        if (err.message?.includes("SESSION_PASSWORD_NEEDED")) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "2FA password required", need2FA: true }));
          return;
        }
        throw err;
      }

    } else if (path === "/api/verify-2fa" && req.method === "POST") {
      const { password } = JSON.parse(body);

      if (!client || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing password or session expired" }));
        return;
      }

      // Use GramJS built-in 2FA sign-in
      await (client as any).signInWithPassword(
        { apiId: getApiCredentials().apiId, apiHash: getApiCredentials().apiHash },
        { password: () => Promise.resolve(password), onError: (e: any) => { throw e; } }
      );

      const sessionStr = (client.session as StringSession).save();
      const me = await client.getMe();

      saveSession({
        stringSession: sessionStr,
        userId: me?.id?.toString(),
        username: (me as any)?.username || undefined,
        firstName: (me as any)?.firstName || undefined,
        connectedAt: new Date().toISOString(),
      });

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, username: (me as any)?.username }));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err: any) {
    console.error("Auth API error:", err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message || "Internal error" }));
  }
}

function serveHTML(_req: IncomingMessage, res: ServerResponse): void {
  // Try to find auth.html - check multiple locations
  const candidates = [
    join(__dirname, "..", "public", "auth.html"),
    join(__dirname, "..", "..", "public", "auth.html"),
  ];

  for (const path of candidates) {
    try {
      const html = readFileSync(path, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    } catch {
      continue;
    }
  }

  // Fallback: inline minimal HTML
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<html><body><h2>Auth page not found. Check installation.</h2></body></html>`);
}

export function startAuthServer(port: number = 0): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", "http://localhost");

      if (url.pathname.startsWith("/api/")) {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => handleAPI(req, res, body));
      } else {
        serveHTML(req, res);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address() as any;
      const actualPort = addr.port;
      resolve({
        port: actualPort,
        close: () => {
          server.close();
          if (client) {
            client.disconnect().catch(() => {});
            client = null;
          }
        },
      });
    });

    server.on("error", reject);
  });
}

/**
 * Run auth flow: start server, open browser, wait for completion
 */
export async function runAuthFlow(): Promise<void> {
  const { apiId, apiHash } = getApiCredentials();
  console.error(`Telegram API ID: ${apiId}`);

  const { port, close } = await startAuthServer(0);
  const url = `http://localhost:${port}`;

  console.error(`\nTelegram auth server running at: ${url}`);
  console.error("Opening browser...\n");

  openBrowser(url);

  // Wait for session to be saved (poll every second, timeout 3 min)
  const { hasSession } = await import("./session-manager.js");
  const start = Date.now();
  while (!hasSession() && Date.now() - start < 180_000) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  close();

  if (hasSession()) {
    console.error("Telegram connected successfully!");
  } else {
    throw new Error("Auth flow timed out. Please try again.");
  }
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error(`Could not open browser. Visit: ${url}`);
    }
  });
}

// If run directly: start auth flow
if (process.argv[1]?.includes("auth-server")) {
  runAuthFlow().catch((e) => {
    console.error("Auth failed:", e.message);
    process.exit(1);
  });
}
