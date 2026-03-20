/**
 * Telegram Client Wrapper
 *
 * Wraps GramJS TelegramClient for use by MCP tools.
 * Handles session loading, connection, and provides high-level methods.
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";
import { loadSession } from "./session-manager.js";

let _client: TelegramClient | null = null;

export async function getClient(): Promise<TelegramClient> {
  if (_client?.connected) return _client;

  const apiId = parseInt(process.env.TG_API_ID || process.env.TELEGRAM_API_ID || "0", 10);
  const apiHash = process.env.TG_API_HASH || process.env.TELEGRAM_API_HASH || "";

  if (!apiId || !apiHash) {
    throw new Error("Set TG_API_ID and TG_API_HASH. Get them at https://my.telegram.org/apps");
  }

  const session = loadSession();
  if (!session?.stringSession) {
    throw new Error(
      "No Telegram session found. Run the auth flow first:\n" +
      "  npx @mcp_factory/telegram-mcp-server auth\n" +
      "Or set TG_API_ID + TG_API_HASH and restart."
    );
  }

  _client = new TelegramClient(new StringSession(session.stringSession), apiId, apiHash, {
    connectionRetries: 3,
    timeout: 15,
    useIPV6: false,
  });

  // Suppress GramJS logs — they go to stdout and corrupt MCP JSON-RPC protocol
  _client.setLogLevel("none" as any);

  await _client.connect();
  return _client;
}

// --- High-level helpers ---

export async function getMe(): Promise<Record<string, unknown>> {
  const client = await getClient();
  const me = await client.getMe();
  return {
    id: me?.id?.toString(),
    username: (me as any)?.username,
    firstName: (me as any)?.firstName,
    lastName: (me as any)?.lastName,
    phone: (me as any)?.phone,
  };
}

export async function getDialogs(limit: number = 20): Promise<unknown[]> {
  const client = await getClient();
  const dialogs = await client.getDialogs({ limit });
  return dialogs.map((d) => ({
    id: d.id?.toString(),
    name: d.name || d.title,
    unreadCount: d.unreadCount,
    isUser: d.isUser,
    isGroup: d.isGroup,
    isChannel: d.isChannel,
    lastMessage: d.message?.message?.substring(0, 100),
    date: d.message?.date,
  }));
}

export async function getMessages(chatId: string, limit: number = 20): Promise<unknown[]> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  const messages = await client.getMessages(entity, { limit });
  return messages.map((m) => ({
    id: m.id,
    text: m.message,
    date: m.date,
    senderId: m.senderId?.toString(),
    replyTo: m.replyTo?.replyToMsgId,
    out: m.out,
  }));
}

export async function sendMessage(chatId: string, text: string): Promise<unknown> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  const result = await client.sendMessage(entity, { message: text });
  return {
    id: result.id,
    text: (result as any).message,
    date: result.date,
    chatId: chatId,
  };
}

export async function searchMessages(
  chatId: string | undefined,
  query: string,
  limit: number = 20
): Promise<unknown[]> {
  const client = await getClient();

  if (chatId) {
    const entity = await client.getEntity(chatId);
    const messages = await client.getMessages(entity, { search: query, limit });
    return messages.map((m) => ({
      id: m.id,
      text: m.message,
      date: m.date,
      chatId: chatId,
      senderId: m.senderId?.toString(),
    }));
  }

  // Global search
  const result = await client.invoke(
    new Api.messages.SearchGlobal({
      q: query,
      filter: new Api.InputMessagesFilterEmpty(),
      minDate: 0,
      maxDate: 0,
      offsetRate: 0,
      offsetPeer: new Api.InputPeerEmpty(),
      offsetId: 0,
      limit,
    } as any)
  );

  const messages = (result as any).messages || [];
  return messages.map((m: any) => ({
    id: m.id,
    text: m.message,
    date: m.date,
    peerId: m.peerId?.toString(),
  }));
}

export async function getContacts(): Promise<unknown[]> {
  const client = await getClient();
  const result = await client.invoke(new Api.contacts.GetContacts({ hash: 0 as any }));
  const users = (result as any).users || [];
  return users.map((u: any) => ({
    id: u.id?.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    phone: u.phone,
  }));
}

export async function getChatInfo(chatId: string): Promise<unknown> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  return {
    id: (entity as any).id?.toString(),
    title: (entity as any).title || (entity as any).firstName,
    username: (entity as any).username,
    participantsCount: (entity as any).participantsCount,
    about: (entity as any).about,
    type: (entity as any).className,
  };
}

export async function markAsRead(chatId: string): Promise<void> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  await client.markAsRead(entity);
}

export async function forwardMessage(
  fromChatId: string,
  toChatId: string,
  messageIds: number[]
): Promise<unknown> {
  const client = await getClient();
  const fromEntity = await client.getEntity(fromChatId);
  const toEntity = await client.getEntity(toChatId);
  const result = await client.forwardMessages(toEntity, {
    messages: messageIds,
    fromPeer: fromEntity,
  });
  return { forwarded: (result as any[]).length };
}

export async function deleteMessages(chatId: string, messageIds: number[]): Promise<void> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  await client.deleteMessages(entity, messageIds, { revoke: true });
}

export async function pinMessage(chatId: string, messageId: number): Promise<void> {
  const client = await getClient();
  const entity = await client.getEntity(chatId);
  await client.pinMessage(entity, messageId);
}
