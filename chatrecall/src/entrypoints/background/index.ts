/**
 * ChatRecall Service Worker.
 *
 * Handles:
 * - Ingesting messages from content script relays
 * - Storing normalized conversations in IndexedDB
 * - Coordinating search queries from the side panel
 * - Managing feature flags
 */

import { getDB, putConversation, findByExternalId, getConversation } from '../../lib/db';
import { createConversation } from '../../lib/normalizer';
import { computeAccessScore } from '../../lib/scoring';
import type { IngestMessage, Conversation, Platform, TokenUsage } from '../../lib/types';
import { nanoid } from 'nanoid';

export default defineBackground(() => {
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
        tokenUsage?: TokenUsage;
      }>;
      lastUpdated: number;
    }
  >();

  // Flush buffer to DB after this many ms of inactivity
  const FLUSH_DELAY_MS = 5000;
  const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Listen for messages from content script relays and side panel.
   */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'ingest') {
      handleIngest(message as IngestMessage)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
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

    if (message.action === 'importFile') {
      handleImportFile(message.data, message.filename)
        .then((stats) => sendResponse({ ok: true, data: stats }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }

    if (message.action === 'getStats') {
      handleGetStats()
        .then((stats) => sendResponse({ ok: true, data: stats }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }

    if (message.action === 'clearData') {
      handleClearData(message.platform)
        .then(() => sendResponse({ ok: true }))
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
      tokenUsage: msg.tokenUsage,
    });
    buffer.lastUpdated = Date.now();

    scheduleFlush(bufferKey);
  }

  function scheduleFlush(bufferKey: string): void {
    const existing = flushTimers.get(bufferKey);
    if (existing) clearTimeout(existing);

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
    const existing = await findByExternalId(db, buffer.platform, buffer.conversationId);

    if (existing) {
      const newMsgs = buffer.messages.map((m) => ({
        id: nanoid(),
        externalId: m.externalId,
        conversationId: existing.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
        model: m.model,
        metadata: m.tokenUsage ? { tokenUsage: m.tokenUsage } : undefined,
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

    conversationBuffers.delete(bufferKey);
  }

  async function handleGetConversations(msg: {
    platform?: string;
    limit?: number;
  }): Promise<Conversation[]> {
    const db = await getDB();
    const { getRecentConversations } = await import('../../lib/db');
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
    const { searchKeyword, buildSearchIndex } = await import('../../lib/search/keyword-search');
    const { getAllConversations } = await import('../../lib/db');
    const db = await getDB();

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

  async function handleImportFile(
    data: unknown,
    filename?: string
  ): Promise<{ imported: number; duplicates: number; updated: number }> {
    const { detectPlatform } = await import('../../lib/parsers/detect-platform');
    const platform = detectPlatform(data, filename);

    let conversations: Conversation[];
    switch (platform) {
      case 'claude': {
        const { parseClaudeExport } = await import('../../lib/parsers/claude-export');
        conversations = parseClaudeExport(data);
        break;
      }
      case 'chatgpt': {
        const { parseChatGPTExport } = await import('../../lib/parsers/chatgpt-export');
        conversations = parseChatGPTExport(data);
        break;
      }
      default:
        throw new Error(`Import not yet supported for ${platform}`);
    }

    return handleImport(conversations);
  }

  async function handleGetStats(): Promise<{
    totalConversations: number;
    byPlatform: Record<string, number>;
  }> {
    const { getStorageStats } = await import('../../lib/db');
    const db = await getDB();
    return getStorageStats(db);
  }

  async function handleClearData(platform?: string): Promise<void> {
    const db = await getDB();
    if (platform) {
      const { clearPlatformData } = await import('../../lib/db');
      await clearPlatformData(db, platform);
    } else {
      const { clearAllData } = await import('../../lib/db');
      await clearAllData(db);
    }
  }
});
