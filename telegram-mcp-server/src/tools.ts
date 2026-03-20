/**
 * MCP Tool definitions and handlers for Telegram
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as tg from "./telegram-client.js";

const tools: Tool[] = [
  {
    name: "telegram_get_me",
    description: "Get the connected Telegram user's profile info",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "telegram_list_chats",
    description: "List recent Telegram chats/dialogs (DMs, groups, channels) with unread counts",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20, description: "Max chats to return (default: 20)" },
      },
      required: [],
    },
  },
  {
    name: "telegram_get_messages",
    description: "Get recent messages from a specific chat",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID or @username" },
        limit: { type: "number", default: 20, description: "Max messages (default: 20)" },
      },
      required: ["chat_id"],
    },
  },
  {
    name: "telegram_send_message",
    description: "Send a text message to a Telegram chat, group, or user",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID or @username" },
        text: { type: "string", description: "Message text (supports Telegram markdown)" },
      },
      required: ["chat_id", "text"],
    },
  },
  {
    name: "telegram_search_messages",
    description: "Search messages in a specific chat or globally across all chats",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        chat_id: { type: "string", description: "Chat ID to search in (omit for global search)" },
        limit: { type: "number", default: 20, description: "Max results (default: 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "telegram_get_contacts",
    description: "Get the user's Telegram contact list",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "telegram_get_chat_info",
    description: "Get detailed info about a chat, group, or channel",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID or @username" },
      },
      required: ["chat_id"],
    },
  },
  {
    name: "telegram_mark_read",
    description: "Mark all messages in a chat as read",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID or @username" },
      },
      required: ["chat_id"],
    },
  },
  {
    name: "telegram_forward_message",
    description: "Forward messages from one chat to another",
    inputSchema: {
      type: "object",
      properties: {
        from_chat_id: { type: "string", description: "Source chat ID" },
        to_chat_id: { type: "string", description: "Destination chat ID" },
        message_ids: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to forward",
        },
      },
      required: ["from_chat_id", "to_chat_id", "message_ids"],
    },
  },
  {
    name: "telegram_delete_messages",
    description: "Delete messages from a chat (revokes for all participants)",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID" },
        message_ids: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to delete",
        },
      },
      required: ["chat_id", "message_ids"],
    },
  },
  {
    name: "telegram_pin_message",
    description: "Pin a message in a chat",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Chat ID" },
        message_id: { type: "number", description: "Message ID to pin" },
      },
      required: ["chat_id", "message_id"],
    },
  },
];

export function getTools(): Tool[] {
  return tools;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "telegram_get_me":
      return tg.getMe();

    case "telegram_list_chats":
      return tg.getDialogs((args.limit as number) || 20);

    case "telegram_get_messages":
      return tg.getMessages(args.chat_id as string, (args.limit as number) || 20);

    case "telegram_send_message":
      return tg.sendMessage(args.chat_id as string, args.text as string);

    case "telegram_search_messages":
      return tg.searchMessages(
        args.chat_id as string | undefined,
        args.query as string,
        (args.limit as number) || 20
      );

    case "telegram_get_contacts":
      return tg.getContacts();

    case "telegram_get_chat_info":
      return tg.getChatInfo(args.chat_id as string);

    case "telegram_mark_read":
      await tg.markAsRead(args.chat_id as string);
      return { success: true };

    case "telegram_forward_message":
      return tg.forwardMessage(
        args.from_chat_id as string,
        args.to_chat_id as string,
        args.message_ids as number[]
      );

    case "telegram_delete_messages":
      await tg.deleteMessages(args.chat_id as string, args.message_ids as number[]);
      return { success: true };

    case "telegram_pin_message":
      await tg.pinMessage(args.chat_id as string, args.message_id as number);
      return { success: true };

    default:
      throw new Error(`Unknown tool: ${name}. Available: ${tools.map((t) => t.name).join(", ")}`);
  }
}
