# ChatRecall — Technical Feasibility Research

## Table of Contents
1. [Export JSON Schemas](#1-export-json-schemas)
2. [API Response Shapes (Live Capture)](#2-api-response-shapes-live-capture)
3. [Local Embedding Models](#3-local-embedding-models-for-in-browser-semantic-search)
4. [Storage Options](#4-storage-options)
5. [Chrome Extension MV3 Constraints](#5-chrome-extension-manifest-v3-constraints)
6. [Open-Source Projects to Build On](#6-open-source-projects-to-build-on)
7. [Recommendations](#7-recommendations)

---

## 1. Export JSON Schemas

### ChatGPT Export (`conversations.json`)

ChatGPT exports a single `conversations.json` file containing an array of conversation objects. The structure uses a **tree-based `mapping`** to represent the conversation (branching is supported in ChatGPT):

```json
{
  "title": "Auth Flow Redesign",
  "create_time": 1710000000.0,
  "update_time": 1710003600.0,
  "mapping": {
    "aaa-111-message-id": {
      "id": "aaa-111-message-id",
      "message": {
        "id": "aaa-111-message-id",
        "author": { "role": "user", "metadata": {} },
        "create_time": 1710000000.0,
        "content": {
          "content_type": "text",
          "parts": ["I need to redesign the authentication flow"]
        },
        "metadata": {
          "model_slug": "gpt-4",
          "timestamp_": "absolute"
        }
      },
      "parent": "root-node-id",
      "children": ["bbb-222-message-id"]
    },
    "bbb-222-message-id": {
      "id": "bbb-222-message-id",
      "message": {
        "id": "bbb-222-message-id",
        "author": { "role": "assistant", "metadata": {} },
        "create_time": 1710000060.0,
        "content": {
          "content_type": "text",
          "parts": ["Here's an approach using JWT tokens..."]
        },
        "metadata": {
          "model_slug": "gpt-4",
          "finish_details": { "type": "stop" }
        }
      },
      "parent": "aaa-111-message-id",
      "children": []
    }
  },
  "moderation_results": [],
  "current_node": "bbb-222-message-id",
  "conversation_id": "conv-uuid-here"
}
```

**Key observations:**
- Messages are stored in a tree via `mapping`, not a flat array — must walk `parent`/`children` to reconstruct linear order
- `current_node` indicates the active branch leaf
- `parts` is an array; multimodal content has different `content_type` values (`text`, `code`, `image`)
- Timestamps are Unix floats
- `model_slug` identifies the model (`gpt-4`, `gpt-4o`, `o1-preview`, etc.)
- System messages have `author.role: "system"`

### Claude Export

Claude exports chat data in a ZIP file. The primary file is a JSON array of messages:

```json
[
  {
    "uuid": "msg-uuid-1",
    "text": "I need to redesign the authentication flow",
    "sender": "human",
    "created_at": "2024-03-10T00:00:00.000Z",
    "updated_at": "2024-03-10T00:00:00.000Z",
    "attachments": [],
    "files": [],
    "conversation": {
      "uuid": "conv-uuid-1",
      "name": "Auth Flow Redesign",
      "created_at": "2024-03-10T00:00:00.000Z",
      "updated_at": "2024-03-10T01:00:00.000Z",
      "model": "claude-3-opus-20240229"
    }
  },
  {
    "uuid": "msg-uuid-2",
    "text": "Here's an approach using JWT tokens...",
    "sender": "assistant",
    "created_at": "2024-03-10T00:01:00.000Z",
    "updated_at": "2024-03-10T00:01:00.000Z",
    "attachments": [],
    "files": [],
    "conversation": {
      "uuid": "conv-uuid-1",
      "name": "Auth Flow Redesign",
      "created_at": "2024-03-10T00:00:00.000Z",
      "updated_at": "2024-03-10T01:00:00.000Z",
      "model": "claude-3-opus-20240229"
    }
  }
]
```

**Key observations:**
- Flat array of messages (no tree structure) — simpler to parse than ChatGPT
- `sender` is `"human"` or `"assistant"`
- Each message embeds the full `conversation` object (denormalized)
- Timestamps are ISO 8601 strings
- `model` is on the conversation object, not per-message
- Attachments and files are separate arrays

### Gemini Export (Google Takeout)

Gemini exports via Google Takeout produce a ZIP/TGZ containing per-conversation JSON files:

```json
{
  "title": "Auth Flow Discussion",
  "entries": [
    {
      "startTimestamp": "2024-03-10T00:00:00.000Z",
      "parts": [
        { "text": "I need to redesign the authentication flow" }
      ],
      "role": "USER"
    },
    {
      "startTimestamp": "2024-03-10T00:01:00.000Z",
      "parts": [
        { "text": "Here's an approach using JWT tokens..." }
      ],
      "role": "MODEL"
    }
  ],
  "modelMetadata": {
    "modelId": "gemini-pro"
  }
}
```

**Key observations:**
- Each conversation is a separate file
- `entries` is a flat array of turns
- `role` is `"USER"` or `"MODEL"`
- `parts` array supports multimodal content (text, images)
- Less metadata than ChatGPT/Claude exports
- Gemini also supports `previous_interaction_id` for linked conversations via API

### Claude Code History (`~/.claude/history.jsonl`)

```jsonl
{"id":"session-id","type":"conversation","title":"Fix auth bug","messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}],"cwd":"/path/to/project","timestamp":"2024-03-10T00:00:00.000Z","model":"claude-sonnet-4-20250514"}
```

**Key observations:**
- Newline-delimited JSON (JSONL)
- Each line is a complete conversation with embedded messages
- Includes `cwd` (working directory context) — useful metadata for linking
- Standard `role`/`content` message format

---

## 2. API Response Shapes (Live Capture)

### claude.ai — Server-Sent Events (SSE)

Claude's web app uses SSE for streaming responses. The stream consists of typed events:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01XYZ","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"usage":{"input_tokens":25,"output_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Here's"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" an approach"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":150}}

event: message_stop
data: {"type":"message_stop"}
```

**Key fields:**
- `message.id` — unique message identifier
- `message.model` — model used
- Content is **delta-based** — accumulate `text_delta` events to build full response
- Event lifecycle: `message_start` → `content_block_start` → N × `content_block_delta` → `content_block_stop` → `message_delta` → `message_stop`
- Conversation ID is typically in the URL path: `/api/organizations/{org}/chat_conversations/{conv_id}/completion`

### chatgpt.com — Server-Sent Events (SSE)

ChatGPT's web app also uses SSE:

```
data: {"message":{"id":"msg-abc123","author":{"role":"assistant"},"content":{"content_type":"text","parts":["Here's"]},"metadata":{"model_slug":"gpt-4o","timestamp_":"absolute"},"create_time":1710000060.0},"conversation_id":"conv-uuid","error":null}

data: {"message":{"id":"msg-abc123","author":{"role":"assistant"},"content":{"content_type":"text","parts":["Here's an approach"]},"metadata":{"model_slug":"gpt-4o"},"create_time":1710000060.0},"conversation_id":"conv-uuid","error":null}

data: [DONE]
```

**Key fields:**
- `message.id` — message identifier
- `conversation_id` — conversation identifier (at top level)
- Content is **cumulative** — each event contains the full `parts` array so far
- `[DONE]` sentinel marks end of stream
- `model_slug` identifies the model
- No separate event types — just `data:` lines

### gemini.google.com — Proprietary Format

Gemini does NOT use standard SSE. It uses a proprietary streaming format:

```
)]}'

42
[["wrb.fr","XYZ","[[\"Here's\"]]",null,null,null,"generic"]]
```

**Key observations:**
- Responses are **length-prefixed** with a security prefix `)]}'`
- Body contains nested JSON arrays (not objects)
- Much harder to parse than Claude/ChatGPT
- Structure changes more frequently than the other platforms
- May require more frequent maintenance of the interceptor
- **Recommendation:** Prioritize Claude and ChatGPT for live capture MVP; add Gemini later or rely on export-only for Gemini initially

### Fetch/XHR Interceptor Pattern

Content script injected into the **MAIN world** to intercept API calls:

```javascript
// Injected into page context via content script (MAIN world)
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

  // Check if this is a chat API call we care about
  if (shouldIntercept(url)) {
    // Clone the response so the page still works
    const cloned = response.clone();

    // Read the stream and relay to extension
    processStream(cloned, url);
  }

  return response;
};

function shouldIntercept(url) {
  return (
    url?.includes('/chat_conversations/') ||  // Claude
    url?.includes('/conversation') ||           // ChatGPT
    url?.includes('/_/BardChatUi')              // Gemini
  );
}

async function processStream(response, url) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const events = parseSSEEvents(buffer);
    buffer = events.remaining;

    // Send parsed events to content script (ISOLATED world)
    // via window.postMessage, then to service worker via chrome.runtime
    window.postMessage({
      type: 'CHATRECALL_STREAM_DATA',
      source: detectPlatform(url),
      events: events.parsed
    }, '*');
  }
}
```

**Communication pipeline:**
1. MAIN world script intercepts fetch → `window.postMessage`
2. ISOLATED world content script listens → `chrome.runtime.sendMessage`
3. Service worker receives → normalizes → stores in IndexedDB

---

## 3. Local Embedding Models for In-Browser Semantic Search

### transformers.js (Recommended)

[transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face runs transformer models in the browser via ONNX Runtime WASM.

**Suitable models for embeddings:**

| Model | Size (ONNX) | Dimensions | Quality | Speed |
|-------|-------------|------------|---------|-------|
| `all-MiniLM-L6-v2` | ~23 MB | 384 | Good | Fast |
| `gte-small` | ~60 MB | 384 | Better | Medium |
| `bge-small-en-v1.5` | ~60 MB | 384 | Better | Medium |
| `all-MiniLM-L12-v2` | ~46 MB | 384 | Good+ | Medium |
| `gte-base` | ~110 MB | 768 | Best | Slow |

**Recommendation:** `all-MiniLM-L6-v2` for MVP — 23MB is acceptable for an extension, 384-dim vectors are compact, and quality is sufficient for chat search.

**Usage example:**
```javascript
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function embed(text) {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data); // Float32Array → regular array
}
```

### Extension Context Constraints

- **Service worker:** Cannot run transformers.js (no DOM, limited WASM support)
- **Offscreen document:** Best option — create via `chrome.offscreen.createDocument()`, load the model there, communicate via message passing
- **Content script:** Could work but adds to page weight and may conflict
- **Side panel:** Could work but ties computation to UI lifecycle

**Recommended architecture:**
```
Service Worker ──message──→ Offscreen Document (runs transformers.js)
     ↑                              │
     └──────── embeddings ──────────┘
```

### Chunking Strategy

Long conversations need to be chunked for embedding (model max ~512 tokens):

1. Split conversation into **message-level chunks** (each user/assistant turn)
2. For very long messages, split into ~512 token passages with overlap
3. Store chunk embeddings with metadata (conversation ID, message index, platform)
4. At search time, find matching chunks, then return the parent conversation

---

## 4. Storage Options

### IndexedDB (via `idb` wrapper)

**Pros:**
- Universal browser support
- No size limit with `unlimitedStorage` permission
- Stores structured data natively (objects, arrays, blobs)
- Can store Float32Arrays (vector embeddings) directly
- Transactional, crash-safe
- Works in service worker, content scripts, offscreen documents

**Cons:**
- No SQL — must build query patterns with indexes and cursors
- No built-in full-text search (must implement with MiniSearch or similar)
- Can be slow for complex queries over large datasets
- API is awkward without a wrapper

**Best for:** MVP phase — simple key-value and index-based lookups, sufficient for thousands of conversations

### sql.js (SQLite compiled to WASM)

**Pros:**
- Full SQL support including FTS5 (full-text search)
- Familiar query language
- Complex joins and aggregations
- ~1 MB WASM bundle

**Cons:**
- Runs **in-memory** — must serialize entire database to IndexedDB or OPFS for persistence
- Serialization can be slow for large databases
- No concurrent access across extension contexts
- Memory pressure for large datasets

### wa-sqlite + OPFS

**Pros:**
- SQLite with **persistent storage** via Origin Private File System
- Better performance than sql.js for large datasets (no full serialization)
- OPFS has good browser support (Chrome 102+, Firefox 111+, Safari 15.2+)
- Supports concurrent reads

**Cons:**
- More complex setup
- OPFS only works in dedicated workers (not service worker directly)
- Less mature ecosystem than IndexedDB

### Recommendation

```
Phase 1 (MVP):
  IndexedDB (via idb) + MiniSearch (full-text) + brute-force cosine similarity
  → Simple, fast to implement, handles thousands of conversations fine

Phase 2 (Scale):
  wa-sqlite + OPFS + usearch (vector ANN)
  → When dataset exceeds ~5,000 conversations or search gets slow

Phase 3 (Power):
  wa-sqlite + FTS5 + usearch + auto-summarization
  → Full SQL queries, fast vector search, compressed older chats
```

---

## 5. Chrome Extension Manifest V3 Constraints

### Content Script World Injection

MV3 supports injecting content scripts into the page's **MAIN world** (required for fetch/XHR interception):

```json
{
  "content_scripts": [
    {
      "matches": ["*://claude.ai/*"],
      "js": ["content-scripts/claude-interceptor.js"],
      "world": "MAIN",
      "run_at": "document_start"
    },
    {
      "matches": ["*://claude.ai/*"],
      "js": ["content-scripts/claude-relay.js"],
      "world": "ISOLATED",
      "run_at": "document_start"
    }
  ]
}
```

**Two-script pattern:**
1. **MAIN world script** — overrides `fetch`/`XHR`, posts messages to window
2. **ISOLATED world script** — listens for window messages, relays to service worker via `chrome.runtime.sendMessage`

This is necessary because MAIN world scripts cannot access `chrome.*` APIs.

### Service Worker Lifecycle

- Service worker is **ephemeral** — Chrome can terminate it after ~30 seconds of inactivity
- **Mitigations:**
  - Use `chrome.storage.local` or IndexedDB for state (not in-memory variables)
  - Register `chrome.runtime.onMessage` listeners synchronously at top level
  - Use `chrome.alarms` for periodic tasks (not `setInterval`)
  - The service worker restarts on events (messages, alarms, etc.)

### Host Permissions

```json
{
  "host_permissions": [
    "*://claude.ai/*",
    "*://chatgpt.com/*",
    "*://gemini.google.com/*"
  ],
  "permissions": [
    "storage",
    "unlimitedStorage",
    "sidePanel",
    "offscreen"
  ]
}
```

**Notes:**
- `host_permissions` are required for content script injection
- Users see these permissions during install — keep the list minimal
- `unlimitedStorage` removes the 10MB cap on `chrome.storage.local` and gives more IndexedDB room
- `offscreen` permission needed for the embedding computation document
- `sidePanel` for the main UI

### Offscreen Documents

```javascript
// In service worker
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['WORKERS'],  // or 'DOM_SCRAPING', 'BLOBS', etc.
  justification: 'Running ML model for semantic search embeddings'
});

// Only ONE offscreen document allowed at a time
// It persists until explicitly closed or the service worker is terminated
```

### Storage Quotas

| Storage | Limit | Notes |
|---------|-------|-------|
| `chrome.storage.local` | 10 MB (default), unlimited with permission | Sync access, JSON only |
| `chrome.storage.session` | 10 MB | Service worker session only |
| IndexedDB | Browser-managed (~unlimited) | Best for large data |
| OPFS | Browser-managed (~unlimited) | Best for SQLite persistence |

---

## 6. Open-Source Projects to Build On

### Extension Framework: WXT

[WXT](https://wxt.dev) — Modern, Vite-based extension framework with first-class MV3 support.

- TypeScript-first with auto-imports
- File-based entrypoint system (content scripts, background, popup, etc.)
- Built-in support for multiple browsers (Chrome, Firefox, Safari)
- Hot module reloading in development
- Active community, well-maintained

**vs Plasmo:** WXT has better Vite integration, simpler configuration, and more control over the build. Plasmo is more opinionated and has some React-specific assumptions.

**vs Raw:** WXT saves weeks of boilerplate — manifest generation, HMR, multi-browser builds.

### SSE Parsing: eventsource-parser

[eventsource-parser](https://github.com/rexxars/eventsource-parser) — Parse SSE streams into structured events.

```javascript
import { createParser } from 'eventsource-parser';

const parser = createParser((event) => {
  if (event.type === 'event') {
    console.log(event.data); // Parsed SSE data
    console.log(event.event); // Event type (e.g., 'content_block_delta')
  }
});

// Feed chunks as they arrive
parser.feed(chunk);
```

### Full-Text Search: MiniSearch

[MiniSearch](https://github.com/lucamel/minisearch) — Lightweight (~7KB) full-text search for client-side use.

```javascript
import MiniSearch from 'minisearch';

const miniSearch = new MiniSearch({
  fields: ['title', 'text'],        // Fields to index
  storeFields: ['title', 'platform', 'date'], // Fields to return
  searchOptions: {
    boost: { title: 2 },             // Title matches worth more
    fuzzy: 0.2                        // Fuzzy matching tolerance
  }
});

miniSearch.addAll(conversations);
const results = miniSearch.search('auth flow');
```

### IndexedDB Wrapper: idb

[idb](https://github.com/jakearchibald/idb) — Tiny promise-based IndexedDB wrapper by Jake Archibald.

```javascript
import { openDB } from 'idb';

const db = await openDB('chatrecall', 1, {
  upgrade(db) {
    const store = db.createObjectStore('conversations', { keyPath: 'id' });
    store.createIndex('platform', 'platform');
    store.createIndex('updatedAt', 'updatedAt');
    store.createIndex('accessScore', 'accessScore');
  }
});

await db.put('conversations', conversationData);
const recent = await db.getAllFromIndex('conversations', 'updatedAt', IDBKeyRange.lowerBound(weekAgo));
```

### Vector Search: usearch

[usearch](https://github.com/unum-cloud/usearch) — Fast approximate nearest neighbor search with WASM build.

- Supports WASM (runs in browser/extension)
- HNSW algorithm — fast for high-dimensional vectors
- Small footprint
- Can persist index to IndexedDB

**Alternative:** For MVP, brute-force cosine similarity over a few thousand 384-dim vectors is fast enough (~1ms for 1000 vectors). Only need ANN when dataset grows large.

### Other Useful Libraries

| Library | Purpose |
|---------|---------|
| `date-fns` | Date formatting and relative time |
| `nanoid` | Generate unique IDs |
| `zustand` | State management for side panel UI |
| `preact` | Lightweight React alternative for extension UI (3KB) |

---

## 7. Recommendations

### Decision Table

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Extension framework | **WXT** | Best MV3 support, Vite-based, TypeScript-first, active community |
| UI framework | **Preact** or **SolidJS** | Lightweight (~3KB), React-compatible (Preact), fast rendering |
| Storage (MVP) | **IndexedDB via idb** | Simplest, universal support, sufficient for thousands of conversations |
| Storage (scale) | **wa-sqlite + OPFS** | When >5,000 conversations need SQL queries |
| Full-text search | **MiniSearch** | Lightweight (~7KB), client-side, fuzzy matching |
| Embeddings | **transformers.js + all-MiniLM-L6-v2** | 23MB model, 384-dim, runs in offscreen document |
| Vector search (MVP) | **Brute-force cosine similarity** | Fast enough for <5K vectors |
| Vector search (scale) | **usearch WASM** | ANN when dataset grows |
| SSE parsing | **eventsource-parser** | Battle-tested, handles edge cases |
| Live capture | **MAIN world content scripts** | Required to intercept page fetch calls |

### Three-Phase Implementation Plan

**Phase 1 — MVP (Weeks 1-4):**
- WXT project setup with TypeScript
- Export parsers for ChatGPT + Claude JSON formats
- IndexedDB storage with idb
- Basic keyword search via MiniSearch
- Side panel UI with conversation list and detail view
- Live capture for Claude and ChatGPT (fetch interception)
- Per-platform capture toggles

**Phase 2 — Intelligence (Weeks 5-8):**
- Semantic search via transformers.js embeddings
- Offscreen document for embedding computation
- Background embedding of stored conversations
- Improved search with semantic + keyword fusion
- Gemini export parser
- Gemini live capture (if format is stable enough)

**Phase 3 — Polish (Weeks 9-12):**
- Chain-of-thought detection (topic clustering across conversations)
- Auto-summarization of older conversations
- LRU scoring and intelligent surfacing
- wa-sqlite migration for power users
- Claude Code history import
- Firefox support

### Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Platform API changes break interceptors | High | Medium | Abstract per-platform parsers, version detection, community reports |
| Embedding model too slow in browser | Medium | Low | Use smallest model, compute lazily, cache aggressively |
| IndexedDB performance at scale | Medium | Medium | Plan wa-sqlite migration path from day one |
| Gemini's proprietary format is unstable | Medium | High | Deprioritize Gemini live capture, rely on export for MVP |
| Chrome Web Store rejection (permissions) | High | Low | Minimal permissions, clear privacy policy, open source |
| User trust concerns | High | Medium | Open source, no network calls, clear data controls, privacy-first messaging |

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │claude.ai │  │chatgpt   │  │gemini    │      │
│  │  (tab)   │  │  (tab)   │  │  (tab)   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐      │
│  │MAIN world│  │MAIN world│  │MAIN world│      │
│  │intercept │  │intercept │  │intercept │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐      │
│  │ISOLATED  │  │ISOLATED  │  │ISOLATED  │      │
│  │relay     │  │relay     │  │relay     │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│       └──────────────┼──────────────┘             │
│                      ▼                            │
│            ┌─────────────────┐                    │
│            │ Service Worker  │                    │
│            │  (normalize +   │                    │
│            │   store)        │                    │
│            └───────┬─────────┘                    │
│                    │                              │
│         ┌──────────┼──────────┐                   │
│         ▼          ▼          ▼                   │
│  ┌──────────┐ ┌────────┐ ┌────────┐             │
│  │IndexedDB │ │Offscr. │ │Side   │             │
│  │(storage) │ │Doc     │ │Panel  │             │
│  │          │ │(embed) │ │(UI)   │             │
│  └──────────┘ └────────┘ └────────┘             │
└─────────────────────────────────────────────────┘
```

---

## Appendix A: Unified Conversation Schema

The normalized schema that all platform data maps into:

```typescript
interface Conversation {
  id: string;                    // Internal unique ID (nanoid)
  externalId: string;            // Platform's conversation ID
  platform: 'claude' | 'chatgpt' | 'gemini' | 'claude-code';
  title: string;                 // Auto-generated or from export
  messages: Message[];
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  lastAccessedAt: string;        // For LRU scoring
  accessCount: number;           // For frequency scoring
  accessScore: number;           // Computed LRU score
  model: string;                 // Primary model used
  summary?: string;              // Auto-generated summary
  tags?: string[];               // Auto-extracted topics
  embedding?: Float32Array;      // Conversation-level embedding
  source: 'live-capture' | 'import';
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;                    // Internal unique ID
  externalId: string;            // Platform's message ID
  role: 'user' | 'assistant' | 'system';
  content: string;               // Plain text content
  createdAt: string;             // ISO 8601
  model?: string;                // Model for this specific message
  embedding?: Float32Array;      // Message-level embedding
  metadata?: Record<string, unknown>;
}
```

## Appendix B: Platform Detection

```typescript
function detectPlatform(url: string): Platform {
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('gemini.google.com')) return 'gemini';
  throw new Error(`Unknown platform for URL: ${url}`);
}

const INTERCEPT_PATTERNS = {
  claude: /\/api\/organizations\/[^/]+\/chat_conversations\/[^/]+\/completion/,
  chatgpt: /\/backend-api\/conversation$/,
  gemini: /\/_\/BardChatUi/
};
```
