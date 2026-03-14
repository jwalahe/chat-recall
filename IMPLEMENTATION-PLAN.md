# ChatRecall — Implementation Plan

## Table of Contents
1. [Tech Stack](#1-tech-stack)
2. [MVP Scope (Phase 1)](#2-mvp-scope-phase-1)
3. [Phase 2 Scope](#3-phase-2-scope)
4. [Phase 3 Scope](#4-phase-3-scope)
5. [Project Structure](#5-project-structure)
6. [Implementation Order](#6-implementation-order)
7. [Open-Source Strategy](#7-open-source-strategy)

---

## 1. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Extension Framework | **WXT** (wxt.dev) | Vite-based, MV3-first, TypeScript, auto-manifest generation, HMR |
| UI Framework | **Preact** | React-compatible API at ~3KB, fast rendering for side panel |
| Storage | **idb** (IndexedDB wrapper) | Promise-based, tiny, universal extension support |
| Keyword Search | **MiniSearch** | ~7KB, client-side full-text search with fuzzy matching |
| SSE Parsing | **eventsource-parser** | Battle-tested SSE stream parser |
| IDs | **nanoid** | Tiny, URL-safe unique ID generator |
| Package Manager | **pnpm** | Fast, disk-efficient |
| Testing | **Vitest** | Vite-native, fast, compatible with WXT |
| Linting | **ESLint + Prettier** | Standard TypeScript linting |
| Language | **TypeScript 5.x** | Strict mode, full type coverage |

### Future Additions (Phase 2+)
| Layer | Choice | Phase |
|-------|--------|-------|
| Semantic Search | **transformers.js** + all-MiniLM-L6-v2 | Phase 2 |
| Vector Search | **Brute-force cosine** → **usearch** | Phase 2 → 3 |
| Advanced Storage | **wa-sqlite + OPFS** | Phase 3 |

---

## 2. MVP Scope (Phase 1)

**Goal:** Prove the concept — capture, store, search, and browse AI chat history locally.

### What ships:
1. **WXT extension** with Chrome side panel UI
2. **Live capture** for Claude and ChatGPT
   - MAIN world fetch interception
   - ISOLATED world relay to service worker
   - Per-platform SSE stream parsing
3. **Manual import** for Claude and ChatGPT JSON exports
   - Drag-and-drop file upload
   - Auto-detect platform from file content
   - ChatGPT tree linearization
4. **IndexedDB storage** with unified conversation schema
5. **Keyword search** via MiniSearch
6. **Conversation list** (LRU-sorted with time grouping)
7. **Conversation detail view** (message display, metadata)
8. **Per-platform capture toggles** in settings
9. **Basic settings page** (toggles, storage stats, import, clear data)

### What's NOT in MVP:
- Semantic search (requires embedding model, offscreen document)
- Gemini support (unstable API format)
- Chain-of-thought linking (requires embeddings)
- Auto-summarization
- Firefox/Safari support
- Claude Code history import

### MVP Success Criteria:
- User installs → chats on Claude/ChatGPT → opens side panel → sees their conversations
- User searches "auth" → finds relevant conversations across both platforms
- User imports ChatGPT export → 200+ conversations appear and are searchable
- Zero network requests from the extension (verifiable via DevTools)

---

## 3. Phase 2 Scope

**Goal:** Add intelligence — semantic search and cross-conversation linking.

1. **Semantic search** via transformers.js
   - Offscreen document for embedding computation
   - all-MiniLM-L6-v2 model (23MB, 384-dim)
   - Conversation + chunk-level embeddings
   - Reciprocal Rank Fusion merging with keyword results
2. **Gemini export parser** (manual import only)
3. **Chain-of-thought detection**
   - Embedding similarity-based conversation clustering
   - Thread creation and display
4. **Auto-summarization** for conversations > 30 days old
5. **Improved search UX** — semantic vs keyword result differentiation

---

## 4. Phase 3 Scope

**Goal:** Polish, scale, and expand platform support.

1. **Gemini live capture** (if format stabilizes)
2. **Claude Code history import** (`~/.claude/history.jsonl`)
3. **wa-sqlite + OPFS migration** for power users (>5K conversations)
4. **Firefox support** (WXT handles multi-browser builds)
5. **Export all data** as portable JSON
6. **Keyboard shortcuts** (Cmd+Shift+R to open)
7. **Performance optimization** (virtual scrolling, lazy loading)

---

## 5. Project Structure

```
chatrecall/
├── package.json
├── tsconfig.json
├── wxt.config.ts
├── .gitignore
├── src/
│   ├── background/
│   │   └── index.ts                 # Service worker
│   ├── content-scripts/
│   │   ├── claude-interceptor.ts    # MAIN world: Claude fetch override
│   │   ├── claude-relay.ts          # ISOLATED world: Claude relay
│   │   ├── chatgpt-interceptor.ts   # MAIN world: ChatGPT fetch override
│   │   ├── chatgpt-relay.ts         # ISOLATED world: ChatGPT relay
│   │   └── shared/
│   │       ├── interceptor-base.ts  # Shared fetch override logic
│   │       └── relay-base.ts        # Shared relay logic
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── components/
│   │       └── App.ts               # Root Preact component
│   ├── lib/
│   │   ├── db.ts                    # IndexedDB setup (idb)
│   │   ├── types.ts                 # TypeScript interfaces
│   │   ├── normalizer.ts            # Platform → unified schema
│   │   ├── scoring.ts               # LRU access score
│   │   ├── parsers/
│   │   │   ├── claude-export.ts     # Claude JSON export parser
│   │   │   ├── chatgpt-export.ts    # ChatGPT JSON export parser
│   │   │   ├── gemini-export.ts     # Gemini export parser (stub)
│   │   │   └── detect-platform.ts   # Auto-detect platform
│   │   └── search/
│   │       └── keyword-search.ts    # MiniSearch wrapper
│   └── utils/
│       ├── sse-parser.ts            # SSE event parsing
│       └── constants.ts             # URLs, patterns
└── tests/
    ├── parsers/
    │   ├── claude-export.test.ts
    │   └── chatgpt-export.test.ts
    └── fixtures/
        ├── claude-export-sample.json
        └── chatgpt-export-sample.json
```

---

## 6. Implementation Order

### Week 1: Foundation
1. `types.ts` — all TypeScript interfaces
2. `db.ts` — IndexedDB setup with stores and indexes
3. `constants.ts` — platform URLs and intercept patterns
4. `scoring.ts` — LRU access score computation
5. `normalizer.ts` — platform data normalization

### Week 2: Parsers + Import
1. `claude-export.ts` — Claude JSON parser
2. `chatgpt-export.ts` — ChatGPT JSON parser (with tree linearization)
3. `detect-platform.ts` — auto-detection
4. Parser tests with fixture data
5. Import flow in side panel

### Week 3: Live Capture
1. `interceptor-base.ts` — shared fetch override
2. `relay-base.ts` — shared relay logic
3. `claude-interceptor.ts` — Claude SSE parsing
4. `chatgpt-interceptor.ts` — ChatGPT SSE parsing
5. `sse-parser.ts` — SSE event stream parser
6. `background/index.ts` — service worker message routing

### Week 4: UI + Search
1. Side panel: conversation list with LRU sorting
2. Side panel: conversation detail view
3. `keyword-search.ts` — MiniSearch integration
4. Side panel: search UI
5. Settings page with capture toggles
6. Polish, test, prepare for Chrome Web Store

---

## 7. Open-Source Strategy

### License
**MIT** — maximum adoption, minimum friction. The extension is a tool, not a platform.

### Repository
- Monorepo: docs at root, extension code in `chatrecall/`
- `RESEARCH.md`, `ARCHITECTURE.md`, `UX-FLOWS.md` stay at root as project docs

### CI/CD (GitHub Actions)
```yaml
on: [push, pull_request]
jobs:
  build:
    - pnpm install
    - pnpm lint
    - pnpm test
    - pnpm build
  release:
    - On tag: build + zip + GitHub Release
```

### Contributing
- Issues for bugs and feature requests
- PRs welcome with tests
- Content script changes require manual testing on each platform
- Code review required for anything touching capture logic (security-sensitive)

### Chrome Web Store
- Privacy policy: "ChatRecall stores all data locally on your device. No data is transmitted to any server."
- Permissions justification for review: explain why `host_permissions` are needed
- Open source link in listing
