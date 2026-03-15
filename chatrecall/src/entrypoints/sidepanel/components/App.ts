import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Conversation, FeatureFlags } from '../../../lib/types';
import { DEFAULT_FLAGS } from '../../../lib/types';
import { PLATFORM_COLORS, PLATFORM_NAMES } from '../../../utils/constants';
import { ConversationDetail } from './ConversationDetail';
import { Settings } from './Settings';
import { computeTokenStats } from './ContextMeter';

type View = { type: 'list' } | { type: 'detail'; conversation: Conversation } | { type: 'settings' };

export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: 'list' });
  const [captureEnabled, setCaptureEnabled] = useState(true);

  useEffect(() => {
    loadConversations();
    loadCaptureStatus();
  }, []);

  async function loadConversations() {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getConversations',
        limit: 50,
      });
      if (response?.ok) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('[ChatRecall] Failed to load conversations:', err);
    }
    setLoading(false);
  }

  async function loadCaptureStatus() {
    try {
      const result = await chrome.storage.local.get('featureFlags');
      if (result.featureFlags) {
        const flags: FeatureFlags = {
          ...DEFAULT_FLAGS,
          ...result.featureFlags,
          capture: {
            ...DEFAULT_FLAGS.capture,
            ...(result.featureFlags.capture ?? {}),
          },
        };
        setCaptureEnabled(flags.capture.enabled);
      }
    } catch {
      // Storage unavailable
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      loadConversations();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'search',
        query,
      });
      if (response?.ok) {
        const ids = response.data.map((r: { id: string }) => r.id);
        const fullConvs = await Promise.all(
          ids.map(async (id: string) => {
            const res = await chrome.runtime.sendMessage({
              action: 'getConversation',
              id,
            });
            return res?.data;
          })
        );
        setConversations(fullConvs.filter(Boolean));
      }
    } catch (err) {
      console.error('[ChatRecall] Search failed:', err);
    }
  }

  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  // Conversation Detail view
  if (view.type === 'detail') {
    return h(ConversationDetail, {
      conversation: view.conversation,
      onBack: () => setView({ type: 'list' }),
    });
  }

  // Settings view
  if (view.type === 'settings') {
    return h(Settings, {
      onBack: () => { setView({ type: 'list' }); loadCaptureStatus(); },
      onImportComplete: () => loadConversations(),
    });
  }

  // List view (default)
  return h('div', { style: 'padding: 12px;' },
    // Header
    h('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;' },
      h('h1', { style: 'font-size: 18px; font-weight: 600;' }, 'ChatRecall'),
      h('button', {
        style: 'background: none; border: none; font-size: 18px; cursor: pointer;',
        title: 'Settings',
        onClick: () => setView({ type: 'settings' }),
      }, '\u2699')
    ),

    // Search bar
    h('input', {
      type: 'text',
      placeholder: 'Search your AI chats...',
      value: searchQuery,
      onInput: (e: Event) => handleSearch((e.target as HTMLInputElement).value),
      style: 'width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; margin-bottom: 12px;',
    }),

    // Loading state
    loading && h('div', { style: 'text-align: center; padding: 40px; color: #888;' }, 'Loading...'),

    // Empty state
    !loading && conversations.length === 0 && h('div', { style: 'text-align: center; padding: 40px; color: #888;' },
      h('div', { style: 'font-size: 32px; margin-bottom: 8px;' }, '\uD83D\uDCAC'),
      h('p', { style: 'font-weight: 500;' }, searchQuery ? 'No results found' : 'No conversations yet'),
      h('p', { style: 'font-size: 12px; margin-top: 4px;' },
        searchQuery ? 'Try different keywords' : 'Start chatting on Claude or ChatGPT'
      ),
      !searchQuery && h('button', {
        onClick: () => setView({ type: 'settings' }),
        style: 'margin-top: 12px; padding: 6px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 12px; cursor: pointer; color: #3B82F6;',
      }, 'Import from file'),
    ),

    // Conversation list
    !loading && conversations.map((conv) =>
      h('div', {
        key: conv.id,
        style: 'padding: 10px 12px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.15s;',
        onClick: () => setView({ type: 'detail', conversation: conv }),
        onMouseEnter: (e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = '#f5f5f5',
        onMouseLeave: (e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'white',
      },
        h('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
          h('div', { style: 'font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;' },
            conv.title || 'Untitled'
          ),
          conv.threadId && h('span', { style: 'font-size: 12px; margin-left: 4px;', title: 'Has related conversations' }, '\uD83D\uDD17')
        ),
        h('div', { style: 'display: flex; gap: 8px; font-size: 11px; color: #888; margin-top: 4px; align-items: center;' },
          h('span', { style: `color: ${PLATFORM_COLORS[conv.platform]}; font-weight: 500;` },
            PLATFORM_NAMES[conv.platform]
          ),
          h('span', null, '\u00B7'),
          h('span', null, formatRelativeTime(conv.updatedAt)),
          h('span', null, '\u00B7'),
          h('span', null, `${conv.messageCount} msgs`),
          (() => {
            const stats = computeTokenStats(conv.messages, conv.model);
            if (!stats) return null;
            const pct = Math.min(stats.fillPercent, 100);
            const color = pct < 50 ? '#10b981' : pct < 75 ? '#f59e0b' : '#ef4444';
            return h('span', { style: `display: inline-flex; align-items: center; gap: 3px; margin-left: 2px;` },
              h('span', null, '\u00B7'),
              h('span', {
                style: `display: inline-block; width: 24px; height: 4px; background: #e5e7eb; border-radius: 2px; position: relative; overflow: hidden;`,
              },
                h('span', { style: `position: absolute; left: 0; top: 0; height: 100%; width: ${pct}%; background: ${color}; border-radius: 2px;` }),
              ),
              h('span', { style: `color: ${color}; font-weight: 500;` }, `${pct.toFixed(0)}%`),
            );
          })(),
        ),
        conv.messages.length > 0 && h('div', {
          style: 'font-size: 12px; color: #666; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
        }, conv.messages[conv.messages.length - 1].content.slice(0, 80))
      )
    ),

    // Status bar
    !loading && h('div', { style: 'position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 12px; background: #f9f9f9; border-top: 1px solid #eee; font-size: 11px; color: #888; display: flex; justify-content: space-between;' },
      h('span', null, `${conversations.length} conversations`),
      captureEnabled
        ? h('span', { style: 'color: #10b981;' }, '\uD83D\uDFE2 Live capture active')
        : h('span', { style: 'color: #f59e0b;' }, '\u26A0 Capture paused')
    )
  );
}
