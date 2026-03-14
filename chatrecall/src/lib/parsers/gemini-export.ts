import type { Conversation } from '../types';
import { createConversation } from '../normalizer';

/**
 * Gemini export format: per-conversation JSON files with entries array.
 */
interface GeminiExport {
  title?: string;
  entries: Array<{
    startTimestamp: string;
    parts: Array<{ text?: string }>;
    role: 'USER' | 'MODEL';
  }>;
  modelMetadata?: {
    modelId?: string;
  };
}

/**
 * Parse a Gemini data export file into a normalized Conversation.
 *
 * Note: Gemini exports are per-conversation files, not a single array.
 * Call this once per file.
 *
 * @param data - Parsed JSON from a single Gemini export file
 * @param filename - Original filename (used as fallback ID)
 * @returns A single normalized Conversation, or null if invalid
 */
export function parseGeminiExport(data: unknown, filename?: string): Conversation | null {
  const gemini = data as GeminiExport;

  if (!gemini.entries || !Array.isArray(gemini.entries)) {
    return null;
  }

  if (gemini.entries.length === 0) {
    return null;
  }

  const messages = gemini.entries
    .filter((entry) => entry.parts?.length > 0)
    .map((entry) => ({
      externalId: `gemini-${Date.parse(entry.startTimestamp) || Date.now()}`,
      role: entry.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: entry.parts.map((p) => p.text || '').join(''),
      createdAt: Date.parse(entry.startTimestamp) || 0,
    }));

  if (messages.length === 0) return null;

  return createConversation({
    externalId: filename || `gemini-${Date.now()}`,
    platform: 'gemini',
    title: gemini.title || '',
    model: gemini.modelMetadata?.modelId || 'gemini',
    source: 'import',
    messages,
  });
}
