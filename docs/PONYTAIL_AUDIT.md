# Ponytail Over-Engineering Audit — Project Lazarus

**Audit Date**: 26 June 2026
**Tool**: [Ponytail v4.8.3](https://github.com/DietrichGebert/ponytail) (lazy senior dev mode)
**Scope**: Full repository scan — server modules, UI components, routes, dependencies, shared code
**Method**: Ponytail's 7-rung ladder (YAGNI → codebase reuse → stdlib → native → installed deps → one line → minimum)

---

## Integration Summary

Ponytail has been added to the project as an opencode plugin:

- **Location**: `.opencode/ponytail/` (cloned from DietrichGebert/ponytail)
- **Config**: Updated `.opencode/opencode.json` to load `ponytail.mjs` plugin
- **Commands available**: `/ponytail [lite|full|ultra|off]`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`
- **Always-on**: The ruleset injects into every chat's system prompt at the default `full` intensity

---

## Top 10 Over-Engineering Findings

### 1. — 4 LLM-calling Modules with 95% Duplicate Provider Routing
**Files**: `src/lib/server/codex-helper.js` (394L), `meeting-process-helper.js` (400L), `author-fetch.js` (292L), `llm-runner.js` (69L)
**Issue**: Each independently reimplements provider routing (Google vs Nvidia vs OpenRouter vs Groq vs OpenCode vs DeepSeek), API key checking, HTTP client logic, and response parsing. The 116-line `if/else if` block in `meeting-process-helper.js:276-391` is the 4th copy.
**Tag**: `yagni`
**Savings**: ~900 lines eliminated

### 2. — Identical CRUD Boilerplate Across ~20 Route Files
**Pattern**: Every `[id]/+server.js` has identical GET/PUT/DELETE handlers — `getById()`, `404` check, `json()` wrapper. Repeats across clients, projects, tasks, contacts, accounts, people, categories, academy, lounge, and more.
**Fix**: A shared `crudHandlers(store)` helper
**Tag**: `shrink`
**Savings**: ~300 lines eliminated

### 3. — `people.js` Full Recompute on Every Read
**File**: `src/lib/server/treasury/people.js:11-128` (118L `computeAllBalances()`)
**Issue**: Every `getAll()`/`getById()` scans ALL transactions to recompute every person's balance from scratch with complex split-prorating logic. `getById()` calls `computeAllBalances()` for a single person.
**Fix**: SQL aggregate functions with window clauses → O(n) → O(1)
**Tag**: `yagni`
**Impact**: Performance (O(n) → O(1) per read)

### 4. — `transactions.js` Redundant Statement Cache
**File**: `src/lib/server/treasury/transactions.js:50-57`
**Issue**: A hand-rolled `stmtCache` Map that re-caches what `better-sqlite3` already caches internally. Only used by `getFiltered()`.
**Tag**: `yagni`
**Savings**: ~8 lines + removed complexity

### 5. — `playwright` Dependency (~300MB) for Optional Testing
**Issue**: Playwright is installed at ~300MB but used minimally for testing. If testing is not active, this is a heavy cost.
**Tag**: `yagni`
**Savings**: 300MB+ disk

### 6. — `src/lib/index.js` Empty File
**File**: `src/lib/index.js` (1 line, only a comment)
**Tag**: `delete`
**Savings**: 1 file

### 7. — `csv-parser.js` Hand-Rolled CSV Parser
**File**: `src/lib/server/csv-parser.js` (101L)
**Issue**: Custom CSV parser handling quoted fields, escaped quotes, line breaks. Node has multiple options (native `csv-parse`, or even `String.split()` for simple cases).
**Tag**: `stdlib`
**Savings**: 101 lines eliminated

### 8. — `LinkIcon.svelte` Single-Use Wrapper
**File**: `src/lib/components/operations/LinkIcon.svelte` (10L)
**Issue**: A 2-line wrapper calling `getIconForUrl()` then passing to `DynamicIcon`. Single consumer.
**Tag**: `shrink`
**Savings**: Inline it

### 9. — `ModalBreadcrumbs.svelte` Single-Use Component
**File**: `src/lib/components/operations/ModalBreadcrumbs.svelte` (88L)
**Issue**: Breadcrumb component with navigation arrows, placeholders, active states. Used in exactly one place (Story→Task→Subtask drill-down).
**Tag**: `yagni`
**Savings**: Inline it

### 10. — Academy Action-Based POST Dispatch
**File**: `src/routes/academy/[id]/+server.js:25-46`
**Issue**: Uses `action=delete`, `action=create-note`, `action=update-note` dispatch inside a single POST instead of standard REST (GET/PUT/DELETE endpoints).
**Tag**: `yagni`
**Savings**: 46 lines + consistency

---

## Full Findings

### Server Modules

| Tag | File | Finding | Impact |
|-----|------|---------|--------|
| `yagni` | `src/lib/server/db.js:566-571` | Proxy singleton wrapper — ESM already guarantees single instance | Low |
| `yagni` | `src/lib/server/treasury/transactions.js:24-48` | Three near-identical date range functions (`getWeekRange`, `getMonthRange`, `getYearRange`) | Low |
| `stdlib` | `src/lib/server/books.js:43-77` | Custom title-case engine with 28-line lowercase word list | Low |
| `stdlib` | `src/lib/server/books.js:4-24` | Custom title cleanup with regex fluff patterns | Low |
| `stdlib` | `src/lib/utils.js` | `formatDate()`/`formatCurrency()` — `Intl` already handles both | Low |
| `stdlib` | `src/lib/server/treasury/import-gpay.js:31-60` | Custom multi-format date parser (30L) | Low |
| `shrink` | `src/lib/server/treasury/import-federal.js:22-116` | 95-line if-else chains for 40+ bank branches → lookup map | Low |
| `yagni` | `src/lib/server/engine-config.js:34-103` | ~70 lines of embedded default prompts in a config module | Low |
| `delete` | `src/lib/server/academy/courses.js:28` | `getAll()` exported but never imported by any route | Low |
| `delete` | `src/lib/server/anime-seasons.js:13` | `getAll()` exported but never imported | Low |
| `delete` | `src/lib/server/academy/notes.js:39` | `getAll()` exported but never imported | Low |

### UI Components

| Tag | File | Finding | Impact |
|-----|------|---------|--------|
| `shrink` | `src/lib/components/operations/DeleteConfirm.svelte:4` | Prop named `client` used for all entity types (contacts, files, notes, etc.) | Low |
| `shrink` | `src/lib/components/operations/CalendarPopover.svelte:30-35` | `$derived(() => {...})` syntax — should use `$derived.by()` | Low |
| `yagni` | `src/lib/components/Breadcrumbs.svelte:60-62` | Agent context coupling doesn't belong in breadcrumbs | Low |

### Shared/Utility Code

| Tag | File | Finding | Impact |
|-----|------|---------|--------|
| `shrink` | `src/lib/font-loader.js:17-63` | 46 lines of `style.setProperty()` calls → loop over config object | Low |
| `shrink` | `src/lib/fonts.js` | Three overlapping arrays (HEADING/BODY/MONO) with dedup filter → single array with category field | Low |
| `shrink` | `src/lib/stores/notification.js` | Uses deprecated `writable` from svelte/store instead of `$state()` rune | Low |

### Routes

| Tag | File | Finding | Impact |
|-----|------|---------|--------|
| `delete` | `src/routes/treasury/+page.js` | JS redirect only — could be in +page.server.js if it redirects | Low |

---

## Scoring

| Metric | Value |
|--------|-------|
| Lines removable (estimated) | **~1,500** (across server modules, routes, components) |
| Dependencies removable | **1** (`playwright` as heavy dev dep) |
| Dependencies shrinkable | **2** (`pdf-parse`, `xlsx` — lighter alternatives exist) |
| Files to delete | **2** (`index.js`, unused `getAll()` exports) |
| Files to consolidate | **4** (LLM calling modules → 1) |
| Files to refactor | **3** (route boilerplate, people balance, csv parser) |
| Performance wins | **2** (people recompute, stmt cache) |

---

## Execution Plan (Lowest Effort → Highest Impact)

1. **Delete** `src/lib/index.js` (30s)
2. **Inline** `LinkIcon.svelte` into its 2 consumers (5min)
3. **Consolidate** 4 LLM modules into `llm-runner.js` (1hr)
4. **Refactor** `people.js` to use SQL aggregates (30min)
5. **Create** shared `crudHandlers()` for route boilerplate (30min)
6. **Remove** `transactions.js` stmtCache (10min)
7. **Replace** `csv-parser.js` with Node built-in (15min)
8. **Drop** `playwright` if testing is not active (5min)

---

*Audit performed using Ponytail's review skill — over-engineering only, not correctness. No security, bug, or performance issues were evaluated. See [ponytail.dev](https://ponytail.dev) for more.*
