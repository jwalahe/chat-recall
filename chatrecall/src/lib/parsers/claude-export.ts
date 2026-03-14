import type { Conversation } from '../types';
import { createConversation } from '../normalizer';

/**
 * Claude export format: array of message objects.
 * Each message has a nested `conversation` object (denormalized).
 */
interface ClaudeExportMessage {
  uuid: string;
  text: string;
  sender: 'human' | 'assistant';
  created_at: string;
  updated_at: string;
  attachments: unknown[];
  files: unknown[];
  conversation: {
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
    model?: string;
  };
}

/**
 * Parse a Claude data export JSON into normalized Conversations.
 *
 * @param data - Parsed JSON from Claude export (array of messages)
 * @returns Array of normalized Conversation objects
 */
export function parseClaudeExport(data: unknown): Conversation[] {
  if (!Array.isArray(data)) {
    throw new Error('Claude export must be an array of messages');
  }

  const messages = data as ClaudeExportMessage[];

  // Group messages by conversation UUID
  const grouped = new Map<string, ClaudeExportMessage[]>();
  for (const msg of messages) {
    const convId = msg.conversation?.uuid;
    if (!convId) continue;

    if (!grouped.has(convId)) {
      grouped.set(convId, []);
    }
    grouped.get(convId)!.push(msg);
  }

  // Convert each group to a Conversation
  const conversations: Conversation[] = [];

  for (const [convId, msgs] of grouped) {
    // Sort by created_at
    msgs.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

    const convMeta = msgs[0].conversation;

    const conv = createConversation({
      externalId: convId,
      platform: 'claude',
      title: convMeta.name || '',
      model: convMeta.model || 'unknown',
      source: 'import',
      createdAt: Date.parse(convMeta.created_at),
      updatedAt: Date.parse(convMeta.updated_at),
      messages: msgs.map((m) => ({
        externalId: m.uuid,
        role: m.sender === 'human' ? 'user' as const : 'assistant' as const,
        content: m.text,
        createdAt: Date.parse(m.created_at),
      })),
    });

    conversations.push(conv);
  }

  return conversations;
}
