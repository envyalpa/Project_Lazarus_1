# Project Lazarus — Normandy LifeOS

## Overview
A self-hosted LifeOS themed after the Mass Effect Normandy SR-2 with EDI as the onboard AI. Built with SvelteKit 5 (runes mode) + SQLite.

## Tech Stack
- **Framework**: SvelteKit 5 (runes mode)
- **Language**: JavaScript (no TypeScript)
- **Database**: SQLite via better-sqlite3 (`data/lazarus.db`, WAL mode)
- **Adapter**: `@sveltejs/adapter-node` (for native module support)
- **Testing**: Vitest
- **Hosting**: Local machine
- **Icons**: Lucide Svelte (`@lucide/svelte` — requires `ssr.noExternal` in `vite.config.js`)
- **Design System**: See `docs/DESIGN_SYSTEM.md`

## Directory Structure
```
src/
├── routes/               # SvelteKit routes (one per page)
│   ├── +layout.svelte    # Shell: breadcrumbs + content + navbar
│   ├── +page.svelte      # Dashboard (Bridge)
│   ├── academy/
│   ├── academy/
  │   ├── +layout.svelte         # Pass-through layout
  │   ├── +page.svelte           # Areas list
  │   ├── +page.server.js
  │   ├── +server.js
  │   └── [id]/
  │       ├── +page.svelte       # Area detail
  │       ├── +page.server.js
  │       ├── +server.js
  │       └── course/
  │           └── [courseId]/
  │               ├── +page.svelte
  │               ├── +page.server.js
  │               └── +server.js
  ├── lounge/
│   ├── treasury/
│   │   ├── +page.js               # Redirects to /treasury/situation-report
│   │   ├── situation-report/
│   │   ├── transactions/
│   │   ├── accounts/
│   │   ├── people/
│   │   ├── categories/
│   │   ├── reports/
│   ├── operations/
│   │   ├── +layout.svelte         # Operations sub-nav
│   │   ├── +page.js               # Redirects to /operations/time-tracking
│   │   ├── time-tracking/+page.svelte
│   │   ├── tasks/+page.svelte
│   │   ├── projects/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.js
│   │   │   ├── +server.js
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── +page.server.js
│   │   │       ├── +server.js
│   │   │       └── meeting-notes/
│   │   │           └── [mnid]/
│   │   │               └── +server.js
│   │   └── clients/
│   │       ├── +page.svelte       # Clients list (table + card views)
│   │       ├── +page.server.js    # Load clients from server store
│   │       ├── +server.js         # GET list, POST create
│   │       └── [id]/
│   │           ├── +page.svelte   # Client details page
│   │           ├── +page.server.js # Load single client
│   │           └── +server.js     # GET, PUT, DELETE
│   └── engine/
│   └── settings/
│       ├── +layout.svelte     # Settings shell
│       ├── +page.svelte       # Settings home with module cards
│       └── engine/
│           ├── +page.svelte   # Audio transcription upload & display
│           ├── +page.server.js
│           └── +server.js     # POST: receive audio, transcribe via Ollama
├── lib/
│   ├── components/       # Reusable UI components
│   │   ├── operations/   # Operations-area components
│   └── server/           # Server-only modules (database, stores)
├── app.html
└── app.css               # Global theme
docs/
├── PROJECT_DOCS.md       # This file — project structure & rules
└── DESIGN_SYSTEM.md      # Design bible — colors, fonts, icons, panels, specs
```

## File Conventions
- **Max 200 lines per component**. If a component exceeds 200 lines, split it.
- **One component per file**.
- **Component files** are PascalCase: `NavBar.svelte`, `DigitalClock.svelte`
- **Route files** are SvelteKit convention: `+page.svelte`, `+layout.svelte`
- **Server files** are lowercase: `database.js`, `finance.js`
- **CSS** is scoped to each component via `<style>` (Svelte default). Global styles only in `app.css`.

## Element Naming Convention
Every major element must have a `data-section` attribute for easy inspection:

```html
<div data-section="newsroom">
  <h2 data-label="newsroom-title">Newsroom</h2>
</div>
```

Use:
- `data-section` — for major sections
- `data-label` — for labels/titles
- `data-nav` — for navigation items
- `data-item` — for list items (with `data-index`)
- `data-crumb` — for breadcrumb items
- `data-component` — for component root elements

## Design System Reference
**ALL design decisions (colors, fonts, icons, panel specs) live in `docs/DESIGN_SYSTEM.md`.** You MUST read that file before making any visual changes.

## Navigation Items
| Label     | Route          | Lucide Icon         |
|-----------|----------------|---------------------|
| Academy   | /academy       | GraduationCap       |
| Lounge    | /lounge        | Gamepad2            |
| Bridge    | /              | LayoutDashboard     |
| Treasury  | /treasury      | Wallet              |
| Operations| /operations    | Briefcase           |
| Engine    | /engine        | Settings            |

## Component Summary

### Phase 1 — Bridge (Dashboard)

| Component | Description |
|-----------|-------------|
| `src/routes/+layout.svelte` | Shell with breadcrumbs, newsroom, content area, fixed navbar |
| `src/routes/+page.svelte` | Bridge dashboard: DigitalClock + EDIGreeting |
| `src/lib/components/Panel.svelte` | Reusable sci-fi panel with optional title bar |
| `src/lib/components/Breadcrumbs.svelte` | Hierarchical nav path, Settings icon far-right |
| `src/lib/components/NavBar.svelte` | Fixed bottom nav, 5 equal-width items, 72px |
| `src/lib/components/Newsroom.svelte` | Full-width scrolling ticker bar |
| `src/lib/components/DigitalClock.svelte` | Live clock HH:MM:SS, responsive font |
| `src/lib/components/EDIGreeting.svelte` | EDI badge + rotating message, amber pill badge |

### Phase 2 — Operations

| Component | Description |
|-----------|-------------|
| `src/routes/operations/+layout.svelte` | Operations sub-nav wrapper |
| `src/routes/operations/+page.js` | Redirects to `/operations/time-tracking` |
| `src/routes/operations/time-tracking/+page.svelte` | Time tracking page: toolbar, timeline, time entries table |
| `src/routes/operations/time-tracking/+page.server.js` | Loads clients, projects, tasks for cascading dropdowns |
| `src/routes/operations/time-tracking/+server.js` | REST API: GET (date/range), POST, PUT, DELETE time entries |
| `src/lib/components/operations/TimeTrackingTimeline.svelte` | Virtual day-scrolling timeline with current-time red line |
| `src/lib/components/operations/TimeEntryModal.svelte` | Create/Edit modal: time picker, task autocomplete, cascade |
| `src/lib/components/operations/AllEntriesModal.svelte` | Full-screen modal with filters (day/week/month/range) |
| `src/routes/operations/tasks/+page.svelte` | Tasks list: toolbar (New Task + ArrowUpDown sort), TasksTable, StatusDashboard, create/edit/delete/bulk modals; status counts computed client-side via `$derived.by()` |
| `src/routes/operations/tasks/+page.server.js` | Loads tasks (via getAll), statusCounts (via getStatusCounts), clients with nested projects for cascade dropdown |
| `src/routes/operations/tasks/+server.js` | GET all tasks + status counts; POST create task or bulk delete (`{ bulk_delete: true, ids: [...] }`) |
| `src/routes/operations/tasks/[id]/+page.svelte` | Task detail: header with source info, 2 tabs (Notes + Time Entries placeholder), edit/delete modals |
| `src/routes/operations/tasks/[id]/+page.server.js` | Loads single task by ID |
| `src/routes/operations/tasks/[id]/+server.js` | GET/PUT/DELETE single task |
| `src/routes/operations/tasks/[id]/notes/+server.js` | GET/PUT task notes |
| `src/routes/operations/projects/+page.svelte` | Projects list with card/table toggle, ArrowUpDown sort button (Default/Name/Status), edit/delete on cards & table rows, create/edit/delete modals with ProjectForm |
| `src/routes/operations/projects/+page.server.js` | Loads all projects + clients (for dropdown) |
| `src/routes/operations/projects/+server.js` | REST API: GET list with counts, POST create |
| `src/routes/operations/projects/[id]/+page.svelte` | Project detail with header, edit/delete, tabs (Story so Far, Meeting Notes, Tasks, Activity) |
| `src/routes/operations/projects/[id]/+page.server.js` | Loads project, entries, meeting notes, activity, client |
| `src/routes/operations/projects/[id]/+server.js` | REST API: GET with counts, PUT, DELETE |
| `src/routes/operations/projects/[id]/meeting-notes/+server.js` | REST API: GET by project, POST (client_id derived from project) |
| `src/routes/operations/projects/[id]/meeting-notes/[mnid]/+server.js` | REST API: GET, PUT, DELETE |
| `src/routes/operations/clients/+page.svelte` | Client list with toolbar, ArrowUpDown sort button (Default/Name), table/card toggle; table cell shows `client.projectCount ?? 0` |
| `src/routes/operations/clients/+page.server.js` | Loads clients from server store |
| `src/routes/operations/clients/+server.js` | REST API: GET list, POST create |
| `src/routes/operations/clients/[id]/+page.svelte` | Client details with tabs, edit/delete; `.modal-wide` max-width 960px; MeetingNotesCards receives `{projects}` prop |
| `src/routes/operations/clients/[id]/+page.server.js` | Loads single client |
| `src/routes/operations/clients/[id]/+server.js` | REST API: GET, PUT, DELETE |
| `src/lib/components/operations/OperationsNav.svelte` | Sub-nav tabs: Time Tracking, Tasks, Projects, Clients |
| `src/lib/components/operations/Modal.svelte` | Reusable modal overlay with close, escape, backdrop click |
| `src/lib/components/operations/DynamicIcon.svelte` | Renders any Lucide icon by name (string) |
| `src/lib/components/operations/ClientForm.svelte` | Add/Edit form: name, icon picker, color, logo, description (no projects/notes fields — handled in detail page) |
| `src/lib/components/operations/ClientCard.svelte` | Card view for a single client |
| `src/lib/components/operations/ProjectForm.svelte` | Add/Edit form for projects: name, client, status select, ColorPicker, description |
| `src/lib/components/operations/ProjectCard.svelte` | Card for project list grid: DynamicIcon, name, description, client badge, status badge, task count, edit/delete icon buttons (onclick events with stopPropagation) |
| `src/lib/components/operations/DeleteConfirm.svelte` | Delete confirmation dialog with project/task counts |
| `src/lib/components/operations/ClientTabs.svelte` | Tab bar: Story so Far, Personnel, Meeting Notes, Files, Activity |
| `src/lib/server/db.js` | SQLite database init & full schema (all areas) |
| `src/lib/server/clients.js` | SQLite CRUD store for clients (getAll includes `projectCount` subquery) |
| `src/lib/server/entries.js` | SQLite CRUD for story entries + action_items, links/meeting-note junction tables; getByProject(), attachRelations() helper |
| `src/lib/server/contacts.js` | SQLite CRUD for contacts |
| `src/lib/server/meeting-notes.js` | SQLite CRUD for meeting notes + action items; getByProject(), getClientIdByProject() |
| `src/lib/server/client-files.js` | SQLite CRUD for client files |
| `src/lib/server/activity.js` | Activity log read + `logActivity()` helper; getByProject() joins on client_id |
| `src/lib/server/projects.js` | Full CRUD: getAll/getById/getByClient/create/update/remove with client_name JOIN + entry/meeting-note/task count subqueries |
| `src/lib/links.js` | URL→Lucide icon domain mapping with `getIconForUrl()` |
| `src/lib/server/tasks.js` | Full CRUD: getAll (JOINs clients+projects for names), getById (with sub_tasks), getByProject/getByClient, create/update/remove/removeMultiple, getStatusCounts (grouped 6 statuses), updateNotes, sub-task management (addSubTask, updateSubTask, deleteSubTasks with `keep_` prefix for preserving existing IDs) |
| `src/lib/components/operations/StoryTimeline.svelte` | 3-column grid timeline with date badges, connector dots, cyan arms; clickable timeline-card calls onedit |
| `src/lib/components/operations/StoryEntryModal.svelte` | 2-column form (1fr 2fr): title+date+project+links+meeting-note autocomplete + action items (input/status/remove) + body textarea (min-height 375px); `.modal-wide` max-height 95vh |
| `src/lib/components/operations/ContactsTable.svelte` | Table with `<colgroup>` 30/22/22/18/8, inner flex wrappers |
| `src/lib/components/operations/ContactModal.svelte` | 4-field form (name, designation, email, phone) |
| `src/lib/components/operations/MeetingNotesCards.svelte` | Card grid with `--bg-card` background, outline badges; props: apiBase (overridable), projects (passed through); clickable cards; grid badge layout |
| `src/lib/components/operations/MeetingNoteModal.svelte` | 2-column grid: title+date+action items+project selector left, notes right; status badge; props: projects[], projectId state |
| `src/lib/components/operations/FilesTable.svelte` | Table with `<colgroup>` 32/12/40/16, DynamicIcon in type column via getIconForUrl() (re-derives from link, not stored file_type) |
| `src/lib/components/operations/FileModal.svelte` | Auto-detects icon from link URL via `getIconForUrl()`, shows preview |
| `src/lib/components/operations/ActivityLog.svelte` | Chronological activity list with action labels + timestamps |
| `src/lib/components/operations/DatePicker.svelte` | Custom themed calendar picker popover |
| `src/lib/components/operations/LinkIcon.svelte` | Thin wrapper rendering DynamicIcon from URL via `getIconForUrl()` |
| `src/lib/components/operations/TaskForm.svelte` | 2-column form (1fr 2fr): left col with title, client/project cascade, status select, DatePickers, sub-tasks; right col with description textarea (min-height 300px) |
| `src/lib/components/operations/TasksTable.svelte` | 9-column table (checkbox + name link + status + client + project + start + due + phase + actions), multi-select with bulk delete toolbar, phase badges (Overdue/Today/Upcoming) |
| `src/lib/components/operations/StatusDashboard.svelte` | 6-block status count grid (repeat 6, 1fr), colored by status (--text-dim / --amber / --accent-cyan / --purple / --blue / --success) |
| `src/lib/components/operations/TaskNotesEditor.svelte` | Full-height textarea with Save Notes button, PUT to `/operations/tasks/{id}/notes` |
| `src/lib/components/operations/TimeTrackingTimeline.svelte` | Virtual day-scrolling timeline with current-time red line, density, task/project/client chips |
| `src/lib/components/operations/TimeEntryModal.svelte` | 2-column form (1fr 1.5fr): time picker, task autocomplete with cascade, auto-format "0100"→"01:00" |
| `src/lib/components/operations/AllEntriesModal.svelte` | 90% viewport modal with filters (day/week/month/range/client/project) |

### Phase 3 — Academy

| Component | Description |
|-----------|-------------|
| `src/lib/components/academy/AcademyNav.svelte` | 3-tab static sub-nav (Areas / Courses / Notes) linking to `/academy`, `/academy/courses`, `/academy/notes` with route-depth active states |
| `src/lib/components/academy/AreaCard.svelte` | Card for areas grid: 16:9 cover, icon watermark, priority badge, course/note counts, hover-reveal edit/delete, density variants |
| `src/lib/components/academy/AreaForm.svelte` | Add/Edit form: name, cover_url, description, icon, color, priority |
| `src/lib/components/academy/CourseCard.svelte` | Card for courses: 4:3 cover image, status pill, started date, hover-reveal edit/delete on cover, density variants |
| `src/lib/components/academy/CourseForm.svelte` | Add/Edit form: area, name, description, status, started_on, completed_on, course_url, cover_image |
| `src/lib/components/academy/NoteCard.svelte` | Note list item with title, optional areaName/courseName context badges, edit/delete, density variants |
| `src/lib/components/academy/NoteForm.svelte` | Simplified Add/Edit form: just title input |
| `src/routes/academy/+layout.svelte` | Pass-through layout for academy routes |
| `src/routes/academy/+page.svelte` | Areas list page with card grid, density/sort toggles, add/edit/delete modals |
| `src/routes/academy/+page.server.js` | Loads areas |
| `src/routes/academy/+server.js` | REST API: GET list, POST create/delete |
| `src/routes/academy/[id]/+page.svelte` | Area detail with 60-40 grid (courses card grid | notes list), density toggles, CRUD modals |
| `src/routes/academy/[id]/+page.server.js` | Loads area + courses + notes |
| `src/routes/academy/[id]/+server.js` | REST API: GET/PUT/DELETE area, POST create course, POST note CRUD |
| `src/routes/academy/[id]/course/[courseId]/+page.svelte` | Course detail with header, notes panel (card/list toggle), density toggle, CRUD modals |
| `src/routes/academy/[id]/course/[courseId]/+page.server.js` | Loads area + course + notes |
| `src/routes/academy/[id]/course/[courseId]/+server.js` | REST API: GET/PUT/DELETE course, POST note CRUD |
| `src/routes/academy/courses/+page.svelte` | All courses aggregate view: card grid or list with sort/density/view toggles |
| `src/routes/academy/courses/+page.server.js` | Loads all courses with area names |
| `src/routes/academy/notes/+page.svelte` | All notes aggregate view: card or list with sort/density/view toggles |
| `src/routes/academy/notes/+page.server.js` | Loads all notes with area/course names |
| `src/lib/server/academy/areas.js` | SQLite CRUD for areas (with course_count and note_count subqueries) |
| `src/lib/server/academy/courses.js` | SQLite CRUD for courses (with area_name JOIN) |
| `src/lib/server/academy/notes.js` | SQLite CRUD for notes (with area/course names via JOIN) |

### Phase 5 — Treasury Reports & Insights

| Component | Description |
|-----------|-------------|
| `src/lib/server/transcribe.js` | (deprecated in favor of whisper.cpp) |
| `src/routes/settings/engine/+page.svelte` | 2-column layout: left = upload & transcription, right = EngineResourcePanel |
| `src/routes/settings/engine/+server.js` | POST multipart audio → validate → chunk → transcribe via whisper.cpp → SSE stream; GET system info + config; POST start/stop/restart/save-config |
| `src/lib/server/engine-config.js` | Config persistence (`data/engine-config.json`), GPU detection (nvidia-smi + CUDA DLL check), CLI args builder for whisper-server |
| `src/lib/server/whisperServerManager.js` | Manages whisper-server process lifecycle; accepts engine settings, builds CLI args via engine-config.js |
| `src/lib/components/settings/EngineResourcePanel.svelte` | Right-column settings panel: Compute Resources, Accuracy, Audio Processing, Server Control, System Info |
| `src/lib/components/settings/TranscriptionProgress.svelte` | 4-stage progress card with animated bars, chunk counter, elapsed badge |
| `src/lib/server/treasury/analytics.js` | Analytical report queries (monthly trends, period comparison, paid-for analysis, net worth trajectory) |
| `src/lib/components/treasury/MonthlyTrends.svelte` | SVG line chart: income (green), expense (red), net (cyan) with Week/Month/Year toggle |
| `src/lib/components/treasury/NetWorthTrajectory.svelte` | SVG chart: assets (green bars), liabilities (red bars), net worth (cyan line with dots) per month |
| `src/routes/treasury/reports/+page.svelte` | Reports page: vertical stack (Monthly Trends → Net Worth → Insights) |
| `src/routes/treasury/reports/+page.server.js` | Loads trends data (weekly/monthly/yearly) + net worth history |

## Common Patterns

### Edit Modal Pattern
Any "Edit" button opens the same Modal component + form as "Add", pre-filled with the existing item's data.
- Reuse the same form component for both create and update
- Pass the existing object as `client={item}` prop to pre-fill fields
- Pass `client={null}` for create mode
- Modal title changes dynamically: "Add New Client" vs "Edit Client"
- This pattern applies to all CRUD forms (clients, projects, tasks, etc.)

### Section Box Pattern
Related lists (Tasks, Links, Sub-Tasks) inside forms are wrapped in `.section-box` containers with a centered `.box-label` header and a colored background tint matching their purpose:
- Tasks: purple tint (`rgba(168, 85, 247, 0.06)`)
- Links: amber tint (`rgba(255, 140, 0, 0.06)`)
- Sub-Tasks: cyan tint (`rgba(0, 212, 255, 0.06)`)
- See `docs/DESIGN_SYSTEM.md` §6.39 for full spec.

### Server-Only Load Functions
Use `+page.server.js` (not `+page.js`) when the `load` function imports from `$lib/server/` modules. Server-only modules must never be imported into client code.

### SQLite Store Pattern

All data stores use `better-sqlite3` via `$lib/server/db.js`. Each entity module (e.g. `clients.js`) imports `db` and prepares statements at module load time:

```js
import db from './db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM clients ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  create: db.prepare('INSERT INTO clients (...) VALUES (...)'),
  update: db.prepare('UPDATE clients SET ... WHERE id = @id'),
  remove: db.prepare('DELETE FROM clients WHERE id = ?')
};
```

**Key rules:**
- Always use prepared statements (never raw string interpolation)
- Named params (`@name`) for mapped objects, positional (`?`) for single values
- `get()` returns a single row or `undefined`; `all()` returns an array
- `run()` returns `{ changes, lastInsertRowid }`
- Return `null` (not `undefined`) when a record is not found, to match the old Map API
- Wrap `create`/`update` return values with a `getById()` call to return the full row

### REST API Pattern
Each data entity gets two `+server.js` files:
- `routes/entity/+server.js` — GET (list), POST (create)
- `routes/entity/[id]/+server.js` — GET (single), PUT (update), DELETE (delete)

### Sort Button Pattern
List pages (projects, clients, tasks) use an `ArrowUpDown` sort button in the toolbar that cycles through sort modes:
- **Projects**: `default` → `alphabetical` (by name) → `status` (by status order)
- **Clients**: `default` → `alphabetical` (by name)
- **Tasks**: `default` → `alphabetical` (by title) → `status` (by status order: not-started→on-hold→in-progress→internal-review→external-review→completed)
- Implemented via `$derived.by()` with a local `sortMode` state variable

### Card Edit/Delete Actions
`ProjectCard.svelte` accepts `onedit` and `ondelete` callback props. Action buttons render inside a `<div role="presentation" onclick={(e) => e.stopPropagation()}>` to prevent the card's `<a>` navigation from firing. Same pattern for table row buttons.

### Dynamic Icon Rendering
To render a Lucide icon by string name, use `DynamicIcon.svelte` which has a lookup map. The icon name is stored as a string in the data model and resolved at render time.

### Task Phase Computation
Phase column in TasksTable is computed client-side from `due_date`:
```js
function getPhase(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'Overdue', class: 'phase-overdue' };
  if (diff === 0) return { label: 'Today', class: 'phase-today' };
  return { label: 'Upcoming', class: 'phase-upcoming' };
}
```

### Task Status Count Dashboard
StatusDashboard displays aggregate counts for all 6 task statuses. The tasks list page computes counts client-side via `$derived.by()` instead of a server call, making it reactive to local state changes (create/edit/delete without re-fetching).

### Sub-Task `keep_` ID Pattern
When saving sub-tasks (action_items) in TaskForm, existing items preserve their IDs by prefixing with `keep_`:
- Server (`tasks.js` `update()`): checks `id.toString().startsWith('keep_')` → strips prefix and calls `updateSubTask`; otherwise calls `addSubTask`
- Same pattern used by StoryEntryModal and MeetingNoteModal for action items

### Bulk Task Delete Flow
1. User checks multiple rows in TasksTable → `selectedTasks` array populated
2. Multi-select toolbar appears showing count + "Delete Selected" button
3. Clicking it calls `onbulkdelete(ids)` on the parent page
4. Parent shows confirmation modal → POST to `/operations/tasks` with `{ bulk_delete: true, ids: [...] }`
5. Server calls `removeMultiple(ids)` which builds dynamic `DELETE FROM tasks WHERE id IN (?,?,?)` from placeholders

### Task Client→Project Cascade
TaskForm has a client select that filters the project dropdown:
- `projects` is computed via `$derived` from `clientId` and the `clients` prop's nested `projects` arrays
- `$effect` watches `projects` — if current `projectId` doesn't exist in filtered list, resets to `null`
- Clients are loaded in `+page.server.js` with nested projects: `clients.map(c => ({...c, projects: projects.filter(p => p.client_id === c.id)}))`

### Font Library — Family/Variant Model
`src/lib/fonts.js` exports categorized font arrays (`HEADING_FONTS`, `BODY_FONTS`, `MONO_FONTS`) and a deduplicated `ALL_FONTS` array. Every entry now has:

- `family` — base family name for grouping (e.g. `'Barlow'`, `'Fira Sans'`)
- `variant` — variant name or `null` for the base/regular variant (e.g. `'Condensed'`, `'Extra Condensed'`)

Helper exports:
- `getDistinctFamilies()` — returns sorted unique family names for family dropdowns
- `getFontsByFamily(family)` — returns all font entries sharing a family
- `resolveFontId(family, variant)` — finds the font ID for a family+variant pair

Single-variant families (e.g. `Orbitron`, `Rajdhani`) use `family: <name>`, `variant: null`. Multi-variant families (e.g. `Barlow` with Regular/Condensed/Semi Condensed) share the same `family` value with different `variant` values.

### Typography Table — Sub Family Dropdown
The typography table on `/settings/system-design` replaces the single font selector with a **Family dropdown** + **Sub Family dropdown** per row. The Family dropdown lists distinct families (deduplicated). The Sub Family dropdown shows variants for the selected family:
- Families with only one entry: static `—` indicator
- Multi-variant families: dropdown lists each variant (`"Regular"` for `variant: null`, variant name otherwise)

When the family changes, the variant auto-resets to the first available variant via `$effect`. Both dropdowns resolve to a single font ID for config persistence.

## Treasury Statement Ingest

A command-prefixed workflow for bank statement ingestion. See `docs/STATEMENT_INGEST.md` for full reference. The automation script `scripts/ingest-statement.js` parses PDFs, deduplicates, normalizes titles, detects splits, and inserts into SQLite. Invoked via:

```
node scripts/ingest-statement.js --path "C:\Path\to\statement.pdf" [--password "ALLE1606"] [--bank federal] [--confirm]
```

Supporting entries can be provided as a text block after the command or via `--supporting` followed by CSV lines.

## When Adding New Features
1. Read `docs/DESIGN_SYSTEM.md` and `docs/PROJECT_DOCS.md` fully.
2. Create a new route file in `src/routes/` (SvelteKit convention).
3. Keep the route component under 200 lines — move UI to `src/lib/components/`.
4. Wrap content sections in the Panel component (with corner notches).
5. Use Lucide icons — never emoji.
6. Add `data-section` attributes to all new elements.
7. Use colors and fonts from DESIGN_SYSTEM.md.
8. Update DESIGN_SYSTEM.md with any new conventions or patterns.
9. Run `npm run build` to verify no errors.
