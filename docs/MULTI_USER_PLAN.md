# Multi-User / Local-Data Implementation Plan

**Goal:** Make Project Lazarus installable by a second person on their own machine, where the git repo contains only the program, and all user data lives in one relocatable, user-backupable folder.

**Model chosen: separate installs (Model A).** Each user runs their own copy against their own data folder. There is no shared server, no accounts, and no sync between users. Nothing in this plan adds authentication or multi-tenancy.

---

## 0. Verified starting state — read before planning any work

These facts were established by inspecting the repo and querying the live database. Do not re-derive them, and do not assume anything beyond them.

| Fact | Evidence |
|---|---|
| `data/` is already gitignored | `.gitignore` line 24 (`data/`) |
| No `.db`/`.sqlite` file has ever been committed | `git ls-files` — zero matches |
| `static/images/*.png` **is** tracked — 11 files | `git ls-files static/images` = 11 |
| All 11 committed images are **orphaned** | No column in any table references any of the 11 filenames |
| Zero local `/images/...` refs exist in the DB | All 306 `%/images/%` matches are external CDN URLs (e.g. MyAnimeList) that merely contain `/images/` in the path |
| A fresh DB builds 50 tables, 23 indexes, 78 seed rows | Verified by importing `db.js` against an empty `data/` dir |
| The live DB has 59 tables — 9 more than code can create | Diff of live vs fresh `sqlite_master` |
| `db.js` is the only file in the repo containing DDL | `grep -rn "CREATE TABLE" src/ scripts/` — 49 statements, all in `db.js` |
| There is no auth of any kind | `src/hooks.server.js` is 2 lines (error logging only); no `users` table; no `user_id` column anywhere |
| `process.cwd()` is hardcoded in 20 places | See Phase 2 table |

### The core defect

`db.js` creates tables named `anime`, `books`, `areas`, `courses`. **No code queries them** — `grep -rE "FROM (anime|books|areas|courses)\b" src/` returns 0 matches for each.

The application actually queries `anime_series`, `anime_seasons`, `book_series`, `academy_areas`, `academy_courses`, `academy_notes` — and **none of these are created by any code in the repo.** They exist only in the maintainer's live database, created by hand during a rename that was never written back into the schema.

**Therefore a fresh clone cannot run.** Lounge to Anime, Lounge to Books, and all of Academy throw on first query. This is Phase 1 and it blocks everything else.

Note also that `book_genres.book_id` references `book_series` and `anime_genres.anime_id` references `anime_series`: `db.js` creates those join tables with foreign keys pointing at tables it never creates.

---

## Phase 1 — Make the schema reproducible

Blocks all other phases. Worth doing even if no second user is ever onboarded, because the live database is currently unreproducible from source.

### 1.1 Add the six missing tables to `src/lib/server/db.js`

Insert into the **main `db.exec()` template literal**, immediately after the `CREATE TABLE IF NOT EXISTS study_notes (...)` statement (around line 189) and **before** the genres block (around line 558), so that `book_genres` and `anime_genres` resolve against real tables.

Order matters: `series` must precede `book_series`; `academy_areas` must precede `academy_courses` and `academy_notes`.

The DDL below was dumped from the live database and normalised (ALTER-added columns folded inline, `IF NOT EXISTS` added). Use it verbatim.

```sql
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  total_volumes INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'BookMarked',
  color TEXT DEFAULT '--cyan',
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anime_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  cover_url TEXT DEFAULT '',
  rating TEXT DEFAULT NULL,
  status TEXT DEFAULT 'not_started',
  notes TEXT DEFAULT '',
  synopsis TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anime_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id INTEGER NOT NULL REFERENCES anime_series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  total_episodes INTEGER DEFAULT 0,
  episodes_watched INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(anime_id, season_number)
);

CREATE TABLE IF NOT EXISTS book_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  rating TEXT DEFAULT NULL,
  status TEXT DEFAULT 'not_started',
  synopsis TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  series_id INTEGER REFERENCES series(id),
  volume_number INTEGER DEFAULT 0,
  total_volumes INTEGER DEFAULT 0,
  source_url TEXT DEFAULT '',
  processed INTEGER DEFAULT 0,
  edi_correct_title INTEGER DEFAULT 0,
  edi_correct_author INTEGER DEFAULT 0,
  edi_correct_series INTEGER DEFAULT 0,
  edi_correct_genres INTEGER DEFAULT 0,
  edi_correct_synopsis INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academy_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT '--cyan',
  cover_url TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academy_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER REFERENCES academy_areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'in-progress',
  started_on TEXT DEFAULT '',
  completed_on TEXT DEFAULT '',
  course_url TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academy_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER REFERENCES academy_areas(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES academy_courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '{}',
  view_mode TEXT DEFAULT 'wide',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Add alongside the existing index block:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_anime_series_title ON anime_series(title COLLATE NOCASE);
```

**Idempotency requirement:** every statement uses `IF NOT EXISTS`, so running this against the maintainer's existing 59-table database must be a no-op. Verify this — it is the single most important safety property of this phase.

### 1.2 Do NOT drop the unused tables

`anime`, `books`, `areas`, `courses`, `title_mappings`, `title_mapping_sources` and `series` are unused by application code, but they are entangled by foreign keys:

- `courses.area_id` to `areas.id`
- `study_notes.course_id` to `courses.id`, and `study_notes.area_id` to `areas.id`
- `title_mapping_sources.mapping_id` to `title_mappings.id`
- `book_series.series_id` to `series.id` — **`series` is load-bearing, never drop it**

They are empty or small and cost nothing. Leave them. Cleanup is a separate, optional task and is explicitly **out of scope**.

### 1.3 Stop the schema patches from failing silently

`db.js` contains roughly 150 statements of the form:

```js
try { db.exec("ALTER TABLE x ADD COLUMN y ..."); } catch {}
```

The empty `catch {}` is how this drift went unnoticed. Replace the bare catches with a helper that ignores only the expected duplicate-column error and logs anything else:

```js
function patch(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) {
      console.error('[db] schema patch failed:', sql.slice(0, 80), '->', e.message);
    }
  }
}
```

Then mechanically rewrite each `try { db.exec("ALTER TABLE ...") } catch {}` into `patch("ALTER TABLE ...")`. This is behaviour-preserving on the success path. Leave the multi-statement `try { db.exec(...CREATE TABLE...) } catch (e) {}` blocks as they are.

### Phase 1 acceptance criteria

1. Move `data/` aside, start the app, and confirm a fresh DB is created.
2. The fresh DB contains all of: `series`, `anime_series`, `anime_seasons`, `book_series`, `academy_areas`, `academy_courses`, `academy_notes`.
3. These pages load without error and allow creating a record: `/lounge/anime`, `/lounge/books`, `/academy`, `/academy/notes`.
4. Restore the original `data/`, start again, and confirm no errors and no data loss — the live DB has roughly 6,000 rows across 59 tables and row counts must be unchanged.
5. `npm run check` passes.

---

## Phase 2 — One relocatable data root

Depends on Phase 1.

### 2.1 Create `src/lib/server/paths.js`

```js
import { join } from 'path';
import { mkdirSync } from 'fs';

export const DATA_DIR = process.env.LAZARUS_DATA_DIR
  ? process.env.LAZARUS_DATA_DIR
  : join(process.cwd(), 'data');

export const UPLOADS_DIR        = join(DATA_DIR, 'uploads');
export const IMAGES_DIR         = join(UPLOADS_DIR, 'images');
export const TRANSCRIPTIONS_DIR = join(DATA_DIR, 'transcriptions');
export const AGENT_LOGS_DIR     = join(DATA_DIR, 'agent_logs');
export const DB_PATH            = join(DATA_DIR, 'lazarus.db');
export const ENGINE_CONFIG_PATH = join(DATA_DIR, 'engine-config.json');

export function ensureDirs() {
  for (const d of [DATA_DIR, UPLOADS_DIR, IMAGES_DIR, TRANSCRIPTIONS_DIR, AGENT_LOGS_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}
```

Files in `scripts/` run as standalone Node outside SvelteKit and **cannot** use the `$lib` alias — import via a relative path such as `../src/lib/server/paths.js`.

### 2.2 Replace all 20 `process.cwd()` call sites

| File | Line(s) | Currently | Replace with |
|---|---|---|---|
| `src/lib/server/db.js` | 5 | `join(cwd,'data')` | `DATA_DIR` |
| `src/lib/server/engine-config.js` | 4 | `join(cwd,'data')` | `DATA_DIR` |
| `src/lib/server/fonts.js` | 4 | `join(cwd,'data')` | `DATA_DIR` |
| `src/lib/server/llm-runner.js` | 5 | engine-config.json | `ENGINE_CONFIG_PATH` |
| `src/lib/server/testing-suite.js` | 63 | bizverse_testing_criteria.json | `join(DATA_DIR, ...)` |
| `src/routes/operations/clients/[id]/files/+server.js` | 33 | `data/uploads/client_N` | `join(UPLOADS_DIR, ...)` |
| `src/routes/settings/attachments/+page.server.js` | 7 | `static/images` | `IMAGES_DIR` |
| `src/routes/settings/engine/+server.js` | 10 | transcriptions | `TRANSCRIPTIONS_DIR` |
| `src/routes/settings/engine/+server.js` | 412, 413 | `scripts/*.py` | **leave as-is** — program files |
| `src/routes/settings/testing-suite/[id]/run/+server.js` | 49, 59, 104 | agent_logs | `AGENT_LOGS_DIR` |
| `src/routes/settings/testing-suite/[id]/run/+server.js` | 65 | `scripts/run-web-agent.js` | **leave as-is** |
| `src/routes/settings/testing-suite/[id]/run/logs/+server.js` | 6 | agent_logs | `AGENT_LOGS_DIR` |
| `scripts/agent-utils.js` | 7 | engine-config.json | `ENGINE_CONFIG_PATH` |
| `scripts/agent-utils.js` | 82 | lazarus.db | `DB_PATH` |
| `scripts/run-web-agent.js` | 22 | lazarus.db | `DB_PATH` |
| `scripts/run-web-agent.js` | 23 | agent_logs | `AGENT_LOGS_DIR` |
| `scripts/run-web-agent.js` | 300 | `static/images` | `IMAGES_DIR` (Phase 3) |

**Only paths under `data/` and `static/images` change.** The three `scripts/` paths point at program files that legitimately live in the repo — do not touch them.

### Phase 2 acceptance criteria

1. `grep -rn "process.cwd()" src/` returns only the program-file lines noted above.
2. With `LAZARUS_DATA_DIR` unset, behaviour is unchanged (data in `./data`).
3. With `LAZARUS_DATA_DIR` set to an empty directory elsewhere on disk, the app starts, creates a fresh DB there, and writes nothing into the repo working copy.
4. `npm run check` passes.

---

## Phase 3 — Move uploads out of the repo

Depends on Phase 2.

### 3.1 What actually needs migrating

Almost nothing. This was verified, not assumed:

- 11 PNGs are tracked in `static/images`, and all 11 are **orphaned** — no column in any table references any of their filenames.
- **Zero** rows in the database contain a local `/images/...` reference. Every one of the 306 `%/images/%` matches is an external CDN URL that merely contains `/images/` in its path.

**Therefore no database URL-rewriting migration is required.** Do not write one. Do not run a find-and-replace over the database — doing so would corrupt 306 external cover URLs.

### 3.2 Code changes

1. `src/routes/api/upload/image/+server.js:7` — change `const UPLOAD_DIR = 'static/images'` to `IMAGES_DIR`.
2. `src/routes/settings/attachments/+page.server.js:4` — same.
3. `scripts/run-web-agent.js:300` — same.
4. Serve the relocated files: add `src/routes/media/[...path]/+server.js` that streams a file from `IMAGES_DIR`. It **must** resolve the requested path and verify the result still starts with `IMAGES_DIR` before reading, to prevent traversal; return 404 otherwise.
5. Change the URLs the upload route returns from `/images/<file>` to `/media/<file>` — both the POST responses and the `replace` branch.
6. Update the `GET` reference-scanner in that same route: its `searchPattern` is `%/images/<filename>%` and must match `/media/` for newly written content, while still matching legacy `/images/` if any appear.

### 3.3 Repo changes

Run `git rm --cached static/images/*.png`, then add `static/images/` to `.gitignore`.

The 11 orphaned files can simply be deleted; nothing references them. To keep them instead, move them to `data/uploads/images/` first.

### 3.4 Known issue worth fixing while in this file

The POST handler's dedup logic reads and SHA-256 hashes **every existing file in the upload directory on every single upload**. Add an `upload_hashes (hash TEXT PRIMARY KEY, filename TEXT)` table and look the hash up instead of rescanning the directory. Low risk, clearly correct, and the directory only grows.

### Phase 3 acceptance criteria

1. `git status` is clean after uploading a new image — nothing appears in the repo working copy.
2. A newly uploaded image renders in the UI and is served from `/media/...`.
3. `/settings/attachments` lists images from the new location.
4. Requesting `/media/../../package.json` returns 404, not a file.
5. Spot-check three anime and three book covers — external CDN URLs must be untouched and still render.

---

## Phase 4 — Onboarding and backup

Depends on Phases 1 to 3.

### 4.1 Secrets template

`data/engine-config.json` holds 10 plaintext API keys and is correctly untracked. There is no template, so a new user cannot know what the file needs.

Create `engine-config.example.json` **in the repo root** (not in `data/`, which is ignored), with every key present and set to an empty string:

`colabNgrokToken`, `deepseekApiKey`, `elevenlabsApiKey`, `googleApiKey`, `googleBooksApiKey`, `groqApiKey`, `hfApiKey`, `nvidiaApiKey`, `opencodeApiKey`, `openrouterApiKey`

Copy the non-secret structural settings from the real file, but **every credential value must be an empty string.** Verify no real key leaks into the committed example.

The app must degrade gracefully when a key is absent: AI-backed features should surface a clear "no API key configured" message rather than throwing.

### 4.2 Startup

`package.json` uses `@sveltejs/adapter-node` but has no way to run the built output. Add `"start": "node build"` to the scripts block.

### 4.3 Backup, and the WAL trap

The DB runs in WAL mode (`db.pragma('journal_mode = WAL')`, `db.js:10`). At time of writing, `lazarus.db-wal` holds 6.2 MB of committed but not-yet-checkpointed data. **Copying `lazarus.db` alone is not a valid backup and will silently lose recent writes.**

Add a backup endpoint using SQLite's native online backup, which is safe on a running database:

```js
db.exec(`VACUUM INTO '${escapedDestPath}'`);
```

Write to `DATA_DIR/backups/lazarus-<ISO timestamp>.db`. Guard against overwriting an existing file.

### 4.4 README setup section

Document, for a brand-new user:

1. Install Node, then `git clone` the repo.
2. `npm install` — note that `better-sqlite3` is a native module and compiles on install.
3. Copy `engine-config.example.json` to `data/engine-config.json` and add **their own** API keys.
4. Optionally set `LAZARUS_DATA_DIR` to put data outside the repo.
5. `npm run dev` — port 5174, strict.
6. Backup: use the in-app backup, or stop the app and copy the whole data folder including the `-wal` and `-shm` files.
7. State plainly that data is local and per-user: nothing is shared or synced between installs, and each user needs their own API keys.

### Phase 4 acceptance criteria

1. Following the README verbatim on a clean clone with an empty data dir produces a working app.
2. `engine-config.example.json` contains no real credentials.
3. The backup endpoint produces a `.db` file that opens standalone and contains recent writes.
4. `npm run build` succeeds.

---

## Out of scope

- Authentication, user accounts, `user_id` columns, any form of multi-tenancy.
- Sharing or syncing data between users.
- Dropping unused tables (see 1.2).
- Rewriting the schema-patch system into a real migration framework.

## Sequencing

Phases are strictly ordered: 1, then 2, then 3, then 4. Commit each phase separately, with its acceptance criteria met, before starting the next.
