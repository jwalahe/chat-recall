/**
 * ChatGPT fetch interceptor — MAIN world content script.
 *
 * Overrides window.fetch to intercept SSE responses from ChatGPT's chat API.
 * ChatGPT uses cumulative parts: each SSE event contains the full message so far.
 * We take the last event before [DONE] as the complete message.
 */

import { installFetchInterceptor, emitToRelay } from './shared/interceptor-base';
import { INTERCEPT_PATTERNS } from '../utils/constants';

function shouldIntercept(url: string): boolean {
  return INTERCEPT_PATTERNS.chatgpt.test(url);
}

async function processResponse(response: Response, url: string): Promise<void> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastMessage: {
    messageId: string;
    conversationId: string;
    content: string;
    model: string;
    role: string;
    timestamp: number;
  } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();

      if (payload === '[DONE]') {
        // Stream complete — emit the last accumulated message
        if (lastMessage) {
          emitToRelay({
            platform: 'chatgpt',
            action: 'message_complete',
            conversationId: lastMessage.conversationId,
            messageId: lastMessage.messageId,
            role: 'assistant',
            content: lastMessage.content,
            model: lastMessage.model,
            timestamp: lastMessage.timestamp,
          });
        }
        return;
      }

      try {
        const data = JSON.parse(payload);
        if (!data.message) continue;

        const msg = data.message;
        if (msg.author?.role !== 'assistant') continue;

        // Cumulative: each event has the full content so far
        const content = msg.content?.parts
          ?.filter((p: unknown): p is string => typeof p === 'string')
          ?.join('') || '';

        lastMessage = {
          messageId: msg.id || '',
          conversationId: data.conversation_id || '',
          content,
          model: msg.metadata?.model_slug || '',
          role: msg.author.role,
          timestamp: msg.create_time ? msg.create_time * 1000 : Date.now(),
        };
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // If stream ended without [DONE], emit what we have
  if (lastMessage) {
    emitToRelay({
      platform: 'chatgpt',
      action: 'message_complete',
      conversationId: lastMessage.conversationId,
      messageId: lastMessage.messageId,
      role: 'assistant',
      content: lastMessage.content,
      model: lastMessage.model,
      timestamp: lastMessage.timestamp,
    });
  }
}

function processRequest(url: string, init: RequestInit | undefined): void {
  if (!init?.body || typeof init.body !== 'string') return;

  try {
    const body = JSON.parse(init.body);
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const content = lastMsg.content?.parts
      ?.filter((p: unknown): p is string => typeof p === 'string')
      ?.join('') || '';

    if (!content) return;

    emitToRelay({
      platform: 'chatgpt',
      action: 'user_message',
      conversationId: body.conversation_id || '',
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

// Install the interceptor
installFetchInterceptor(shouldIntercept, processResponse, processRequest);
