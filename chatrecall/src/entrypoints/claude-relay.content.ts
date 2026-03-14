/**
 * Claude.ai relay — ISOLATED world content script.
 * Injects the MAIN world interceptor and forwards captured messages to the service worker.
 */
import { installRelay } from '../lib/relay-base';

export default defineContentScript({
  matches: ['*://claude.ai/*'],
  main() {
    injectScript('/claude-interceptor.js');
    installRelay('claude');
  },
});
