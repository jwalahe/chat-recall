import { h } from 'preact';
import type { Message, TokenUsage } from '../../../lib/types';

/** Known context window sizes per model family */
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'claude-opus-4': 1_000_000,
  'claude-sonnet-4': 1_000_000,
  'claude-3-5-sonnet': 200_000,
  'claude-3-5-haiku': 200_000,
  'claude-3-opus': 200_000,
  'claude-3-sonnet': 200_000,
  'claude-3-haiku': 200_000,
};

function getContextLimit(model: string): number {
  for (const [prefix, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (model.startsWith(prefix)) return limit;
  }
  return 200_000; // conservative default
}

export interface TokenStats {
  latestInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  contextLimit: number;
  fillPercent: number;
  turnsWithData: number;
  avgTokensPerTurn: number;
  estimatedTurnsRemaining: number | null;
  stopReason?: string;
}

export function computeTokenStats(messages: Message[], model: string): TokenStats | null {
  let latestInputTokens = 0;
  let totalOutputTokens = 0;
  let turnsWithData = 0;
  let stopReason: string | undefined;

  for (const msg of messages) {
    const usage = msg.metadata?.tokenUsage as TokenUsage | undefined;
    if (!usage) continue;

    turnsWithData++;
    if (usage.inputTokens > 0) {
      latestInputTokens = usage.inputTokens; // input_tokens is cumulative context
    }
    totalOutputTokens += usage.outputTokens;
    if (usage.stopReason) {
      stopReason = usage.stopReason;
    }
  }

  if (turnsWithData === 0) return null;

  const contextLimit = getContextLimit(model);
  const totalTokens = latestInputTokens + totalOutputTokens;
  const fillPercent = (latestInputTokens / contextLimit) * 100;
  const avgTokensPerTurn = turnsWithData > 1
    ? latestInputTokens / turnsWithData
    : latestInputTokens;
  const remaining = contextLimit - latestInputTokens;
  const estimatedTurnsRemaining = avgTokensPerTurn > 0
    ? Math.max(0, Math.floor(remaining / avgTokensPerTurn))
    : null;

  return {
    latestInputTokens,
    totalOutputTokens,
    totalTokens,
    contextLimit,
    fillPercent,
    turnsWithData,
    avgTokensPerTurn,
    estimatedTurnsRemaining,
    stopReason,
  };
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getMeterColor(percent: number): string {
  if (percent < 50) return '#10b981';  // green
  if (percent < 75) return '#f59e0b';  // amber
  return '#ef4444';                     // red
}

function getStatusLabel(percent: number): string {
  if (percent < 30) return 'Fresh';
  if (percent < 50) return 'Healthy';
  if (percent < 70) return 'Growing';
  if (percent < 85) return 'Heavy';
  return 'Switch soon';
}

interface Props {
  stats: TokenStats;
}

export function ContextMeter({ stats }: Props) {
  const color = getMeterColor(stats.fillPercent);
  const label = getStatusLabel(stats.fillPercent);
  const pct = Math.min(stats.fillPercent, 100);

  return h('div', { style: 'padding: 10px 12px; margin: 0 12px 8px; border: 1px solid #eee; border-radius: 8px; background: #fafafa;' },
    // Title row
    h('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;' },
      h('span', { style: 'font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.3px;' }, 'CONTEXT WINDOW'),
      h('span', { style: `font-size: 11px; font-weight: 600; color: ${color};` }, label),
    ),

    // Progress bar
    h('div', { style: 'height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-bottom: 6px;' },
      h('div', {
        style: `height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;`,
      }),
    ),

    // Stats row
    h('div', { style: 'display: flex; justify-content: space-between; font-size: 11px; color: #666;' },
      h('span', null, `${formatTokenCount(stats.latestInputTokens)} / ${formatTokenCount(stats.contextLimit)} (${pct.toFixed(0)}%)`),
      stats.estimatedTurnsRemaining !== null && h('span', null, `~${stats.estimatedTurnsRemaining} turns left`),
    ),

    // Detail row
    h('div', { style: 'display: flex; gap: 12px; font-size: 10px; color: #999; margin-top: 4px;' },
      h('span', null, `In: ${formatTokenCount(stats.latestInputTokens)}`),
      h('span', null, `Out: ${formatTokenCount(stats.totalOutputTokens)}`),
      h('span', null, `${stats.turnsWithData} turns tracked`),
    ),

    // Warning banner when context is heavy
    stats.fillPercent >= 75 && h('div', {
      style: 'margin-top: 6px; padding: 6px 8px; background: #fef2f2; border-radius: 4px; font-size: 11px; color: #dc2626; line-height: 1.4;',
    },
      stats.fillPercent >= 90
        ? 'Context nearly full. Responses may lose coherence. Start a new thread.'
        : 'Context getting heavy. Consider starting a new thread soon.'
    ),
  );
}
