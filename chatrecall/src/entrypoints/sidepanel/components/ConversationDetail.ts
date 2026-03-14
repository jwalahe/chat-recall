import { h } from 'preact';
import type { Conversation, Message, Platform } from '../../../lib/types';
import { PLATFORM_COLORS, PLATFORM_NAMES } from '../../../utils/constants';
import { ContextMeter, computeTokenStats } from './ContextMeter';

interface Props {
  conversation: Conversation;
  onBack: () => void;
}

export function ConversationDetail({ conversation, onBack }: Props) {
  const conv = conversation;

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function copyToClipboard() {
    const md = conv.messages
      .map((m) => `**${m.role === 'user' ? 'You' : PLATFORM_NAMES[conv.platform]}:**\n${m.content}`)
      .join('\n\n---\n\n');
    const header = `# ${conv.title || 'Untitled'}\n*${PLATFORM_NAMES[conv.platform]} \u00B7 ${formatDate(conv.createdAt)}*\n\n`;
    navigator.clipboard.writeText(header + md);
  }

  function exportAsJson() {
    const blob = new Blob([JSON.stringify(conv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conv.title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tokenStats = computeTokenStats(conv.messages, conv.model);

  return h('div', { style: 'display: flex; flex-direction: column; height: 100vh;' },
    // Header
    h('div', { style: 'padding: 12px; border-bottom: 1px solid #eee; flex-shrink: 0;' },
      h('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;' },
        h('button', {
          onClick: onBack,
          style: 'background: none; border: none; font-size: 16px; cursor: pointer; padding: 0;',
        }, '\u2190 Back'),
        h('span', {
          style: 'font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;',
        }, conv.title || 'Untitled'),
      ),
      h('div', { style: 'font-size: 11px; color: #888; display: flex; gap: 8px;' },
        h('span', { style: `color: ${PLATFORM_COLORS[conv.platform]}; font-weight: 500;` },
          PLATFORM_NAMES[conv.platform]
        ),
        h('span', null, '\u00B7'),
        h('span', null, formatDate(conv.createdAt)),
        h('span', null, '\u00B7'),
        h('span', null, `${conv.messageCount} msgs`),
      ),
    ),

    // Context meter (only shown when token data is available)
    tokenStats && h(ContextMeter, { stats: tokenStats }),

    // Messages
    h('div', { style: 'flex: 1; overflow-y: auto; padding: 12px;' },
      conv.messages.map((msg, i) =>
        h(MessageBubble, { key: msg.id || String(i), message: msg, platform: conv.platform })
      )
    ),

    // Action bar
    h('div', { style: 'padding: 8px 12px; border-top: 1px solid #eee; display: flex; gap: 8px; flex-shrink: 0;' },
      h('button', { onClick: copyToClipboard, style: btnStyle }, 'Copy'),
      h('button', { onClick: exportAsJson, style: btnStyle }, 'Export'),
    ),
  );
}

const btnStyle = 'padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; background: white; font-size: 12px; cursor: pointer;';

function MessageBubble({ message, platform }: { message: Message; platform: Platform }) {
  const isUser = message.role === 'user';
  const label = isUser ? 'You' : (PLATFORM_NAMES[platform] || 'Assistant');
  const bgColor = isUser ? '#f0f4ff' : '#f9f9f9';
  const labelColor = isUser ? '#3B82F6' : (PLATFORM_COLORS[platform] || '#888');

  return h('div', { style: `margin-bottom: 12px; padding: 10px 12px; background: ${bgColor}; border-radius: 8px;` },
    h('div', { style: `font-size: 11px; font-weight: 600; color: ${labelColor}; margin-bottom: 4px;` }, label),
    h('div', { style: 'font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;' },
      message.content
    ),
  );
}
