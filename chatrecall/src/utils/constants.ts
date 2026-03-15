import type { Platform } from '../lib/types';

/** URL patterns for intercepting chat API calls */
export const INTERCEPT_PATTERNS: Record<Platform, RegExp> = {
  // Match both the legacy /completion endpoint and any chat_conversations POST
  // that returns an SSE stream (Claude may have changed their API path).
  claude: /\/api\/organizations\/[^/]+\/chat_conversations\/[^/]+\/(completion|messages)/,
  chatgpt: /\/backend-api\/conversation$/,
  gemini: /\/_\/BardChatUi/,
  'claude-code': /^$/, // Not intercepted — imported from local file
};

/** Platform detection from URL */
export function detectPlatformFromUrl(url: string): Platform | null {
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('gemini.google.com')) return 'gemini';
  return null;
}

/** Extract conversation ID from URL */
export function extractConversationIdFromUrl(platform: Platform, url: string): string {
  switch (platform) {
    case 'claude': {
      const match = url.match(/chat_conversations\/([^/]+)/);
      return match?.[1] ?? '';
    }
    case 'chatgpt': {
      // ChatGPT conv ID is in the response body, not URL
      return '';
    }
    case 'gemini': {
      return '';
    }
    default:
      return '';
  }
}

/** Platform display colors */
export const PLATFORM_COLORS: Record<Platform, string> = {
  claude: '#D97706',     // amber
  chatgpt: '#10B981',   // green
  gemini: '#3B82F6',    // blue
  'claude-code': '#8B5CF6', // purple
};

/** Platform display names */
export const PLATFORM_NAMES: Record<Platform, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  'claude-code': 'Claude Code',
};

/** Message type used for communication between content scripts and extension */
export const MSG_TYPE = 'CHATRECALL_STREAM_DATA' as const;
