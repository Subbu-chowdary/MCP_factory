#!/usr/bin/env node

// GramJS writes colored logs to stdout which corrupts MCP JSON-RPC protocol.
// Redirect ALL console.log to stderr before any imports.
const _origLog = console.log;
console.log = (...args: unknown[]) => console.error(...args);

/**
 * Telegram MCP Server
 *
 * MCP server for Telegram via MTProto (GramJS).
 * Supports: read chats, send messages, search, contacts, forward, pin, delete.
 *
 * Auth: Built-in OTP flow with local web UI.
 *   - First run opens browser for phone + OTP verification
 *   - Session cached at ~/.telegram-mcp/session.json
 *   - Subsequent runs use cached session (no login needed)
 *
 * Usage:
 *   TG_API_ID=xxx TG_API_HASH=yyy npx @mcp_factory/telegram-mcp-server
 *
 * Auth only:
 *   TG_API_ID=xxx TG_API_HASH=yyy npx @mcp_factory/telegram-mcp-server auth
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getTools, handleToolCall } from "./tools.js";
import { hasSession } from "./session-manager.js";
import { runAuthFlow } from "./auth-server.js";

const SERVER_NAME = "telegram-mcp-server";
const SERVER_VERSION = "1.0.0";

async function main() {
  const args = process.argv.slice(2);

  // `auth` subcommand: run auth flow only
  if (args[0] === "auth") {
    await runAuthFlow();
    process.exit(0);
  }

  // Check for session
  if (!hasSession()) {
    // Only run interactive auth if launched from terminal (not as MCP subprocess)
    if (process.stdin.isTTY) {
      console.error("No Telegram session found. Starting auth flow...");
      await runAuthFlow();
    } else {
      console.error("No Telegram session found. Set TG_SESSION env var or run: npx @mcp_factory/telegram-mcp-server auth");
    }
  }

  // Create MCP server
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getTools() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    try {
      const result = await handleToolCall(name, toolArgs || {});
      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { main };
