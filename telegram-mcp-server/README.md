# @mcp_factory/telegram-mcp-server

MCP server for Telegram with built-in MTProto authentication.

Read chats, send messages, search across conversations, manage contacts, forward, pin, and delete messages - all through MCP.

## Setup (one time)

### 1. Get Telegram API credentials
Go to https://my.telegram.org/apps and create an app. Copy the `api_id` and `api_hash`.

### 2. Run auth
```bash
TG_API_ID=12345 TG_API_HASH=abc123 npx @mcp_factory/telegram-mcp-server auth
```

A browser window opens where you:
1. Enter your phone number
2. Enter the OTP code from Telegram
3. (If 2FA enabled) Enter your password

Session is saved to `~/.telegram-mcp/session.json`. You only do this once.

## Usage

```bash
TG_API_ID=12345 TG_API_HASH=abc123 npx @mcp_factory/telegram-mcp-server
```

Or in Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["-y", "@mcp_factory/telegram-mcp-server"],
      "env": {
        "TG_API_ID": "12345",
        "TG_API_HASH": "abc123"
      }
    }
  }
}
```

On first run with no session, the browser opens automatically for login.

## Available Tools (11)

| Tool | Description |
|------|-------------|
| `telegram_get_me` | Get connected user's profile |
| `telegram_list_chats` | List recent chats with unread counts |
| `telegram_get_messages` | Get messages from a chat |
| `telegram_send_message` | Send a message to any chat |
| `telegram_search_messages` | Search messages (in chat or globally) |
| `telegram_get_contacts` | Get contact list |
| `telegram_get_chat_info` | Get chat/group/channel details |
| `telegram_mark_read` | Mark chat as read |
| `telegram_forward_message` | Forward messages between chats |
| `telegram_delete_messages` | Delete messages |
| `telegram_pin_message` | Pin a message in chat |

## Auth Types

| Context | How it works |
|---------|-------------|
| **Standalone** | Built-in web UI: phone + OTP + optional 2FA |
| **MCP Bind / Wexa** | Backend handles MTProto session via `/telegram/sendCode` and `/telegram/verifyCode` APIs |

## Security

- Session stored locally at `~/.telegram-mcp/session.json` (file permissions: 600)
- No data sent to third-party servers
- Session = full account access - treat it like a password
- Only runs on `127.0.0.1` during auth (not exposed to network)

## License

MIT
