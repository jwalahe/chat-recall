import type { Conversation } from '../types';
import { createConversation } from '../normalizer';

/**
 * ChatGPT export format: array of conversation objects with tree-based mapping.
 */
interface ChatGPTConversation {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTNode>;
  current_node: string;
  conversation_id: string;
  moderation_results?: unknown[];
}

interface ChatGPTNode {
  id: string;
  message?: {
    id: string;
    author: { role: string; metadata?: Record<string, unknown> };
    create_time: number | null;
    content: {
      content_type: string;
      parts: (string | Record<string, unknown>)[];
    };
    metadata?: {
      model_slug?: string;
      finish_details?: { type: string };
      [key: string]: unknown;
    };
  };
  parent: string | null;
  children: string[];
}

/**
 * Parse a ChatGPT data export (conversations.json) into normalized Conversations.
 *
 * @param data - Parsed JSON from ChatGPT export (array of conversations)
 * @returns Array of normalized Conversation objects
 */
export function parseChatGPTExport(data: unknown): Conversation[] {
  if (!Array.isArray(data)) {
    throw new Error('ChatGPT export must be an array of conversations');
  }

  const conversations: Conversation[] = [];

  for (const raw of data as ChatGPTConversation[]) {
    if (!raw.mapping || !raw.current_node) continue;

    const linearized = linearizeMapping(raw.mapping, raw.current_node);
    if (linearized.length === 0) continue;

    const model = linearized.find((m) => m.model)?.model || 'unknown';

    const conv = createConversation({
      externalId: raw.conversation_id,
      platform: 'chatgpt',
      title: raw.title || '',
      model,
      source: 'import',
      createdAt: raw.create_time ? raw.create_time * 1000 : undefined,
      updatedAt: raw.update_time ? raw.update_time * 1000 : undefined,
      messages: linearized,
    });

    conversations.push(conv);
  }

  return conversations;
}

/**
 * Linearize ChatGPT's tree-based mapping by walking from current_node to root.
 *
 * ChatGPT supports branching conversations (editing a message creates a new branch).
 * We follow the `current_node` path to get the active branch.
 */
function linearizeMapping(
  mapping: Record<string, ChatGPTNode>,
  currentNode: string
): Array<{
  externalId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  model?: string;
}> {
  // Walk from current_node to root, collecting messages
  const chain: ChatGPTNode[] = [];
  let nodeId: string | null = currentNode;

  while (nodeId && mapping[nodeId]) {
    const node = mapping[nodeId];
    if (node.message) {
      chain.unshift(node); // Prepend — we're walking backwards
    }
    nodeId = node.parent;
  }

  return chain
    .filter((node) => {
      const role = node.message?.author?.role;
      // Skip system messages and tool messages
      return role === 'user' || role === 'assistant';
    })
    .map((node) => {
      const msg = node.message!;
      const content = msg.content.parts
        .filter((p): p is string => typeof p === 'string')
        .join('');

      return {
        externalId: msg.id,
        role: msg.author.role as 'user' | 'assistant',
        content,
        createdAt: msg.create_time ? msg.create_time * 1000 : 0,
        model: msg.metadata?.model_slug,
      };
    });
}
