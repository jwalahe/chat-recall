import { openDB, type IDBPDatabase } from 'idb';
import type { Conversation, MessageChunk, ConversationThread } from './types';

const DB_NAME = 'chatrecall';
const DB_VERSION = 1;

export type ChatRecallDB = IDBPDatabase;

export async function getDB(): Promise<ChatRecallDB> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Conversations store
      const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
      convStore.createIndex('by-platform', 'platform');
      convStore.createIndex('by-updatedAt', 'updatedAt');
      convStore.createIndex('by-accessScore', 'accessScore');
      convStore.createIndex('by-externalId', ['platform', 'externalId'], { unique: true });
      convStore.createIndex('by-threadId', 'threadId');
      convStore.createIndex('by-source', 'source');

      // Chunks store (for embeddings — Phase 2)
      const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
      chunkStore.createIndex('by-conversationId', 'conversationId');
      chunkStore.createIndex('by-messageId', 'messageId');

      // Threads store (for chain-of-thought — Phase 2)
      db.createObjectStore('threads', { keyPath: 'id' });

      // Meta store (flags, stats, model cache info)
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });
}

/** Get conversations sorted by access score (descending), optionally filtered by platform */
export async function getRecentConversations(
  db: ChatRecallDB,
  platform?: string,
  limit = 50
): Promise<Conversation[]> {
  const tx = db.transaction('conversations', 'readonly');
  const index = tx.store.index('by-accessScore');
  const results: Conversation[] = [];

  let cursor = await index.openCursor(null, 'prev');
  while (cursor && results.length < limit) {
    const conv = cursor.value as Conversation;
    if (!platform || conv.platform === platform) {
      results.push(conv);
    }
    cursor = await cursor.continue();
  }

  return results;
}

/** Store or update a conversation */
export async function putConversation(db: ChatRecallDB, conv: Conversation): Promise<void> {
  await db.put('conversations', conv);
}

/** Get a conversation by ID */
export async function getConversation(db: ChatRecallDB, id: string): Promise<Conversation | undefined> {
  return db.get('conversations', id);
}

/** Check for existing conversation by platform + external ID */
export async function findByExternalId(
  db: ChatRecallDB,
  platform: string,
  externalId: string
): Promise<Conversation | undefined> {
  return db.getFromIndex('conversations', 'by-externalId', [platform, externalId]);
}

/** Get all conversations (for search indexing) */
export async function getAllConversations(db: ChatRecallDB): Promise<Conversation[]> {
  return db.getAll('conversations');
}

/** Delete all conversations for a platform */
export async function clearPlatformData(db: ChatRecallDB, platform: string): Promise<void> {
  const tx = db.transaction('conversations', 'readwrite');
  const index = tx.store.index('by-platform');
  let cursor = await index.openCursor(IDBKeyRange.only(platform));

  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

/** Delete all data */
export async function clearAllData(db: ChatRecallDB): Promise<void> {
  const tx = db.transaction(['conversations', 'chunks', 'threads'], 'readwrite');
  await Promise.all([
    tx.objectStore('conversations').clear(),
    tx.objectStore('chunks').clear(),
    tx.objectStore('threads').clear(),
  ]);
  await tx.done;
}

/** Get storage stats */
export async function getStorageStats(db: ChatRecallDB): Promise<{
  totalConversations: number;
  byPlatform: Record<string, number>;
}> {
  const convs = await db.getAll('conversations');
  const byPlatform: Record<string, number> = {};

  for (const conv of convs) {
    byPlatform[conv.platform] = (byPlatform[conv.platform] || 0) + 1;
  }

  return {
    totalConversations: convs.length,
    byPlatform,
  };
}
