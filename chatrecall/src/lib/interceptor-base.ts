/**
 * Shared fetch/XHR interception logic.
 *
 * Injected into MAIN world to override window.fetch and intercept
 * chat API responses. Each platform-specific interceptor imports this
 * and provides its own stream processor.
 */

import { MSG_TYPE } from '../utils/constants';
import type { TokenUsage } from './types';

export interface EmittedMessage {
  platform: string;
  action: 'message_complete' | 'user_message';
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
  tokenUsage?: TokenUsage;
}

/**
 * Emit an intercepted message to the ISOLATED world relay via window.postMessage.
 */
export function emitToRelay(msg: EmittedMessage): void {
  window.postMessage(
    {
      type: MSG_TYPE,
      ...msg,
    },
    '*'
  );
}

/**
 * Install a fetch interceptor that calls the processor for matching URLs.
 *
 * @param shouldIntercept - Function that returns true if the URL should be intercepted
 * @param processResponse - Async function that processes the cloned response stream
 * @param processRequest - Optional function to capture outgoing user messages from request body
 */
export function installFetchInterceptor(
  shouldIntercept: (url: string) => boolean,
  processResponse: (response: Response, url: string) => Promise<void>,
  processRequest?: (url: string, init: RequestInit | undefined) => void
): void {
  const originalFetch = window.fetch;

  console.debug('[ChatRecall] Fetch interceptor installed');

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Log API calls to help debug interception patterns
    if (url.includes('/api/') && init?.method === 'POST') {
      console.debug('[ChatRecall] POST fetch:', url, 'intercepted:', shouldIntercept(url));
    }

    // Capture outgoing user message from request body
    if (shouldIntercept(url) && processRequest && init) {
      try {
        processRequest(url, init);
      } catch {
        // Don't break the page if request capture fails
      }
    }

    const response = await originalFetch.call(this, input, init);

    if (shouldIntercept(url)) {
      console.debug('[ChatRecall] Intercepting response from:', url);
      // Clone so the page's response is unaffected
      const cloned = response.clone();
      processResponse(cloned, url).catch((err) => {
        console.warn('[ChatRecall] Stream processing error:', err);
      });
    }

    return response;
  };
}
