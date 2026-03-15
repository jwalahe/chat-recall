/**
 * Claude.ai relay — ISOLATED world content script.
 * Injects the MAIN world interceptor and forwards captured messages to the service worker.
 */
import { installRelay } from '../lib/relay-base';

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  runAt: 'document_start',
  main(ctx) {
    if (ctx.isInvalid) return;
    injectScript('/claude-interceptor.js');
    installRelay('claude');
  },
});
