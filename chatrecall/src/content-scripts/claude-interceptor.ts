/**
 * Claude.ai fetch interceptor — MAIN world content script.
 *
 * Overrides window.fetch to intercept SSE responses from Claude's chat API.
 * Claude uses delta-based SSE: we accumulate content_block_delta events
 * to reconstruct the full assistant message.
 */

import { installFetchInterceptor, emitToRelay } from './shared/interceptor-base';
import { parseSSE } from '../utils/sse-parser';
import { INTERCEPT_PATTERNS } from '../utils/constants';

function shouldIntercept(url: string): boolean {
  return INTERCEPT_PATTERNS.claude.test(url);
}

function extractConversationId(url: string): string {
  const match = url.match(/chat_conversations\/([^/]+)/);
  return match?.[1] ?? '';
}

async function processResponse(response: Response, url: string): Promise<void> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let messageId = '';
  let model = '';
  const contentBlocks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, remaining } = parseSSE(buffer);
    buffer = remaining;

    for (const event of events) {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'message_start':
            messageId = data.message?.id ?? '';
            model = data.message?.model ?? '';
            contentBlocks.length = 0;
            break;

          case 'content_block_start':
            contentBlocks[data.index] = '';
            break;

          case 'content_block_delta':
            if (data.delta?.type === 'text_delta' && data.delta.text) {
              contentBlocks[data.index] =
                (contentBlocks[data.index] || '') + data.delta.text;
            }
            break;

          case 'message_stop':
            emitToRelay({
              platform: 'claude',
              action: 'message_complete',
              conversationId: extractConversationId(url),
              messageId,
              role: 'assistant',
              content: contentBlocks.join('\n'),
              model,
              timestamp: Date.now(),
            });
            break;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

function processRequest(url: string, init: RequestInit | undefined): void {
  if (!init?.body || typeof init.body !== 'string') return;

  try {
    const body = JSON.parse(init.body);
    const prompt = body.prompt || body.message || '';
    if (!prompt) return;

    emitToRelay({
      platform: 'claude',
      action: 'user_message',
      conversationId: extractConversationId(url),
      messageId: `user-${Date.now()}`,
      role: 'user',
      content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
      model: '',
      timestamp: Date.now(),
    });
  } catch {
    // Non-JSON body or missing fields
  }
}

// Install the interceptor
installFetchInterceptor(shouldIntercept, processResponse, processRequest);
