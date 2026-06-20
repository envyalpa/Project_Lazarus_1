# Project Lazarus — Agent Instructions for AI

You MUST read `docs/PROJECT_DOCS.md` and `docs/DESIGN_SYSTEM.md` before making any changes to the codebase.

- `docs/PROJECT_DOCS.md` — project structure, file rules, tech stack conventions
- `docs/DESIGN_SYSTEM.md` — design bible: colors, typography, icons, panel specs, data attributes

Key rules:
- Never create files over 200 lines. Split into components.
- Always add `data-section` attributes to new elements.
- Use the color palette and fonts from DESIGN_SYSTEM.md — do not introduce random colors.
- Never hardcode font-size or font-family in px. Always use `--fs-*` and `--font-*` CSS custom properties from DESIGN_SYSTEM.md (§3.5 Unbreakable Rules).
- Never use emoji as icons — only Lucide SVGs.
- Always wrap content sections in Panel component with corner notches.
- After any build cycle, update DESIGN_SYSTEM.md if new patterns were introduced.
- Run `npm run check` (svelte-check, ~2-3s) for quick validation during development. Run `npm run build` only for final production verification.

## Token Optimization (Installed)

Four layers of token reduction are active. Use them in this priority order.

### Layer 1: DCP Plugin (automatic, zero-effort)
**What**: `@tarquinen/opencode-dcp` — prunes stale tool outputs, deduplicates repeated calls, compresses completed task spans into summaries. Runs automatically on every request.
**Effect**: 50–70% fewer tokens per session. No manual action needed.
**Commands**: `/dcp context` (view token breakdown), `/dcp stats` (cumulative savings), `/dcp compress` (manual compress trigger).

### Layer 2: Distill MCP (optimized file reads & output compression)
**What**: `distill-mcp` — MCP server with 3 tools for token-efficient context ingestion.
**Tools**:
- `smart_file_read` — AST-aware reading. 5 modes: `auto`, `full`, `skeleton` (function signatures only), `extract` (specific symbols), `search` (find + read). Supports 7 languages (TS, JS, Python, Go, Rust, PHP, Swift). Never reads full files when skeleton/extract suffice.
- `auto_optimize` — Auto-detects content type (build output, logs, diffs, stacktraces, git output) and compresses by 40–92%.
- `code_execute` — QuickJS WASM sandbox to chain 5-10 operations (read, git, grep, compress) in a single MCP call instead of multiple round-trips.
**Effect**: 40–90% fewer tokens on file reads and output processing.
**Configuration**: Added to `.opencode/opencode.json` under `mcp.distill`.
**Rules**:
- For reading source code, prefer `smart_file_read` with `skeleton` or `extract` mode over full file reads
- For verbose command output (build logs, git diff, test output), use `auto_optimize` to compress before analysis
- For multi-step analysis (read → grep → summarize), use `code_execute` to chain operations in one call

### Layer 3: CodeGraph MCP (prefer over file reads)
**What**: `codegraph` — pre-indexed AST graph of the entire codebase (1,889 nodes, 4,130 edges). Exposes MCP tools to resolve symbols, trace calls, and explore code without reading files.
**Effect**: ~57% fewer exploration tokens, ~62% fewer tool calls vs grep/glob/read.
**Rules**:
- Before reading any file, try CodeGraph MCP tools first (e.g. `codegraph_context`, `codegraph_explore`, `codegraph_query`)
- Use `codegraph affected <symbol>` for impact analysis before editing
- The graph auto-syncs on file changes — no manual rebuild needed
- If CodeGraph has insufficient context, fall back to Distill `smart_file_read` or normal file reads

### Layer 4: graphify — Knowledge Graph (fallback for broad context)
**What**: A labeled knowledge graph at `graphify-out/` (427 nodes, 461 edges, 59 communities). Use for high-level architecture questions the other layers can't answer.

#### Decision Tree

```
Incoming request
│
├─ Need to understand a symbol / function / import chain?
│   └─ USE CodeGraph MCP tools (fastest, cheapest)
│
├─ Need to read a file efficiently (skeleton/extract)?
│   └─ USE Distill `smart_file_read`
│
├─ Need to compress verbose bash output / build logs?
│   └─ USE Distill `auto_optimize`
│
├─ Need to chain multiple read/grep/compress operations?
│   └─ USE Distill `code_execute`
│
├─ Need broad architectural context spanning many files?
│   └─ python scripts/graphify_helper.py query "<description>"
│       (BFS default, budget 800t — use --budget N if you need more)
│
├─ Need to trace a specific dependency chain?
│   ├─ CodeGraph MCP (for code-level: calls, imports, routes)
│   └─ graphify --dfs (for cross-file conceptual chains)
│
├─ Relationship question ("how does A connect to B")?
│   └─ python scripts/graphify_helper.py path "<A>" "<B>"
│
├─ Focused concept ("explain how X works")?
│   └─ python scripts/graphify_helper.py explain "<concept>"
│
├─ Plan or build request?
│   ├─ BEFORE: CodeGraph MCP (symbols) + Distill (efficient reads) + graphify (architecture)
│   ├─ Implement the change
│   └─ AFTER: python scripts/graphify_helper.py update
│
└─ Purely conversational?
    └─ Skip all graphs
```

#### Graphify commands

| Command | When | Example |
|---------|------|---------|
| `query` | BFS subgraph for broad context | `query "time entry modal project dropdown"` |
| `query --dfs` | Trace a specific dependency chain | `query --dfs "how does handleSave work"` |
| `path` | Shortest path between concepts | `path "TimeEntryModal" "projects.js"` |
| `explain` | Focused node explanation | `explain "computeTop"` |
| `update` | Post-build incremental update | run after `npm run build` succeeds |

#### When to read GRAPH_REPORT.md
Only when query/path/explain don't surface enough context. Too large for routine use.

#### Windows notes
- Use `python` (not `python3`)
- Always set `$env:PYTHONUTF8 = "1"` before running Python
- The helper script at `scripts/graphify_helper.py` handles all operations
- Default query budget is 800 tokens (use `--budget N` to increase)
- After modifying code, run `python scripts/graphify_helper.py update`

#### When to skip graphify
1. The task is about stale/invalid graph output itself
2. The user explicitly says not to use it
3. The request is purely conversational

Dirty graphify-out/ files after hooks or updates are normal — never a reason to skip.

## Context Engineering Guidelines

Apply these to every interaction — zero tool cost, immediate token savings:

- Use Distill/CodeGraph explicitly via `use X` prompts; don't rely on the model discovering them passively
- When chaining multiple independent reads, use Distill `code_execute` to batch them in one call instead of sequential tool calls
- Pipe verbose bash output through `Select-Object -First N` or `| head` equivalents when you only need the first few lines
- After `npm run build` failures, pipe output through Distill `auto_optimize` before analysis
- After git log/diff, compress with Distill `auto_optimize` before reading
- Close completed task spans with explicit summary messages to give DCP clean compression boundaries
