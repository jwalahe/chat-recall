export type Platform = 'claude' | 'chatgpt' | 'gemini' | 'claude-code';

export interface Conversation {
  id: string;
  externalId: string;
  platform: Platform;
  title: string;
  summary?: string;
  messages: Message[];
  messageCount: number;

  createdAt: number;       // Unix ms
  updatedAt: number;       // Unix ms
  lastAccessedAt: number;  // Unix ms
  importedAt: number;      // Unix ms

  accessCount: number;
  accessScore: number;

  model: string;
  source: 'live-capture' | 'import';
  tags: string[];
  embedding?: number[];

  threadId?: string;
}

export interface Message {
  id: string;
  externalId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageChunk {
  id: string;
  conversationId: string;
  messageId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

export interface ConversationThread {
  id: string;
  name: string;
  conversationIds: string[];
  topicEmbedding: number[];
  createdAt: number;
  updatedAt: number;
}

export interface FeatureFlags {
  capture: {
    enabled: boolean;
    claude: boolean;
    chatgpt: boolean;
    gemini: boolean;
  };
  semanticSearch: boolean;
  autoSummarize: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  capture: {
    enabled: true,
    claude: true,
    chatgpt: true,
    gemini: false,
  },
  semanticSearch: false,
  autoSummarize: false,
};

export interface ImportProgress {
  status: 'parsing' | 'normalizing' | 'storing' | 'embedding' | 'complete' | 'error';
  platform: Platform;
  total: number;
  processed: number;
  newCount: number;
  duplicates: number;
  updated: number;
  error?: string;
}

/** Message sent from MAIN world interceptor to ISOLATED world relay */
export interface InterceptedMessage {
  type: 'CHATRECALL_STREAM_DATA';
  platform: Platform;
  action: 'message_complete' | 'user_message';
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
}

/** Message sent from relay to service worker */
export interface IngestMessage {
  action: 'ingest';
  platform: Platform;
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
}
