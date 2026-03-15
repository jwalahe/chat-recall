/**
 * Lightweight SSE (Server-Sent Events) parser.
 *
 * Parses a stream of text into structured SSE events.
 * Handles multi-line data fields and event types.
 */

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface ParseResult {
  events: SSEEvent[];
  remaining: string;
}

/**
 * Parse SSE text buffer into structured events.
 *
 * @param buffer - Raw SSE text (may contain partial events)
 * @returns Parsed events and remaining unparsed text
 */
export function parseSSE(buffer: string): ParseResult {
  const events: SSEEvent[] = [];

  // Normalize \r\n and lone \r to \n so splitting works uniformly
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');

  // Last block may be incomplete — keep it as remaining
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let event = '';
    let data = '';
    let id: string | undefined;
    let retry: number | undefined;

    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += (data ? '\n' : '') + line.slice(5).trim();
      } else if (line.startsWith('id:')) {
        id = line.slice(3).trim();
      } else if (line.startsWith('retry:')) {
        retry = parseInt(line.slice(6).trim(), 10);
      }
    }

    if (data) {
      events.push({ event: event || 'message', data, id, retry });
    }
  }

  return { events, remaining };
}

/**
 * Create a streaming SSE reader that calls a callback for each event.
 */
export function createSSEReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
  onDone?: () => void
): void {
  const decoder = new TextDecoder();
  let buffer = '';

  async function read() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Parse any remaining buffer
          if (buffer.trim()) {
            const { events } = parseSSE(buffer + '\n\n');
            events.forEach(onEvent);
          }
          onDone?.();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSE(buffer);
        buffer = remaining;
        events.forEach(onEvent);
      }
    } catch (err) {
      console.warn('[ChatRecall] SSE reader error:', err);
      onDone?.();
    }
  }

  read();
}
