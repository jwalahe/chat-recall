import { nanoid } from 'nanoid';
import type { Conversation, Message, Platform } from './types';
import { computeAccessScore } from './scoring';

/**
 * Create a normalized Conversation object from raw platform data.
 */
export function createConversation(params: {
  externalId: string;
  platform: Platform;
  title: string;
  messages: Array<{
    externalId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: number;
    model?: string;
    metadata?: Record<string, unknown>;
  }>;
  model: string;
  source: 'live-capture' | 'import';
  createdAt?: number;
  updatedAt?: number;
}): Conversation {
  const now = Date.now();
  const convId = nanoid();

  const messages: Message[] = params.messages.map((m) => ({
    id: nanoid(),
    externalId: m.externalId,
    conversationId: convId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
    model: m.model,
    metadata: m.metadata,
  }));

  const timestamps = messages.map((m) => m.createdAt).filter((t) => t > 0);
  const createdAt = params.createdAt ?? Math.min(...timestamps, now);
  const updatedAt = params.updatedAt ?? Math.max(...timestamps, now);

  const conv: Conversation = {
    id: convId,
    externalId: params.externalId,
    platform: params.platform,
    title: params.title || generateTitle(messages),
    messages,
    messageCount: messages.length,
    createdAt,
    updatedAt,
    lastAccessedAt: now,
    importedAt: now,
    accessCount: params.source === 'import' ? 0 : 1,
    accessScore: 0,
    model: params.model,
    source: params.source,
    tags: extractTags(messages),
  };

  conv.accessScore = computeAccessScore(conv);
  return conv;
}

/**
 * Generate a title from the first user message.
 */
function generateTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'Untitled conversation';

  const text = firstUserMsg.content.trim();
  if (text.length <= 60) return text;
  return text.slice(0, 57) + '...';
}

/**
 * Extract topic tags from conversation messages.
 * Simple TF-based extraction — returns top terms by frequency.
 */
function extractTags(messages: Message[]): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
    'just', 'about', 'up', 'out', 'that', 'this', 'it', 'its', 'my',
    'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who', 'whom',
    'how', 'when', 'where', 'why', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
    'same', 'also', 'back', 'well', 'way', 'even', 'new', 'want',
    'because', 'any', 'give', 'day', 'use', 'her', 'him', 'them',
    'like', 'make', 'think', 'know', 'take', 'come', 'get', 'say',
    'need', 'here', 'there', 'yes', 'please', 'thanks', 'thank', 'you',
    'okay', 'sure', 'help', 'let', 'try', 'see', 'look', 'something',
  ]);

  const allText = messages.map((m) => m.content).join(' ').toLowerCase();
  const words = allText.split(/\W+/);
  const freq = new Map<string, number>();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
