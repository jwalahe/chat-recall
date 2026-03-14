import type { Platform } from '../types';

/**
 * Auto-detect the platform from export file content.
 *
 * @param data - Parsed JSON data
 * @param filename - Optional filename hint
 * @returns Detected platform
 * @throws If platform cannot be determined
 */
export function detectPlatform(data: unknown, filename?: string): Platform {
  // Try content-based detection first
  if (Array.isArray(data)) {
    if (data.length > 0) {
      const first = data[0];

      // Claude: array of messages with `sender` and `conversation.uuid`
      if (first?.sender && first?.conversation?.uuid) {
        return 'claude';
      }

      // ChatGPT: array of conversations with `mapping` and `conversation_id`
      if (first?.mapping && first?.conversation_id) {
        return 'chatgpt';
      }
    }
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Gemini: object with `entries` array
    if ('entries' in data && Array.isArray((data as Record<string, unknown>).entries)) {
      return 'gemini';
    }
  }

  // JSONL string detection (Claude Code)
  if (typeof data === 'string') {
    try {
      const firstLine = data.split('\n')[0];
      const parsed = JSON.parse(firstLine);
      if (parsed.cwd && parsed.messages) {
        return 'claude-code';
      }
    } catch {
      // Not valid JSONL
    }
  }

  // Filename-based fallback
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('conversations.json')) return 'chatgpt';
    if (lower.includes('history.jsonl')) return 'claude-code';
    if (lower.includes('claude')) return 'claude';
    if (lower.includes('gemini') || lower.includes('bard')) return 'gemini';
    if (lower.includes('chatgpt') || lower.includes('openai')) return 'chatgpt';
  }

  throw new Error(
    'Unable to detect platform from file content. ' +
    'Please ensure the file is a valid export from Claude, ChatGPT, or Gemini.'
  );
}
