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
    injectScript('/chatgpt-interceptor.js');
    installRelay('chatgpt');
  },
});
