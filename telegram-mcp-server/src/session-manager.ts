/**
 * Session Manager
 *
 * Stores and retrieves Telegram MTProto sessions securely.
 * Sessions are saved at ~/.telegram-mcp/session.json (chmod 600).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const SESSION_DIR = join(homedir(), ".telegram-mcp");
const SESSION_FILE = join(SESSION_DIR, "session.json");

export interface SessionData {
  stringSession: string;
  userId?: string;
  username?: string;
  firstName?: string;
  connectedAt?: string;
}

export function loadSession(): SessionData | null {
  // Priority 1: TG_SESSION env var (injected by MCP Bind / Wexa backend)
  const envSession = process.env.TG_SESSION;
  if (envSession && envSession.length > 10) {
    return { stringSession: envSession };
  }

  // Priority 2: Local file
  try {
    if (!existsSync(SESSION_FILE)) return null;
    const raw = readFileSync(SESSION_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (data.stringSession) return data as SessionData;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(data: SessionData): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
  writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function deleteSession(): void {
  if (existsSync(SESSION_FILE)) {
    writeFileSync(SESSION_FILE, "{}", { mode: 0o600 });
  }
}

export function hasSession(): boolean {
  // Check env var first (MCP Bind / Wexa injects TG_SESSION)
  if (process.env.TG_SESSION && process.env.TG_SESSION.length > 10) return true;
  // Then check local file
  const session = loadSession();
  return session !== null && session.stringSession.length > 0;
}

export function getSessionDir(): string {
  return SESSION_DIR;
}
