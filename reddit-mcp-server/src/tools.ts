/**
 * Tool definitions and handlers for Reddit MCP Server
 *
 * 29 tools covering: user profiles, subreddits, posts, comments,
 * voting, saving, search, messages, and flair.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { APIClient } from "./api-client.js";

const tools: Tool[] = [
  // === User / Identity ===
  {
    name: "reddit_get_me",
    description: "Get the authenticated user's profile including username, karma, and account details",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "reddit_get_my_karma",
    description: "Get karma breakdown by subreddit for the authenticated user",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "reddit_get_user",
    description: "Get public profile information for a Reddit user",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Reddit username" },
      },
      required: ["username"],
    },
  },
  {
    name: "reddit_get_user_posts",
    description: "Get posts submitted by a user",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Reddit username" },
        sort: { type: "string", enum: ["hot", "new", "top", "controversial"], description: "Sort order" },
        t: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], description: "Time filter (for top/controversial)" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        after: { type: "string", description: "Fullname for forward pagination" },
      },
      required: ["username"],
    },
  },
  {
    name: "reddit_get_user_comments",
    description: "Get comments made by a user",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Reddit username" },
        sort: { type: "string", enum: ["hot", "new", "top", "controversial"], description: "Sort order" },
        t: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], description: "Time filter" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["username"],
    },
  },

  // === Subreddits ===
  {
    name: "reddit_get_subreddit",
    description: "Get information about a subreddit including description, rules summary, and subscriber count",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name (without r/)" },
      },
      required: ["subreddit"],
    },
  },
  {
    name: "reddit_search_subreddits",
    description: "Search for subreddits by name or description",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        sort: { type: "string", enum: ["relevance", "activity"], description: "Sort order" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["q"],
    },
  },
  {
    name: "reddit_get_my_subreddits",
    description: "Get subreddits the authenticated user subscribes to, contributes to, or moderates",
    inputSchema: {
      type: "object",
      properties: {
        where: { type: "string", enum: ["subscriber", "contributor", "moderator"], description: "Relationship type" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["where"],
    },
  },
  {
    name: "reddit_get_subreddit_rules",
    description: "Get the rules for a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name" },
      },
      required: ["subreddit"],
    },
  },
  {
    name: "reddit_subscribe",
    description: "Subscribe or unsubscribe from a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["sub", "unsub"], description: "sub to subscribe, unsub to unsubscribe" },
        sr_name: { type: "string", description: "Subreddit name (without r/)" },
      },
      required: ["action", "sr_name"],
    },
  },

  // === Posts / Listings ===
  {
    name: "reddit_get_hot_posts",
    description: "Get hot posts from a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name" },
        limit: { type: "number", default: 25, description: "Max posts (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["subreddit"],
    },
  },
  {
    name: "reddit_get_new_posts",
    description: "Get newest posts from a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name" },
        limit: { type: "number", default: 25, description: "Max posts (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["subreddit"],
    },
  },
  {
    name: "reddit_get_top_posts",
    description: "Get top posts from a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name" },
        t: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], description: "Time period" },
        limit: { type: "number", default: 25, description: "Max posts (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["subreddit"],
    },
  },
  {
    name: "reddit_get_best_posts",
    description: "Get personalized best posts for the authenticated user across all subscriptions",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 25, description: "Max posts (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: [],
    },
  },
  {
    name: "reddit_get_post_comments",
    description: "Get a post and its full comment tree",
    inputSchema: {
      type: "object",
      properties: {
        article: { type: "string", description: "Post ID (base36, without t3_ prefix)" },
        sort: { type: "string", enum: ["confidence", "top", "new", "controversial", "old", "qa"], description: "Comment sort order" },
        depth: { type: "number", description: "Max depth of comment tree" },
        limit: { type: "number", description: "Max number of comments" },
      },
      required: ["article"],
    },
  },
  {
    name: "reddit_submit_post",
    description: "Submit a new text post or link to a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["self", "link"], description: "self for text post, link for URL post" },
        sr: { type: "string", description: "Subreddit name to post to (without r/)" },
        title: { type: "string", description: "Post title (max 300 characters)" },
        text: { type: "string", description: "Post body text in markdown (for self posts)" },
        url: { type: "string", description: "URL (for link posts)" },
        nsfw: { type: "boolean", default: false, description: "Mark as NSFW" },
        spoiler: { type: "boolean", default: false, description: "Mark as spoiler" },
        sendreplies: { type: "boolean", default: true, description: "Send inbox replies" },
        flair_id: { type: "string", description: "Flair template UUID" },
        flair_text: { type: "string", description: "Custom flair text" },
      },
      required: ["kind", "sr", "title"],
    },
  },

  // === Voting / Saving ===
  {
    name: "reddit_vote",
    description: "Upvote, downvote, or remove vote on a post or comment",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Fullname of thing to vote on (t1_ for comment, t3_ for post)" },
        dir: { type: "number", enum: [1, 0, -1], description: "1=upvote, 0=unvote, -1=downvote" },
      },
      required: ["id", "dir"],
    },
  },
  {
    name: "reddit_save",
    description: "Save a post or comment to your saved list",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Fullname of thing to save (t1_ or t3_)" },
        category: { type: "string", description: "Save category name (optional)" },
      },
      required: ["id"],
    },
  },
  {
    name: "reddit_unsave",
    description: "Remove a post or comment from your saved list",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Fullname of thing to unsave (t1_ or t3_)" },
      },
      required: ["id"],
    },
  },

  // === Comments ===
  {
    name: "reddit_post_comment",
    description: "Post a comment or reply to a post or another comment",
    inputSchema: {
      type: "object",
      properties: {
        thing_id: { type: "string", description: "Fullname of parent (t3_ for post reply, t1_ for comment reply)" },
        text: { type: "string", description: "Comment body in markdown" },
      },
      required: ["thing_id", "text"],
    },
  },
  {
    name: "reddit_edit_text",
    description: "Edit the body text of your own post or comment",
    inputSchema: {
      type: "object",
      properties: {
        thing_id: { type: "string", description: "Fullname of thing to edit (t1_ or t3_)" },
        text: { type: "string", description: "New body text in markdown" },
      },
      required: ["thing_id", "text"],
    },
  },
  {
    name: "reddit_delete",
    description: "Delete your own post or comment",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Fullname of thing to delete (t1_ or t3_)" },
      },
      required: ["id"],
    },
  },

  // === Search ===
  {
    name: "reddit_search",
    description: "Search all of Reddit for posts, subreddits, or users",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        sort: { type: "string", enum: ["relevance", "hot", "top", "new", "comments"], description: "Sort order" },
        t: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], description: "Time filter" },
        type: { type: "string", enum: ["sr", "link", "user"], description: "Result type: sr=subreddit, link=post, user=user" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["q"],
    },
  },
  {
    name: "reddit_search_in_subreddit",
    description: "Search for posts within a specific subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit to search within" },
        q: { type: "string", description: "Search query" },
        sort: { type: "string", enum: ["relevance", "hot", "top", "new", "comments"], description: "Sort order" },
        t: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], description: "Time filter" },
        limit: { type: "number", default: 25, description: "Max results (1-100)" },
        after: { type: "string", description: "Pagination token" },
        restrict_sr: { type: "boolean", default: true, description: "Restrict to this subreddit" },
      },
      required: ["subreddit", "q"],
    },
  },

  // === Messages ===
  {
    name: "reddit_get_messages",
    description: "Get messages from inbox, unread messages, or sent messages",
    inputSchema: {
      type: "object",
      properties: {
        where: { type: "string", enum: ["inbox", "unread", "sent"], description: "Message folder" },
        limit: { type: "number", default: 25, description: "Max messages (1-100)" },
        after: { type: "string", description: "Pagination token" },
      },
      required: ["where"],
    },
  },
  {
    name: "reddit_send_message",
    description: "Send a private message to another Reddit user",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient username" },
        subject: { type: "string", description: "Message subject (max 100 chars)" },
        text: { type: "string", description: "Message body in markdown" },
      },
      required: ["to", "subject", "text"],
    },
  },
  {
    name: "reddit_mark_all_read",
    description: "Mark all messages in inbox as read",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // === Utility ===
  {
    name: "reddit_get_info",
    description: "Get detailed information about Reddit things (posts, comments, subreddits) by fullname ID or URL",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Comma-separated fullnames (e.g. t3_abc123,t1_def456)" },
        url: { type: "string", description: "A Reddit URL to look up" },
      },
      required: [],
    },
  },
  {
    name: "reddit_get_flair_options",
    description: "Get available post flair templates for a subreddit",
    inputSchema: {
      type: "object",
      properties: {
        subreddit: { type: "string", description: "Subreddit name" },
      },
      required: ["subreddit"],
    },
  },
];

export function getTools(): Tool[] {
  return tools;
}

export async function handleToolCall(
  client: APIClient,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    // User
    case "reddit_get_me":
      return client.get("/api/v1/me");
    case "reddit_get_my_karma":
      return client.get("/api/v1/me/karma");
    case "reddit_get_user":
      return client.get("/user/{username}/about", args);
    case "reddit_get_user_posts":
      return client.get("/user/{username}/submitted", args);
    case "reddit_get_user_comments":
      return client.get("/user/{username}/comments", args);

    // Subreddits
    case "reddit_get_subreddit":
      return client.get("/r/{subreddit}/about", args);
    case "reddit_search_subreddits":
      return client.get("/subreddits/search", args);
    case "reddit_get_my_subreddits":
      return client.get("/subreddits/mine/{where}", args);
    case "reddit_get_subreddit_rules":
      return client.get("/r/{subreddit}/about/rules", args);
    case "reddit_subscribe":
      return client.post("/api/subscribe", args);

    // Posts
    case "reddit_get_hot_posts":
      return client.get("/r/{subreddit}/hot", args);
    case "reddit_get_new_posts":
      return client.get("/r/{subreddit}/new", args);
    case "reddit_get_top_posts":
      return client.get("/r/{subreddit}/top", args);
    case "reddit_get_best_posts":
      return client.get("/best", args);
    case "reddit_get_post_comments":
      return client.get("/comments/{article}", args);
    case "reddit_submit_post":
      return client.post("/api/submit", { ...args, api_type: "json" });

    // Voting / Saving
    case "reddit_vote":
      return client.post("/api/vote", args);
    case "reddit_save":
      return client.post("/api/save", args);
    case "reddit_unsave":
      return client.post("/api/unsave", args);

    // Comments
    case "reddit_post_comment":
      return client.post("/api/comment", { ...args, api_type: "json" });
    case "reddit_edit_text":
      return client.post("/api/editusertext", { ...args, api_type: "json" });
    case "reddit_delete":
      return client.post("/api/del", args);

    // Search
    case "reddit_search":
      return client.get("/search", args);
    case "reddit_search_in_subreddit":
      return client.get("/r/{subreddit}/search", args);

    // Messages
    case "reddit_get_messages":
      return client.get("/message/{where}", args);
    case "reddit_send_message":
      return client.post("/api/compose", { ...args, api_type: "json" });
    case "reddit_mark_all_read":
      return client.post("/api/read_all_messages");

    // Utility
    case "reddit_get_info":
      return client.get("/api/info", args);
    case "reddit_get_flair_options":
      return client.get("/r/{subreddit}/api/link_flair_v2", args);

    default:
      throw new Error(`Unknown tool: ${name}. Available: ${tools.map((t) => t.name).join(", ")}`);
  }
}
