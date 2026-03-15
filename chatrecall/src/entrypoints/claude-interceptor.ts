/**
 * Claude.ai fetch interceptor — MAIN world unlisted script.
 *
 * Injected by the claude-relay content script into the page's MAIN world.
 * Overrides window.fetch to intercept SSE responses from Claude's chat API.
 * Claude uses delta-based SSE: we accumulate content_block_delta events
 * to reconstruct the full assistant message.
 */

import { installFetchInterceptor, emitToRelay } from '../lib/interceptor-base';
import { parseSSE } from '../utils/sse-parser';
import { INTERCEPT_PATTERNS } from '../utils/constants';
import type { TokenUsage } from '../lib/types';

export default defineUnlistedScript(() => {
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
    let tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

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
              tokenUsage = { inputTokens: 0, outputTokens: 0 };

              // Capture initial token counts from message_start
              if (data.message?.usage) {
                const u = data.message.usage;
                tokenUsage.inputTokens = u.input_tokens ?? 0;
                tokenUsage.outputTokens = u.output_tokens ?? 0;
                tokenUsage.cacheReadTokens = u.cache_read_input_tokens ?? 0;
                tokenUsage.cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
              }
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

            case 'message_delta':
              // Cumulative output tokens + stop reason from message_delta
              if (data.usage) {
                tokenUsage.outputTokens = data.usage.output_tokens ?? tokenUsage.outputTokens;
              }
              if (data.delta?.stop_reason) {
                tokenUsage.stopReason = data.delta.stop_reason;
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
                tokenUsage: tokenUsage.inputTokens > 0 || tokenUsage.outputTokens > 0
                  ? tokenUsage
                  : undefined,
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
      // Claude.ai may use 'prompt' (text), 'message' (text), or 'messages' (array)
      let content = '';
      if (typeof body.prompt === 'string' && body.prompt) {
        content = body.prompt;
      } else if (typeof body.message === 'string' && body.message) {
        content = body.message;
      } else if (Array.isArray(body.messages) && body.messages.length > 0) {
        // Extract the last user message from a messages array
        const lastMsg = body.messages[body.messages.length - 1];
        content = typeof lastMsg === 'string'
          ? lastMsg
          : lastMsg?.content || JSON.stringify(lastMsg);
      }
      if (!content) return;

      emitToRelay({
        platform: 'claude',
        action: 'user_message',
        conversationId: extractConversationId(url),
        messageId: `user-${Date.now()}`,
        role: 'user',
        content,
        model: '',
        timestamp: Date.now(),
      });
    } catch {
      // Non-JSON body or missing fields
    }
  }

  installFetchInterceptor(shouldIntercept, processResponse, processRequest);
});
