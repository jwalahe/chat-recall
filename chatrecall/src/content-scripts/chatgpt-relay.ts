/**
 * ChatGPT relay — ISOLATED world content script.
 * Forwards intercepted messages from MAIN world to the service worker.
 */
import { installRelay } from './shared/relay-base';

installRelay('chatgpt');
