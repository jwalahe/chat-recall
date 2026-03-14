import MiniSearch from 'minisearch';
import type { Conversation } from '../types';

export interface SearchResult {
  id: string;
  score: number;
  matchType: 'keyword';
  terms: string[];
}

let searchIndex: MiniSearch | null = null;

/**
 * Initialize or rebuild the search index from conversations.
 */
export function buildSearchIndex(conversations: Conversation[]): void {
  searchIndex = new MiniSearch({
    fields: ['title', 'firstMessage', 'lastMessage', 'tags'],
    storeFields: ['platform', 'title'],
    searchOptions: {
      boost: { title: 3, firstMessage: 2, tags: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  const documents = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    platform: conv.platform,
    firstMessage: conv.messages[0]?.content.slice(0, 500) || '',
    lastMessage: conv.messages[conv.messages.length - 1]?.content.slice(0, 500) || '',
    tags: conv.tags.join(' '),
  }));

  searchIndex.addAll(documents);
}

/**
 * Add a single conversation to the existing index.
 */
export function addToSearchIndex(conv: Conversation): void {
  if (!searchIndex) return;

  searchIndex.add({
    id: conv.id,
    title: conv.title,
    platform: conv.platform,
    firstMessage: conv.messages[0]?.content.slice(0, 500) || '',
    lastMessage: conv.messages[conv.messages.length - 1]?.content.slice(0, 500) || '',
    tags: conv.tags.join(' '),
  });
}

/**
 * Remove a conversation from the index.
 */
export function removeFromSearchIndex(id: string): void {
  if (!searchIndex) return;
  searchIndex.discard(id);
}

/**
 * Search conversations by keyword.
 *
 * @param query - Search query string
 * @param platform - Optional platform filter
 * @returns Ranked search results
 */
export function searchKeyword(query: string, platform?: string): SearchResult[] {
  if (!searchIndex || !query.trim()) return [];

  const filter = platform
    ? (result: { platform: string }) => result.platform === platform
    : undefined;

  const results = searchIndex.search(query, { filter });

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    matchType: 'keyword' as const,
    terms: r.terms,
  }));
}
