import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { FeatureFlags, Platform } from '../../../lib/types';
import { DEFAULT_FLAGS } from '../../../lib/types';
import { PLATFORM_COLORS, PLATFORM_NAMES } from '../../../utils/constants';

interface Props {
  onBack: () => void;
  onImportComplete: () => void;
}

interface StorageStats {
  totalConversations: number;
  byPlatform: Record<string, number>;
}

export function Settings({ onBack, onImportComplete }: Props) {
  const [flags, setFlags] = useState<FeatureFlags>({ ...DEFAULT_FLAGS });
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
    loadStats();
  }, []);

  async function loadFlags() {
    const result = await chrome.storage.local.get('featureFlags');
    if (result.featureFlags) {
      setFlags({ ...DEFAULT_FLAGS, ...result.featureFlags });
    }
  }

  async function loadStats() {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response?.ok) {
      setStats(response.data);
    }
  }

  async function updateFlag(path: string[], value: boolean) {
    const updated = { ...flags };
    let obj: Record<string, unknown> = updated;
    for (let i = 0; i < path.length - 1; i++) {
      obj[path[i]] = { ...(obj[path[i]] as Record<string, unknown>) };
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;
    setFlags(updated as FeatureFlags);
    await chrome.storage.local.set({ featureFlags: updated });
  }

  const handleFileSelect = useCallback(async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await chrome.runtime.sendMessage({
        action: 'importFile',
        data,
        filename: file.name,
      });

      if (response?.ok) {
        const r = response.data;
        setImportResult(`Imported ${r.imported} conversations (${r.duplicates} duplicates, ${r.updated} updated)`);
        loadStats();
        onImportComplete();
      } else {
        setImportResult(`Error: ${response?.error || 'Import failed'}`);
      }
    } catch (err) {
      setImportResult(`Error: ${err instanceof Error ? err.message : 'Failed to parse file'}`);
    }

    setImporting(false);
    input.value = '';
  }, [onImportComplete]);

  async function handleClearData(platform?: string) {
    const response = await chrome.runtime.sendMessage({
      action: 'clearData',
      platform,
    });
    if (response?.ok) {
      setConfirmClear(null);
      loadStats();
      onImportComplete();
    }
  }

  const platforms: Platform[] = ['claude', 'chatgpt', 'gemini'];

  return h('div', { style: 'display: flex; flex-direction: column; height: 100vh;' },
    // Header
    h('div', { style: 'padding: 12px; border-bottom: 1px solid #eee; flex-shrink: 0; display: flex; align-items: center; gap: 8px;' },
      h('button', {
        onClick: onBack,
        style: 'background: none; border: none; font-size: 16px; cursor: pointer; padding: 0;',
      }, '\u2190'),
      h('h1', { style: 'font-size: 18px; font-weight: 600;' }, 'Settings'),
    ),

    // Scrollable content
    h('div', { style: 'flex: 1; overflow-y: auto; padding: 12px;' },

      // Live Capture section
      h('div', { style: sectionStyle },
        h('div', { style: sectionTitleStyle }, 'LIVE CAPTURE'),
        ...platforms.map((p) =>
          h('div', { key: p, style: 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0;' },
            h('div', null,
              h('span', { style: `color: ${PLATFORM_COLORS[p]}; font-weight: 500; font-size: 13px;` },
                PLATFORM_NAMES[p]
              ),
              p === 'gemini' && h('span', { style: 'font-size: 11px; color: #999; margin-left: 6px;' }, '(not yet supported)'),
            ),
            h('label', { style: 'position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer;' },
              h('input', {
                type: 'checkbox',
                checked: flags.capture[p],
                onChange: () => updateFlag(['capture', p], !flags.capture[p]),
                style: 'opacity: 0; width: 0; height: 0;',
              }),
              h('span', {
                style: `position: absolute; inset: 0; border-radius: 10px; transition: background 0.2s; background: ${flags.capture[p] ? '#10b981' : '#ddd'};`,
              },
                h('span', {
                  style: `position: absolute; top: 2px; left: ${flags.capture[p] ? '18px' : '2px'}; width: 16px; height: 16px; border-radius: 50%; background: white; transition: left 0.2s;`,
                })
              ),
            ),
          )
        ),
      ),

      // Storage section
      h('div', { style: sectionStyle },
        h('div', { style: sectionTitleStyle }, 'STORAGE'),
        stats
          ? h('div', null,
              h('div', { style: 'font-size: 13px; font-weight: 500; margin-bottom: 8px;' },
                `${stats.totalConversations} conversations total`
              ),
              ...Object.entries(stats.byPlatform).map(([p, count]) =>
                h('div', { key: p, style: 'display: flex; justify-content: space-between; font-size: 12px; color: #666; padding: 2px 0;' },
                  h('span', { style: `color: ${PLATFORM_COLORS[p as Platform] || '#666'};` },
                    PLATFORM_NAMES[p as Platform] || p
                  ),
                  h('span', null, `${count} chats`),
                )
              ),
            )
          : h('div', { style: 'font-size: 12px; color: #999;' }, 'Loading...'),
      ),

      // Import section
      h('div', { style: sectionStyle },
        h('div', { style: sectionTitleStyle }, 'IMPORT DATA'),
        h('label', {
          style: `display: block; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; text-align: center; cursor: pointer; font-size: 13px; color: #666; ${importing ? 'opacity: 0.5; pointer-events: none;' : ''}`,
        },
          h('input', {
            type: 'file',
            accept: '.json',
            onChange: handleFileSelect,
            style: 'display: none;',
          }),
          importing
            ? 'Importing...'
            : h('div', null,
                h('div', { style: 'margin-bottom: 4px;' }, 'Click to select a JSON file'),
                h('div', { style: 'font-size: 11px; color: #999;' }, 'Supports Claude & ChatGPT exports'),
              ),
        ),
        importResult && h('div', {
          style: `margin-top: 8px; padding: 8px; border-radius: 6px; font-size: 12px; ${importResult.startsWith('Error') ? 'background: #fef2f2; color: #dc2626;' : 'background: #f0fdf4; color: #16a34a;'}`,
        }, importResult),
      ),

      // Danger zone
      h('div', { style: sectionStyle },
        h('div', { style: `${sectionTitleStyle} color: #dc2626;` }, 'DANGER ZONE'),
        stats && Object.entries(stats.byPlatform).map(([p, count]) =>
          h('div', { key: p, style: 'margin-bottom: 6px;' },
            confirmClear === p
              ? h('div', { style: 'display: flex; gap: 6px; align-items: center;' },
                  h('span', { style: 'font-size: 12px; color: #dc2626;' }, `Delete ${count} ${PLATFORM_NAMES[p as Platform] || p} chats?`),
                  h('button', {
                    onClick: () => handleClearData(p),
                    style: dangerBtnStyle,
                  }, 'Yes'),
                  h('button', {
                    onClick: () => setConfirmClear(null),
                    style: 'padding: 3px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; font-size: 11px; cursor: pointer;',
                  }, 'No'),
                )
              : h('button', {
                  onClick: () => setConfirmClear(p),
                  style: 'padding: 5px 12px; border: 1px solid #fca5a5; border-radius: 6px; background: white; font-size: 12px; cursor: pointer; color: #dc2626; width: 100%; text-align: left;',
                }, `Clear ${PLATFORM_NAMES[p as Platform] || p} data (${count} chats)`),
          )
        ),
        stats && stats.totalConversations > 0 && h('div', { style: 'margin-top: 8px;' },
          confirmClear === 'all'
            ? h('div', { style: 'display: flex; gap: 6px; align-items: center;' },
                h('span', { style: 'font-size: 12px; color: #dc2626;' }, `Delete ALL ${stats.totalConversations} chats?`),
                h('button', {
                  onClick: () => handleClearData(),
                  style: dangerBtnStyle,
                }, 'Yes, delete all'),
                h('button', {
                  onClick: () => setConfirmClear(null),
                  style: 'padding: 3px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; font-size: 11px; cursor: pointer;',
                }, 'Cancel'),
              )
            : h('button', {
                onClick: () => setConfirmClear('all'),
                style: 'padding: 5px 12px; border: 1px solid #dc2626; border-radius: 6px; background: #fef2f2; font-size: 12px; cursor: pointer; color: #dc2626; width: 100%; text-align: left;',
              }, `Clear all data (${stats.totalConversations} chats)`),
        ),
      ),

      // About section
      h('div', { style: `${sectionStyle} margin-bottom: 24px;` },
        h('div', { style: sectionTitleStyle }, 'ABOUT'),
        h('div', { style: 'font-size: 12px; color: #666; line-height: 1.6;' },
          h('div', null, 'ChatRecall v0.1.0'),
          h('div', { style: 'margin-top: 4px;' }, 'Your data never leaves your machine.'),
          h('div', null, 'No accounts. No cloud.'),
        ),
      ),
    ),
  );
}

const sectionStyle = 'margin-bottom: 16px; padding: 12px; border: 1px solid #eee; border-radius: 8px;';
const sectionTitleStyle = 'font-size: 11px; font-weight: 600; color: #888; letter-spacing: 0.5px; margin-bottom: 8px;';
const dangerBtnStyle = 'padding: 3px 10px; border: 1px solid #dc2626; border-radius: 4px; background: #dc2626; color: white; font-size: 11px; cursor: pointer;';
