# MCP Factory - MCP Servers

Production-ready MCP (Model Context Protocol) servers published under [@mcp_factory](https://www.npmjs.com/~mcp_factory) on npm.

## Servers

### [@mcp_factory/reddit-mcp-server](https://www.npmjs.com/package/@mcp_factory/reddit-mcp-server)

MCP server for Reddit — browse subreddits, read/create posts, comment, vote, search, and manage messages.

- **29 tools** — posts, comments, voting, search, messages, subreddits, user profiles, flair
- **Auth**: OAuth 2.0 with built-in browser login flow
- **Install**: `npx @mcp_factory/reddit-mcp-server`

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["-y", "@mcp_factory/reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "your_client_id",
        "REDDIT_CLIENT_SECRET": "your_secret"
      }
    }
  }
}
```

### [@mcp_factory/telegram-mcp-server](https://www.npmjs.com/package/@mcp_factory/telegram-mcp-server)

MCP server for Telegram via MTProto — read chats, send messages, search, manage contacts.

- **11 tools** — chats, messages, contacts, search, forward, pin, delete
- **Auth**: MTProto with built-in OTP web UI (phone + verification code)
- **Install**: `npx @mcp_factory/telegram-mcp-server`

```json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["-y", "@mcp_factory/telegram-mcp-server"],
      "env": {
        "TG_API_ID": "your_api_id",
        "TG_API_HASH": "your_api_hash"
      }
    }
  }
}
```

First run opens a browser for phone + OTP verification. Session is cached locally.

## Auth Types

| Server | Auth | How it works |
|--------|------|-------------|
| Reddit | OAuth 2.0 | Browser opens → authorize on reddit.com → token cached |
| Telegram | MTProto OTP | Browser opens → enter phone + OTP → session cached |

Both servers also work with **MCP Bind / Wexa** for automatic credential management (vault-based, no local files).

## npm

Published under account: [mcp_factory](https://www.npmjs.com/~mcp_factory)

## License

MIT
