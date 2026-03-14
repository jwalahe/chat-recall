import type { Conversation } from './types';

/**
 * Compute the LRU access score for a conversation.
 *
 * Higher score = surfaces higher in the list.
 * Base is the most recent activity timestamp, boosted by access frequency
 * with diminishing returns after 10 accesses.
 */
export function computeAccessScore(conv: Conversation): number {
  const recency = Math.max(conv.updatedAt, conv.lastAccessedAt);

  const HOUR_MS = 3_600_000;

  // Each access adds 1 hour of "virtual recency"
  // Diminishing returns after 10 accesses (log scale)
  const boost =
    conv.accessCount <= 10
      ? conv.accessCount * HOUR_MS
      : 10 * HOUR_MS + Math.log2(conv.accessCount - 9) * HOUR_MS;

  return recency + boost;
}

/**
 * Record a conversation access (view or search hit) and recompute score.
 * Returns updated conversation.
 */
export function recordAccess(conv: Conversation, weight = 1): Conversation {
  const updated = {
    ...conv,
    lastAccessedAt: Date.now(),
    accessCount: conv.accessCount + weight,
  };
  updated.accessScore = computeAccessScore(updated);
  return updated;
}

/**
 * Group conversations by time period for display.
 */
export function groupByTimePeriod(
  conversations: Conversation[]
): { label: string; conversations: Conversation[] }[] {
  const now = Date.now();
  const DAY = 86_400_000;

  const groups: Record<string, Conversation[]> = {
    Today: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  for (const conv of conversations) {
    const age = now - Math.max(conv.updatedAt, conv.lastAccessedAt);
    if (age < DAY) {
      groups['Today'].push(conv);
    } else if (age < 7 * DAY) {
      groups['This Week'].push(conv);
    } else if (age < 30 * DAY) {
      groups['This Month'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  }

  return Object.entries(groups)
    .filter(([, convs]) => convs.length > 0)
    .map(([label, conversations]) => ({ label, conversations }));
}
