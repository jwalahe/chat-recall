/**
 * ChatGPT relay — ISOLATED world content script.
 * Injects the MAIN world interceptor and forwards captured messages to the service worker.
 */
import { installRelay } from '../lib/relay-base';
import { suppressContextInvalidatedErrors } from '../lib/suppress-errors';

export default defineContentScript({
  matches: ['*://chatgpt.com/*'],
  runAt: 'document_start',
  main() {
    // Suppress "Extension context invalidated" errors thrown by the WXT
    // runtime after the extension is reloaded/updated.  These are harmless
    // but show up as uncaught errors in the Extensions error panel.
    suppressContextInvalidatedErrors();

    try {
      injectScript('/chatgpt-interceptor.js');
    } catch {
      // Extension context invalidated — chrome.runtime.getURL() threw.
      // The interceptor won't be injected, but we still install the relay
      // in case an interceptor from a prior injection is already present.
    }

    // Always install the relay. It handles context invalidation internally
    // via isContextValid() checks before sending messages.
    installRelay('chatgpt');
  },
});
