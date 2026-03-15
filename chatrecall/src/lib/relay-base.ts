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
 * Check if the extension context is still valid.
 * After extension reload, chrome.runtime.id becomes undefined.
 */
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * Install the relay listener for a specific platform.
 *
 * @param platform - The platform this relay is for (used for flag checking)
 */
export function installRelay(platform: Platform): void {
  let flags: FeatureFlags = { ...DEFAULT_FLAGS };

  // Load flags from storage — wrapped in try/catch for context invalidation
  try {
    chrome.storage.local.get('featureFlags').then((result) => {
      if (result.featureFlags) {
        flags = { ...DEFAULT_FLAGS, ...result.featureFlags };
      }
    }).catch(() => {
      // Context may have been invalidated between check and call
    });
  } catch {
    // Extension context already invalidated at startup
    return;
  }

  // Listen for flag updates — wrapped in try/catch
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.featureFlags?.newValue) {
        flags = { ...DEFAULT_FLAGS, ...changes.featureFlags.newValue };
      }
    });
  } catch {
    // Extension context invalidated
    return;
  }

  // Listen for messages from MAIN world interceptor
  window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;
    if (event.data?.type !== MSG_TYPE) return;

    // Check global kill switch AND per-platform flag
    if (!flags.capture.enabled) return;
    if (!flags.capture[platform]) return;

    // Check if extension context is still valid before sending
    if (!isContextValid()) return;

    // Forward to service worker
    try {
      chrome.runtime.sendMessage({
        action: 'ingest',
        platform: event.data.platform,
        conversationId: event.data.conversationId,
        messageId: event.data.messageId,
        role: event.data.role,
        content: event.data.content,
        model: event.data.model,
        timestamp: event.data.timestamp,
        tokenUsage: event.data.tokenUsage,
      }).catch(() => {
        // Service worker inactive or context invalidated — silently drop
      });
    } catch {
      // Synchronous throw from chrome.runtime.sendMessage — context invalidated
    }
  });
}
