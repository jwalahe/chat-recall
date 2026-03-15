/**
 * ChatGPT relay — ISOLATED world content script.
 * Injects the MAIN world interceptor and forwards captured messages to the service worker.
 */
import { installRelay } from '../lib/relay-base';

export default defineContentScript({
  matches: ['*://chatgpt.com/*'],
  runAt: 'document_start',
  main(ctx) {
    if (ctx.isInvalid) return;

    try {
      injectScript('/chatgpt-interceptor.js');
    } catch {
      // Extension context invalidated — chrome.runtime.getURL() threw.
      // The interceptor won't be injected, but we still install the relay
      // in case an interceptor from a prior injection is already present.
    }

    installRelay('chatgpt');
  },
});
