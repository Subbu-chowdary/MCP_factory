# @mcp_factory/reddit-mcp-server

MCP (Model Context Protocol) server for Reddit.

Browse subreddits, read and create posts, comment, vote, search, and manage messages - all through the MCP protocol.

## Installation

```bash
npx @mcp_factory/reddit-mcp-server
```

Or install globally:

```bash
npm install -g @mcp_factory/reddit-mcp-server
```

## Authentication (3 ways)

### Option 1: Built-in OAuth (recommended for standalone)
Set your Reddit app credentials and the server handles login automatically:
```bash
REDDIT_CLIENT_ID=your_app_client_id
REDDIT_CLIENT_SECRET=your_app_secret
```
On first run, it opens your browser to log in with Reddit. The token is cached at `~/.reddit-mcp/token.json` and auto-refreshes.

Create a Reddit app at https://www.reddit.com/prefs/apps (type: "web app", redirect URI: `http://localhost:PORT/callback`).

### Option 2: Direct token
```bash
REDDIT_ACCESS_TOKEN=your_token
```

### Option 3: MCP Bind / Wexa
Connect via [MCP Bind](https://mcpbind.com) for fully automatic OAuth — no env vars needed.

## Available Tools (29)

### User & Identity
| Tool | Description |
|------|-------------|
| `reddit_get_me` | Get authenticated user's profile |
| `reddit_get_my_karma` | Get karma breakdown by subreddit |
| `reddit_get_user` | Get public profile for any user |
| `reddit_get_user_posts` | Get posts submitted by a user |
| `reddit_get_user_comments` | Get comments made by a user |

### Subreddits
| Tool | Description |
|------|-------------|
| `reddit_get_subreddit` | Get subreddit info and subscriber count |
| `reddit_search_subreddits` | Search subreddits by name/description |
| `reddit_get_my_subreddits` | Get subscribed/contributed/moderated subreddits |
| `reddit_get_subreddit_rules` | Get subreddit rules |
| `reddit_subscribe` | Subscribe or unsubscribe from a subreddit |

### Posts & Listings
| Tool | Description |
|------|-------------|
| `reddit_get_hot_posts` | Get hot posts from a subreddit |
| `reddit_get_new_posts` | Get newest posts from a subreddit |
| `reddit_get_top_posts` | Get top posts (by time period) |
| `reddit_get_best_posts` | Get personalized best posts |
| `reddit_get_post_comments` | Get post with full comment tree |
| `reddit_submit_post` | Submit a text post or link |

### Voting & Saving
| Tool | Description |
|------|-------------|
| `reddit_vote` | Upvote, downvote, or unvote |
| `reddit_save` | Save a post or comment |
| `reddit_unsave` | Unsave a post or comment |

### Comments
| Tool | Description |
|------|-------------|
| `reddit_post_comment` | Reply to a post or comment |
| `reddit_edit_text` | Edit your own post or comment |
| `reddit_delete` | Delete your own post or comment |

### Search
| Tool | Description |
|------|-------------|
| `reddit_search` | Search all of Reddit |
| `reddit_search_in_subreddit` | Search within a specific subreddit |

### Messages
| Tool | Description |
|------|-------------|
| `reddit_get_messages` | Get inbox, unread, or sent messages |
| `reddit_send_message` | Send a private message |
| `reddit_mark_all_read` | Mark all messages as read |

### Utility
| Tool | Description |
|------|-------------|
| `reddit_get_info` | Look up things by fullname ID or URL |
| `reddit_get_flair_options` | Get available post flair for a subreddit |

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["-y", "@mcp_factory/reddit-mcp-server"],
      "env": {
        "REDDIT_CLIENT_ID": "your_app_client_id",
        "REDDIT_CLIENT_SECRET": "your_app_secret"
      }
    }
  }
}
```
On first use, your browser opens to authorize with Reddit. After that, the token auto-refreshes.

## Usage with MCP Bind / Wexa

This server is available on [MCP Bind](https://mcpbind.com). Connect it to your Wexa workspace for automatic OAuth handling and seamless integration.

## License

MIT
