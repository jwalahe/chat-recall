# ChatRecall — UX Flows & Wireframes

## Table of Contents
1. [Core User Flows](#1-core-user-flows)
2. [Overview Page (Main View)](#2-overview-page-main-view)
3. [Search Experience](#3-search-experience)
4. [Conversation Detail View](#4-conversation-detail-view)
5. [Chain-of-Thought View](#5-chain-of-thought-view)
6. [The "Aha Moment"](#6-the-aha-moment)
7. [Settings Page](#7-settings-page)
8. [Interaction Patterns & Edge States](#8-interaction-patterns--edge-states)

---

## 1. Core User Flows

### Flow 1: First-Time Setup

```
Install Extension
       │
       ▼
Extension activates silently
(live capture ON for all platforms by default)
       │
       ▼
User continues chatting normally
(conversations accumulate in background)
       │
       ▼
Hours/days later: user clicks extension icon
       │
       ▼
Side panel opens → Onboarding Card
       │
       ▼
"ChatRecall has been quietly saving your
 AI conversations. Here's what we found."
       │
       ├──→ [Got it, show me] → Overview Page
       │
       └──→ [Adjust settings] → Settings Page
```

**Design principle:** Zero-friction start. No signup, no configuration wizard. The extension earns trust by working silently and showing value the first time the user opens it.

### Flow 2: Daily Use

```
User clicks extension icon (or Cmd+Shift+R)
       │
       ▼
Side panel opens → Overview Page
       │
       ├──→ Browse recent conversations (scrollable list)
       │         │
       │         └──→ Click card → Conversation Detail
       │                    │
       │                    ├──→ [Open in Claude/GPT] → opens original tab
       │                    ├──→ [Copy] → copies to clipboard
       │                    └──→ [← Back] → Overview
       │
       ├──→ Search bar → type query
       │         │
       │         └──→ Search Results → click result → Conversation Detail
       │
       └──→ Platform filter tabs → filtered conversation list
```

### Flow 3: Manual Import

```
Overview → Settings (gear icon)
       │
       ▼
Settings → Import Data section
       │
       ▼
[Drop JSON/ZIP files here]
or [Browse files]
       │
       ▼
File(s) selected
       │
       ▼
Platform auto-detected from file format
       │
       ▼
┌─────────────────────────────────┐
│ Importing from ChatGPT...       │
│ ████████████░░░░ 73%            │
│ 156 of 213 conversations        │
└─────────────────────────────────┘
       │
       ▼
"Import complete! 213 conversations
 from ChatGPT added to your library."
       │
       └──→ [View conversations] → Overview (filtered to imported)
```

### Flow 4: Search

```
Search bar (always visible at top)
       │
       ▼
User types: "that conversation about auth"
       │
       ▼
Results appear in real-time as you type
       │
       ▼
┌─ Semantic matches ─────────────────┐
│ "Related to: authentication design" │
│                                     │
│  ◆ JWT Auth Flow Redesign           │
│    Claude · Mar 10 · 23 msgs        │
│                                     │
│  ◆ OAuth2 Implementation Help       │
│    ChatGPT · Mar 8 · 15 msgs       │
├─ Keyword matches ──────────────────┤
│  ◇ Debug **auth** middleware        │
│    Claude · Mar 12 · 8 msgs        │
└─────────────────────────────────────┘
       │
       ├──→ Click result → Conversation Detail
       │        (scrolled to matching section)
       │
       ├──→ Filter chips: [Claude ✕] [This week ✕]
       │
       └──→ [Clear search] → back to Overview
```

### Flow 5: Chain-of-Thought Discovery

```
Viewing Conversation Detail
       │
       ▼
Notice: "🔗 3 related conversations"
(appears when related convos detected)
       │
       ▼
Click → Chain-of-Thought View expands
       │
       ▼
Timeline shows linked conversations:
       │
  Mar 8  ── OAuth2 research (ChatGPT)
       │
  Mar 10 ── JWT Auth Flow Redesign (Claude)
       │
  Mar 12 ── Debug auth middleware (Claude)
       │
       ▼
Click any node → navigate to that conversation
```

---

## 2. Overview Page (Main View)

The primary interface. Opens in Chrome's side panel (~400px wide).

### Wireframe

```
┌────────────────────────────────────────┐
│  ChatRecall                    ⚙  │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │ 🔍 Search your AI chats...      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────┐ ┌────────┐ ┌─────┐ ┌──────┐  │
│  │ All│ │ Claude │ │ GPT │ │ Gem. │  │
│  └─┬──┘ └────────┘ └─────┘ └──────┘  │
│    ▼ (selected = underline)            │
├────────────────────────────────────────┤
│                                        │
│  TODAY                                 │
│  ┌──────────────────────────────────┐  │
│  │ ◆ Auth flow redesign        🔗  │  │
│  │ Claude · 2h ago · 23 msgs       │  │
│  │ "Let's redesign using JWT wi..." │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ ◇ Debug React hydration error   │  │
│  │ ChatGPT · 5h ago · 8 msgs      │  │
│  │ "The issue is that SSR rende..."│  │
│  └──────────────────────────────────┘  │
│                                        │
│  THIS WEEK                             │
│  ┌──────────────────────────────────┐  │
│  │ ◆ Database schema migration     │  │
│  │ Claude · 2 days ago · 45 msgs   │  │
│  │ "I need to migrate from Post..."│  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ ◇ Python async patterns         │  │
│  │ ChatGPT · 3 days ago · 12 msgs  │  │
│  │ "What's the best way to hand..."│  │
│  └──────────────────────────────────┘  │
│                                        │
│  THIS MONTH                            │
│  ┌──────────────────────────────────┐  │
│  │ ○ OAuth2 research (summarized)  │  │
│  │ ChatGPT · Mar 8 · 34 msgs      │  │
│  │ Summary: Explored OAuth2 flo... │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ... (scrollable) ...                  │
│                                        │
├────────────────────────────────────────┤
│  📊 142 conversations · 3 platforms    │
│  🟢 Live capture active               │
└────────────────────────────────────────┘
```

### Design Details

**Conversation Cards:**
- **Title** — auto-generated from first user message or platform's title field
- **Platform badge** — color-coded dot:
  - ◆ Claude = orange/amber
  - ◇ ChatGPT = green
  - ○ Gemini = blue
- **Relative time** — "2h ago", "3 days ago", "Mar 8"
- **Message count** — quick indicator of conversation depth
- **Preview snippet** — first ~60 characters of the last meaningful message
- **🔗 icon** — appears when related conversations are detected (chain-of-thought)

**LRU Ordering:**
- Score = `max(lastAccessedAt, updatedAt)` with a frequency multiplier
- Formula: `score = timestamp + (accessCount * 3600000)` (each access adds 1 hour of recency equivalent)
- Conversations the user views or searches for get their `lastAccessedAt` bumped
- Within each time group (Today/This Week/etc.), sorted by this score

**Time Groups:**
- **Today** — last 24 hours
- **This Week** — last 7 days
- **This Month** — last 30 days
- **Older** — beyond 30 days (these get auto-summarized)

**Platform Filter Tabs:**
- `All` (default) | `Claude` | `GPT` | `Gemini`
- Selected tab has underline indicator
- Filters the conversation list instantly
- Show count badge: `Claude (47)`

**Status Bar (bottom):**
- Total conversation count and platform count
- Live capture status: 🟢 Active | 🔴 Paused | ⚪ Disabled
- Tapping status opens Settings

---

## 3. Search Experience

### Search Wireframe

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │ 🔍 auth flow            ✕       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Filter: [Claude ✕] [This month ▾]    │
│                                        │
│  ── Semantic Matches ──────────────    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Related to: authentication       │  │
│  │                                  │  │
│  │ ◆ JWT Auth Flow Redesign        │  │
│  │ Claude · Mar 10 · 23 msgs       │  │
│  │ "Here's an approach using JWT   │  │
│  │  tokens with refresh rotation..."│  │
│  │                                  │  │
│  │ ◆ Relevance: ████████░░ 85%     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Related to: authentication       │  │
│  │                                  │  │
│  │ ◇ OAuth2 Implementation         │  │
│  │ ChatGPT · Mar 8 · 15 msgs       │  │
│  │ "For the OAuth2 PKCE flow, you  │  │
│  │  should use..."                  │  │
│  │                                  │  │
│  │ ◇ Relevance: ███████░░░ 72%     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ── Keyword Matches ───────────────    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ◆ Debug **auth** middleware      │  │
│  │ Claude · Mar 12 · 8 msgs        │  │
│  │ "The **auth** middleware is      │  │
│  │  throwing a 401 when..."         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  3 results across 2 platforms          │
└────────────────────────────────────────┘
```

### Search Design Details

**Two result categories:**
1. **Semantic Matches** — found by meaning, not exact words. Labeled "Related to: [topic]" to explain why it matched. Shows relevance percentage bar.
2. **Keyword Matches** — traditional text matching. Highlighted terms in **bold** within snippets.

Semantic results appear first (they're usually more useful for divergent thinkers who don't remember exact words).

**Filter Chips:**
- Platform: toggleable chips (Claude, ChatGPT, Gemini)
- Time: dropdown (Any time, Today, This week, This month, Custom range)
- Chips are additive — multiple can be active
- ✕ on each chip to remove

**Search Behavior:**
- Debounced (300ms) — results update as you type
- Minimum 3 characters to trigger semantic search (keyword search starts at 1)
- Empty search → return to Overview
- Results highlight the matching section of the conversation, not just the title

**"No Results" State:**
```
┌──────────────────────────────────┐
│                                  │
│    No conversations found for    │
│    "quantum entanglement"        │
│                                  │
│    Try:                          │
│    • Using different keywords    │
│    • Removing filters            │
│    • Importing more history      │
│      from Settings               │
│                                  │
└──────────────────────────────────┘
```

---

## 4. Conversation Detail View

### Detail Wireframe

```
┌────────────────────────────────────────┐
│  ← Back         Auth Flow Redesign     │
│  ◆ Claude · Mar 10, 2024 · 23 msgs    │
├────────────────────────────────────────┤
│  🔗 3 related conversations    [View]  │
├────────────────────────────────────────┤
│                                        │
│  ┌─ You ───────────────────────────┐   │
│  │ I need to redesign the          │   │
│  │ authentication flow for our     │   │
│  │ app. Currently using session    │   │
│  │ cookies but want to move to     │   │
│  │ something more modern.          │   │
│  └─────────────────────────────────┘   │
│                                        │
│  ┌─ Claude ────────────────────────┐   │
│  │ Here's an approach using JWT    │   │
│  │ tokens with refresh rotation:   │   │
│  │                                 │   │
│  │ 1. Short-lived access tokens    │   │
│  │    (15 min expiry)              │   │
│  │ 2. Refresh token rotation...    │   │
│  │                                 │   │
│  │ [Show more ↓]                   │   │
│  └─────────────────────────────────┘   │
│                                        │
│  ┌─ You ───────────────────────────┐   │
│  │ What about the logout flow?     │   │
│  │ How do we invalidate tokens?    │   │
│  └─────────────────────────────────┘   │
│                                        │
│  ┌─ Claude ────────────────────────┐   │
│  │ For token invalidation, you     │   │
│  │ have several options:           │   │
│  │                                 │   │
│  │ [Show more ↓]                   │   │
│  └─────────────────────────────────┘   │
│                                        │
│  ... (scrollable) ...                  │
│                                        │
├────────────────────────────────────────┤
│  [Open in Claude]  [Copy]  [Export]    │
└────────────────────────────────────────┘
```

### Detail Design Details

**Header:**
- Back arrow returns to previous view (Overview or Search Results)
- Title + platform badge + date + message count

**Related Conversations Banner:**
- Shows when chain-of-thought links exist
- Collapsed by default: "🔗 3 related conversations [View]"
- Click "View" → expands to Chain-of-Thought View inline or navigates to dedicated view

**Message Display:**
- Messages styled as chat bubbles with role labels ("You" / "Claude" / "ChatGPT" / "Gemini")
- Long messages (>4 lines) collapsed with "[Show more ↓]" button
- Code blocks rendered with syntax highlighting
- If arrived via search: matching section auto-scrolled into view with highlight

**Action Bar:**
- **Open in [Platform]** — opens the original conversation in a new tab (if URL known)
- **Copy** — copies entire conversation as markdown to clipboard
- **Export** — downloads as JSON or markdown file

---

## 5. Chain-of-Thought View

### Chain View Wireframe

```
┌────────────────────────────────────────┐
│  ← Back       Conversation Thread      │
│  "Authentication Design" · 3 chats     │
├────────────────────────────────────────┤
│                                        │
│  WHY LINKED: Shared topics -           │
│  authentication, JWT, OAuth2           │
│                                        │
│  ┌─ Timeline ──────────────────────┐   │
│  │                                 │   │
│  │  Mar 8                          │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ ◇ OAuth2 Research         │  │   │
│  │  │ ChatGPT · 15 msgs        │  │   │
│  │  │ "Explored OAuth2 PKCE    │  │   │
│  │  │  flow options for SPA"   │  │   │
│  │  └───────────┬───────────────┘  │   │
│  │              │ Topic: OAuth →   │   │
│  │              │ JWT transition   │   │
│  │  Mar 10      │                  │   │
│  │  ┌───────────▼───────────────┐  │   │
│  │  │ ◆ JWT Auth Flow Redesign │  │   │
│  │  │ Claude · 23 msgs         │  │   │
│  │  │ "Designed JWT with       │  │   │
│  │  │  refresh rotation"       │  │   │
│  │  └───────────┬───────────────┘  │   │
│  │              │ Follow-up:       │   │
│  │              │ debugging impl   │   │
│  │  Mar 12      │                  │   │
│  │  ┌───────────▼───────────────┐  │   │
│  │  │ ◆ Debug Auth Middleware  │  │   │
│  │  │ Claude · 8 msgs          │  │   │
│  │  │ "Fixed 401 error in the  │  │   │
│  │  │  auth middleware"        │  │   │
│  │  └───────────────────────────┘  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                        │
│  Click any card to view conversation   │
└────────────────────────────────────────┘
```

### Chain Design Details

**Thread Detection (How it works behind the scenes):**
- Conversations are clustered by **topic similarity** using embedding cosine similarity (>0.75 threshold)
- Additional signals: shared code identifiers, entity overlap (function names, API names), temporal proximity
- Threads are named after the dominant topic ("Authentication Design")

**Visual Language:**
- Vertical timeline with date markers
- Cards are connected by lines with annotations explaining the link
- Annotations: "Topic: X → Y", "Follow-up", "Same codebase", "Referenced in"
- Platform badges on each card show cross-platform flow

**Interaction:**
- Click any card → navigates to Conversation Detail with "[← Back to Thread]" navigation
- Cards have hover state showing full summary
- Thread can be renamed by the user (optional)

---

## 6. The "Aha Moment"

### First Open — Onboarding Card

The first time the user opens the side panel after installation (ideally after a few conversations have been captured):

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  Welcome to ChatRecall           │  │
│  │                                  │  │
│  │  While you've been chatting,     │  │
│  │  we've been saving.             │  │
│  │                                  │  │
│  │  📋 12 conversations captured   │  │
│  │  🔍 All searchable by meaning   │  │
│  │  🔒 Everything stays on your    │  │
│  │     machine. Always.            │  │
│  │                                  │  │
│  │  [Show me what you found →]     │  │
│  │                                  │  │
│  │  Privacy: ChatRecall never      │  │
│  │  sends data anywhere. You can   │  │
│  │  verify — we're open source.    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Adjust settings]    [Got it →]       │
└────────────────────────────────────────┘
```

### The Delight Sequence

1. **Passive value accumulation** — Extension works silently for hours/days. User doesn't think about it.

2. **First search** — User thinks "what was that conversation where I...?" Opens ChatRecall, types a vague query like "auth thing" or "that database migration". The semantic search finds it instantly despite imprecise language.

3. **Cross-platform discovery** — Results show conversations from both Claude AND ChatGPT. User realizes "oh, it's capturing everything in one place."

4. **Chain-of-thought revelation** — User notices the "🔗 3 related conversations" badge. Clicks it. Sees a timeline connecting their auth research (ChatGPT, 2 weeks ago) → their implementation design (Claude, last week) → their debugging session (Claude, yesterday). They see their own thinking process mapped out across tools and time.

5. **The hook** — User realizes: "I never have to lose a conversation again. And I can actually see how my ideas evolved." This is the moment they tell someone else about it.

### Design for Delight

- **Instant results** — Search must return results in <200ms. Speed IS the feature.
- **Smart snippets** — Show the RELEVANT part of the conversation, not just the beginning
- **Gentle counts** — "142 conversations saved" in the status bar is a quiet reminder of accumulated value
- **No setup tax** — The first time value should come before any configuration

---

## 7. Settings Page

### Settings Wireframe

```
┌────────────────────────────────────────┐
│  ← Settings                            │
├────────────────────────────────────────┤
│                                        │
│  LIVE CAPTURE                          │
│  ┌──────────────────────────────────┐  │
│  │ ◆ Claude.ai         [●━━━] ON  │  │
│  │   Last captured: 2h ago          │  │
│  │                                  │  │
│  │ ◇ ChatGPT           [●━━━] ON  │  │
│  │   Last captured: 5h ago          │  │
│  │                                  │  │
│  │ ○ Gemini             [━━━○] OFF │  │
│  │   Not yet supported              │  │
│  └──────────────────────────────────┘  │
│                                        │
│  SEARCH                                │
│  ┌──────────────────────────────────┐  │
│  │ Semantic search      [●━━━] ON  │  │
│  │ Embedding model: MiniLM-L6-v2   │  │
│  │ Status: Ready (23 MB)           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  STORAGE                               │
│  ┌──────────────────────────────────┐  │
│  │ Total: 24.3 MB                  │  │
│  │ ████████████░░░░░░░░  48%       │  │
│  │                                  │  │
│  │ Claude:  87 chats  (14.2 MB)    │  │
│  │ ChatGPT: 52 chats  (8.9 MB)    │  │
│  │ Gemini:   3 chats  (1.2 MB)    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  IMPORT DATA                           │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │   Drop JSON or ZIP files here   │  │
│  │   or [Browse files]             │  │
│  │                                  │  │
│  │   Supports: ChatGPT export,     │  │
│  │   Claude export, Gemini export  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  EXPORT                                │
│  ┌──────────────────────────────────┐  │
│  │ [Export All Data as JSON]        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  DANGER ZONE                           │
│  ┌──────────────────────────────────┐  │
│  │ [Clear Claude data]  (87 chats) │  │
│  │ [Clear ChatGPT data] (52 chats) │  │
│  │ [Clear all data]     (142 chats)│  │
│  └──────────────────────────────────┘  │
│                                        │
│  ABOUT                                 │
│  ┌──────────────────────────────────┐  │
│  │ ChatRecall v0.1.0               │  │
│  │ Open source · MIT License       │  │
│  │ github.com/[user]/chatrecall    │  │
│  │                                  │  │
│  │ Your data never leaves your     │  │
│  │ machine. No accounts. No cloud. │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### Settings Design Details

**Live Capture Toggles:**
- Per-platform toggle switches with platform color coding
- "Last captured: X ago" shows the system is working
- Toggle OFF → stops intercepting for that platform
- No data is deleted when toggling off (just stops new capture)
- Gemini shown as "Not yet supported" in MVP

**Storage Breakdown:**
- Visual progress bar
- Per-platform breakdown with chat count and size
- Helps users understand what's taking space

**Import Section:**
- Drag-and-drop zone with dotted border
- Auto-detects platform from file format
- Shows progress during import
- Lists supported formats

**Danger Zone:**
- Red-themed section
- Per-platform clear: lets users remove just one platform's data
- "Clear all" requires confirmation dialog:
  ```
  ┌──────────────────────────────┐
  │ Delete all 142 conversations?│
  │                              │
  │ This cannot be undone.       │
  │                              │
  │ [Cancel]  [Delete Everything]│
  └──────────────────────────────┘
  ```

---

## 8. Interaction Patterns & Edge States

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Win) | Open/close side panel |
| `/` or `Cmd+K` | Focus search bar |
| `Escape` | Clear search / go back |
| `↑` / `↓` | Navigate conversation list |
| `Enter` | Open selected conversation |

### Loading & Skeleton States

**Initial load (side panel opening):**
```
┌──────────────────────────────────┐
│ 🔍 Search your AI chats...      │
├──────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░  ░░░░  ░░░░░░░░   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░  ░░░░  ░░░░░░░░   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
└──────────────────────────────────┘
```

Skeleton cards shimmer while IndexedDB loads. Should resolve in <100ms for typical datasets.

### Empty States

**No conversations yet (fresh install, no captures yet):**
```
┌──────────────────────────────────┐
│                                  │
│         💬                       │
│                                  │
│   No conversations yet           │
│                                  │
│   ChatRecall is listening.       │
│   Start a conversation on        │
│   Claude, ChatGPT, or Gemini    │
│   and it'll appear here.         │
│                                  │
│   Or import your history:        │
│   [Import from file]             │
│                                  │
└──────────────────────────────────┘
```

### Toast Notifications

Non-intrusive notifications that appear at the top of the side panel:

```
┌──────────────────────────────────┐
│ ✓ 3 new conversations captured   │  ← slides in, auto-dismisses (3s)
└──────────────────────────────────┘
```

Toasts for:
- New conversations captured (batched, not per-message)
- Import complete
- Data cleared
- Errors (capture failed, storage full)

### Hover & Focus States

- **Card hover:** Subtle background color change, slight elevation shadow
- **Card focus (keyboard):** Blue outline ring
- **Search results hover:** Same as card hover + "Click to view" tooltip
- **Button hover:** Darken by 10%, cursor pointer
- **Toggle hover:** Show tooltip ("Stop capturing from Claude")

### Transitions

- **Side panel open:** Slides in from right (200ms ease-out)
- **Card → Detail:** Slide left transition (150ms)
- **Detail → Back:** Slide right transition (150ms)
- **Search results:** Fade in (100ms)
- **Toast:** Slide down from top (200ms), auto-dismiss slide up (200ms)

### Responsive Considerations

Side panel width varies by browser/user:
- **Minimum width (320px):** Single column, cards stack, no side-by-side elements
- **Default width (400px):** Standard layout as wireframed
- **Maximum width (600px):** Wider cards, could show more preview text

### Accessibility

- All interactive elements are keyboard-navigable
- Screen reader labels on platform badges ("Claude conversation")
- Search results announced via aria-live region
- Toggle switches use proper ARIA roles
- Color is never the sole indicator (platform badges have both color and shape/text)
- Focus trap in modal dialogs (delete confirmation)
- Minimum touch target: 44x44px for mobile-friendly interactions

### Error States

**Capture error:**
```
┌──────────────────────────────────┐
│ ⚠ Claude capture interrupted     │
│ The page may have updated.       │
│ [Retry] [Dismiss]                │
└──────────────────────────────────┘
```

**Storage full:**
```
┌──────────────────────────────────┐
│ ⚠ Storage is getting full        │
│ 95% used. Consider clearing      │
│ older conversations.             │
│ [Go to Settings]                 │
└──────────────────────────────────┘
```
