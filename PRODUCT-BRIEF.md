# ChatRecall — Product Brief

> Search and reconnect with your AI chat history across Claude, ChatGPT, and Gemini.

## Vision

ChatRecall is an open-source browser extension that turns your scattered AI conversation history into a searchable, connected knowledge base — entirely on your machine.

Power users of AI chat tools accumulate hundreds of conversations across multiple platforms. These conversations contain decisions, code designs, debugging sessions, and chains of thought — but they're effectively lost because there's no way to search across platforms, no way to see what you were working on last week, and no way to trace how an idea evolved across multiple chats.

ChatRecall solves this by silently capturing your AI conversations as you chat, storing them locally, and making them instantly searchable by meaning — not just keywords.

## Core Product

### How It Works

1. **Install** — one click from Chrome Web Store. No signup, no configuration.
2. **Chat normally** — the extension silently captures API responses from Claude and ChatGPT as you use them.
3. **Search later** — open the side panel, type a vague query like "that auth thing," and find it instantly across all platforms.

### Two Data Ingestion Modes

- **Live capture (default, on):** Content scripts intercept chat API responses in real-time. Zero friction, always up to date. User-controlled per platform.
- **Manual import (fallback):** Drag-and-drop JSON exports from Claude, ChatGPT, or Gemini for bulk historical data.

### Key Features

| Feature | Description | Phase |
|---------|-------------|-------|
| Live capture | Intercept Claude + ChatGPT API responses in real-time | MVP |
| Manual import | Parse JSON exports from Claude, ChatGPT, Gemini | MVP |
| Keyword search | Full-text search via MiniSearch (~7KB, fuzzy matching) | MVP |
| LRU-sorted overview | Recent and frequently accessed conversations surface first | MVP |
| Per-platform toggles | Control which platforms are captured | MVP |
| Semantic search | Find chats by meaning via local embeddings (transformers.js) | Phase 2 |
| Chain-of-thought | Detect and link related conversations across platforms | Phase 2 |
| Auto-summarization | Older conversations get extractive summaries | Phase 2 |
| Gemini live capture | Intercept Gemini's proprietary response format | Phase 3 |

## Architecture Summary

### Extension Components

```
Content Scripts (MAIN world)     → Intercept fetch/XHR on chat pages
Content Scripts (ISOLATED world) → Relay intercepted data to service worker
Service Worker                   → Normalize, store, coordinate search
Offscreen Document              → Run embedding model (Phase 2)
Side Panel                      → Preact UI for browsing and searching
IndexedDB                       → Local storage for all conversation data
chrome.storage.local            → Feature flags and settings
```

### Data Flow

```
User chats on claude.ai
  → MAIN world script intercepts fetch response
  → Parses SSE stream (delta-based for Claude, cumulative for ChatGPT)
  → Emits complete message via window.postMessage
  → ISOLATED world relay checks feature flags
  → Forwards to service worker via chrome.runtime.sendMessage
  → Service worker normalizes to unified schema
  → Stores in IndexedDB
  → Indexes for keyword search
```

### Unified Data Model

All platform data normalizes into:
- **Conversation**: id, platform, title, messages, timestamps, LRU score, tags, embedding
- **Message**: id, role (user/assistant), content, timestamp, model
- **ConversationThread**: links related conversations across platforms (Phase 2)

### Platform-Specific Parsing

| Platform | Stream Format | Strategy |
|----------|--------------|----------|
| Claude | SSE, delta-based | Accumulate `content_block_delta` events |
| ChatGPT | SSE, cumulative | Take last event before `[DONE]` |
| Gemini | Proprietary, length-prefixed | Phase 3 (unstable format) |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Extension framework | WXT (Vite-based, MV3) |
| UI | Preact (~3KB) |
| Storage | IndexedDB via idb |
| Keyword search | MiniSearch (~7KB) |
| SSE parsing | eventsource-parser |
| Embeddings (Phase 2) | transformers.js + all-MiniLM-L6-v2 |
| Testing | Vitest |
| Language | TypeScript (strict) |

## UX Design

### Side Panel Layout

The extension opens as a Chrome side panel (~400px wide):

- **Search bar** — always visible at top, keyword search (semantic in Phase 2)
- **Platform filter tabs** — All | Claude | ChatGPT | Gemini
- **Conversation cards** — LRU-sorted, grouped by time (Today, This Week, This Month, Older)
- **Card anatomy** — Title, platform badge (color-coded), relative time, message count, preview snippet
- **Conversation detail** — Full message history, "Open in [Platform]" link, copy/export
- **Status bar** — Total count, live capture status

### Key UX Decisions

1. **Zero-configuration start** — Live capture is ON by default. Value accumulates silently.
2. **The "aha moment"** — First time user opens the panel hours after install, their conversations are already there and searchable.
3. **Semantic vs keyword distinction (Phase 2)** — Semantic results show "Related to: [topic]"; keyword results highlight matching terms.
4. **Chain-of-thought timeline (Phase 2)** — Vertical timeline connecting related conversations across platforms with annotations explaining the link.

## Trust & Privacy

ChatRecall's biggest challenge is trust. Browser extensions that intercept API responses carry inherent risk (ref: Microsoft March 2026 report on malicious extensions).

Our answer:

1. **Open source** — Every line of code is auditable. Content script behavior is transparent.
2. **Zero network** — The extension makes ZERO outbound network requests. All data stays in IndexedDB on the user's machine. No accounts, no cloud, no telemetry.
3. **User control** — Per-platform capture toggles. Global kill switch. Clear data per platform.
4. **Minimal permissions** — Only `host_permissions` for the three chat domains, `storage`, `sidePanel`, `offscreen`.
5. **Privacy policy** — "ChatRecall stores all data locally on your device. No data is transmitted to any server. Ever."

## MVP Scope

**Ship when:**
- Live capture works for Claude and ChatGPT
- Manual import works for both platforms' JSON exports
- Keyword search finds conversations across platforms
- Side panel shows LRU-sorted conversation list with detail view
- Per-platform capture toggles work
- Zero network requests verifiable in DevTools

**Explicitly deferred:**
- Semantic search, Gemini support, chain-of-thought, auto-summarization, Firefox

## Phased Rollout

### Phase 1 (Weeks 1-4): MVP
Foundation + parsers + live capture + keyword search + UI

### Phase 2 (Weeks 5-8): Intelligence
Semantic search + chain-of-thought + Gemini import + auto-summarization

### Phase 3 (Weeks 9-12): Polish
Gemini live capture + Claude Code import + wa-sqlite + Firefox + keyboard shortcuts

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Platform API changes break interceptors | Abstract per-platform parsers, community-reported breakage |
| Chrome Web Store rejects permissions | Clear privacy policy, open source, minimal permissions |
| User trust concerns | Open source, zero network, clear data controls |
| Gemini format instability | Defer Gemini live capture, rely on export |
| IndexedDB performance at scale | wa-sqlite migration path planned for Phase 3 |

## Open Source Strategy

- **License:** MIT
- **Repository:** Public from day one
- **CI/CD:** GitHub Actions (build + lint + test on every PR)
- **Contributing:** PRs welcome, code review required for capture logic

## Success Metrics

1. **Adoption:** Chrome Web Store installs
2. **Retention:** % of users who open the side panel more than once per week
3. **Trust:** GitHub stars, security audit PRs
4. **Value:** Average conversations captured per user, search queries per session

---

*Built for people who think in branches, not lines. ChatRecall makes your AI conversation history as searchable and navigable as your file system.*
