/**
 * Shared relay logic for ISOLATED world content scripts.
 *
 * Listens for messages from the MAIN world interceptor (via window.postMessage)
 * and forwards them to the service worker (via chrome.runtime.sendMessage).
 *
 * Also checks feature flags before forwarding — if capture is disabled
 * for this platform, messages are silently dropped.
 */

import { MSG_TYPE } from '../utils/constants';
import { DEFAULT_FLAGS, type FeatureFlags, type Platform } from './types';

/**
 * Install the relay listener for a specific platform.
 *
 * @param platform - The platform this relay is for (used for flag checking)
 */
export function installRelay(platform: Platform): void {
  let flags: FeatureFlags = { ...DEFAULT_FLAGS };

  // Load flags from storage
  chrome.storage.local.get('featureFlags').then((result) => {
    if (result.featureFlags) {
      flags = { ...DEFAULT_FLAGS, ...result.featureFlags };
    }
  });

  // Listen for flag updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.featureFlags?.newValue) {
      flags = { ...DEFAULT_FLAGS, ...changes.featureFlags.newValue };
    }
  });

  // Listen for messages from MAIN world interceptor
  window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;
    if (event.data?.type !== MSG_TYPE) return;

    // Check global kill switch AND per-platform flag
    if (!flags.capture.enabled) return;
    if (!flags.capture[platform]) return;

    // Forward to service worker
    chrome.runtime.sendMessage({
      action: 'ingest',
      platform: event.data.platform,
      conversationId: event.data.conversationId,
      messageId: event.data.messageId,
      role: event.data.role,
      content: event.data.content,
      model: event.data.model,
      timestamp: event.data.timestamp,
    }).catch((err) => {
      // Service worker may be inactive — message will be lost
      // This is acceptable; the next message will trigger a wake
      console.warn('[ChatRecall] Failed to relay message:', err);
    });
  });
}
