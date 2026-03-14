/**
 * ChatRecall Service Worker.
 *
 * Handles:
 * - Ingesting messages from content script relays
 * - Storing normalized conversations in IndexedDB
 * - Coordinating search queries from the side panel
 * - Managing feature flags
 */

import { getDB, putConversation, findByExternalId, getConversation } from '../lib/db';
import { createConversation } from '../lib/normalizer';
import { computeAccessScore } from '../lib/scoring';
import type { IngestMessage, Conversation, Platform } from '../lib/types';
import { nanoid } from 'nanoid';

// Buffer for assembling live-captured conversations
// Key: `${platform}:${conversationId}`
const conversationBuffers = new Map<
  string,
  {
    platform: Platform;
    conversationId: string;
    messages: Array<{
      externalId: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: number;
      model?: string;
    }>;
    lastUpdated: number;
  }
>();

// Flush buffer to DB after this many ms of inactivity
const FLUSH_DELAY_MS = 5000;

/**
 * Listen for messages from content script relays and side panel.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'ingest') {
    handleIngest(message as IngestMessage)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'getConversations') {
    handleGetConversations(message)
      .then((convs) => sendResponse({ ok: true, data: convs }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.action === 'getConversation') {
    handleGetConversation(message.id)
      .then((conv) => sendResponse({ ok: true, data: conv }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.action === 'search') {
    handleSearch(message.query, message.platform)
      .then((results) => sendResponse({ ok: true, data: results }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.action === 'import') {
    handleImport(message.conversations)
      .then((stats) => sendResponse({ ok: true, data: stats }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

/**
 * Open side panel when the extension action (toolbar icon) is clicked.
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

/**
 * Handle an ingest message from a content script relay.
 */
async function handleIngest(msg: IngestMessage): Promise<void> {
  const bufferKey = `${msg.platform}:${msg.conversationId}`;

  let buffer = conversationBuffers.get(bufferKey);
  if (!buffer) {
    buffer = {
      platform: msg.platform,
      conversationId: msg.conversationId,
      messages: [],
      lastUpdated: Date.now(),
    };
    conversationBuffers.set(bufferKey, buffer);
  }

  buffer.messages.push({
    externalId: msg.messageId,
    role: msg.role,
    content: msg.content,
    createdAt: msg.timestamp,
    model: msg.model || undefined,
  });
  buffer.lastUpdated = Date.now();

  // Schedule flush
  scheduleFlush(bufferKey);
}

const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleFlush(bufferKey: string): void {
  // Clear existing timer
  const existing = flushTimers.get(bufferKey);
  if (existing) clearTimeout(existing);

  // Set new timer
  const timer = setTimeout(() => {
    flushBuffer(bufferKey);
    flushTimers.delete(bufferKey);
  }, FLUSH_DELAY_MS);

  flushTimers.set(bufferKey, timer);
}

async function flushBuffer(bufferKey: string): Promise<void> {
  const buffer = conversationBuffers.get(bufferKey);
  if (!buffer || buffer.messages.length === 0) return;

  const db = await getDB();

  // Check if conversation already exists
  const existing = await findByExternalId(db, buffer.platform, buffer.conversationId);

  if (existing) {
    // Append new messages to existing conversation
    const newMsgs = buffer.messages.map((m) => ({
      id: nanoid(),
      externalId: m.externalId,
      conversationId: existing.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt,
      model: m.model,
    }));

    const updated: Conversation = {
      ...existing,
      messages: [...existing.messages, ...newMsgs],
      messageCount: existing.messageCount + newMsgs.length,
      updatedAt: Date.now(),
    };
    updated.accessScore = computeAccessScore(updated);

    await putConversation(db, updated);
  } else {
    // Create new conversation
    const model = buffer.messages.find((m) => m.model)?.model || 'unknown';
    const conv = createConversation({
      externalId: buffer.conversationId,
      platform: buffer.platform,
      title: '',
      model,
      source: 'live-capture',
      messages: buffer.messages,
    });

    await putConversation(db, conv);
  }

  // Clear buffer
  conversationBuffers.delete(bufferKey);
}

async function handleGetConversations(msg: {
  platform?: string;
  limit?: number;
}): Promise<Conversation[]> {
  const db = await getDB();
  const { getRecentConversations } = await import('../lib/db');
  return getRecentConversations(db, msg.platform, msg.limit || 50);
}

async function handleGetConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return getConversation(db, id);
}

async function handleSearch(
  query: string,
  platform?: string
): Promise<Array<{ id: string; score: number }>> {
  const { searchKeyword, buildSearchIndex } = await import('../lib/search/keyword-search');
  const { getAllConversations } = await import('../lib/db');
  const db = await getDB();

  // Rebuild index (in MVP; later we'll keep it cached)
  const allConvs = await getAllConversations(db);
  buildSearchIndex(allConvs);

  return searchKeyword(query, platform);
}

async function handleImport(
  conversations: Conversation[]
): Promise<{ imported: number; duplicates: number; updated: number }> {
  const db = await getDB();
  let imported = 0;
  let duplicates = 0;
  let updated = 0;

  for (const conv of conversations) {
    const existing = await findByExternalId(db, conv.platform, conv.externalId);

    if (!existing) {
      await putConversation(db, conv);
      imported++;
    } else if (conv.messages.length > existing.messages.length) {
      await putConversation(db, {
        ...existing,
        messages: conv.messages,
        messageCount: conv.messages.length,
        updatedAt: Math.max(existing.updatedAt, conv.updatedAt),
      });
      updated++;
    } else {
      duplicates++;
    }
  }

  return { imported, duplicates, updated };
}
