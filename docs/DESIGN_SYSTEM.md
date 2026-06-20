# Project Lazarus — Design System

> Normandy LifeOS · Mass Effect SR-2 Inspired · Blue/Cyan Holographic Theme

---

## 1. Design Philosophy

The interface should feel like the Normandy's CIC — clean holographic readouts on dark space backgrounds, with blue-cyan light as the primary visual language. Every pixel serves a purpose. The aesthetic is **military sci-fi meets minimal data dashboard**.

- Dark backgrounds let the cyan glow elements breathe
- Panels have 5px rounded corners (never parallelograms)
- Typography is geometric and condensed — clean, readable, futuristic
- Icons are outline-style SVGs, consistent 24px grid, 2px stroke
- **Readability is paramount** — 16px is the minimum font size everywhere

---

## 2. Color Palette

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-surface` | `#050814` | Darkest — breadcrumbs bar, bottom navbar |
| `--bg-card` | `#0a1228` | Lighter surface for cards, table header rows |
| `--bg-bar` | `#081024` | Newsroom bar |
| `--bg-nav` | `#0b1830` | Operations sub-nav |
| `--bg-primary` | `#0e203c` | Main page background |
| `--bg-panel` | `#14284a` | Panel/card backgrounds |
| `--bg-elevated` | `#1c3458` | Lightest — hover states, active nav items |

All seven form a strict monotonic gradient from darkest (surface) to lightest (elevated). No value is darker than the one above it in the layout. `--bg-card` sits between `--bg-surface` and `--bg-bar`.

### Accents
| Token | Value | Usage |
|-------|-------|-------|
| `--cyan` | `#00d4ff` | Primary accent — holographic cyan |
| `--cyan-dim` | `#0088b3` | Muted cyan for inactive states |
| `--cyan-glow` | `rgba(0, 212, 255, 0.25)` | Cyan glow effect |
| `--blue` | `#0088ff` | Secondary blue accent |
| `--blue-glow` | `rgba(0, 136, 255, 0.2)` | Blue glow effect |
| `--amber` | `#ff8c00` | Warnings, labels (use sparingly) |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text` | `#e2e8f0` | Primary body text |
| `--text-dim` | `#7b8ba3` | Secondary text, metadata |
| `--text-muted` | `#4a5a73` | Disabled, placeholders |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#1a2740` | Default panel border |
| `--border-glow` | `rgba(0, 212, 255, 0.15)` | Subtle cyan border glow |

### Status
| Token | Value | Usage |
|-------|-------|-------|
| `--danger` | `#ef4444` | Errors, critical alerts |
| `--success` | `#22c55e` | Success states |

### Task Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--purple` | `#a855f7` | Internal Review status badge and dashboard block |

### Client Color Palette (20 colors)
| Token | Value | Label |
|-------|-------|-------|
| `--cyan` | `#00d4ff` | Cyan |
| `--cyan-light` | `#33ddff` | Light Cyan |
| `--cyan-dark` | `#0088b3` | Dark Cyan |
| `--blue` | `#0088ff` | Blue |
| `--blue-light` | `#3399ff` | Light Blue |
| `--blue-dark` | `#004499` | Dark Blue |
| `--indigo` | `#6366f1` | Indigo |
| `--purple` | `#a855f7` | Purple |
| `--magenta` | `#d946ef` | Magenta |
| `--pink` | `#f472b6` | Pink |
| `--amber` | `#ff8c00` | Amber |
| `--amber-light` | `#ffbb33` | Light Amber |
| `--amber-dark` | `#cc6b00` | Dark Amber |
| `--green` | `#22c55e` | Green |
| `--green-light` | `#4ade80` | Light Green |
| `--green-dark` | `#16a34a` | Dark Green |
| `--red` | `#ef4444` | Red |
| `--red-light` | `#f87171` | Light Red |
| `--red-dark` | `#dc2626` | Dark Red |
| `--teal` | `#14b8a6` | Teal |

These are exported from `$lib/shared/colors.js` as `colors`, `colorValues`, and `colorLabels` arrays/objects. Import instead of defining inline.

### Spacing & Sizing
| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `5px` | All border-radius values |

---

## 3. Typography

### 3.1 The 6-Class Text System

All typography in the app derives from exactly six text classes. Every font-size uses a `--fs-*` CSS variable (never hardcoded px). Every font-family uses a `--font-*` CSS variable (never hardcoded strings).

| # | Class Name | Font | Weight | Size Var | Color | Transform | Letter Spacing | Applies to |
|---|------------|------|--------|----------|-------|-----------|----------------|------------|
| 1 | **Heading** | Orbitron | 700 | `--fs-heading` (24px) | `--cyan` | uppercase | 1px | Page titles (Academy, Treasury, Settings), entity names at the top of detail pages |
| 2 | **Section Heading** | Orbitron | 600 | `--fs-section` (18px) | `--cyan` | uppercase | 1.5px | Panel headers, modal titles, card names in entity lists, section titles, EDI prefix, newsroom label, clock date |
| 3 | **Body Normal** | Rajdhani | 400 | `--fs-body` (16px) | `--text` | none | none | Body text, descriptions, table cells, buttons, inputs, breadcrumbs, EDI messages, newsroom headlines, empty states, data values/stats |
| 4 | **Body Small** | Rajdhani | 500 | `--fs-small` (14px) | `--text-dim` | none | none | Metadata, status badges, timestamps, form field labels, table column headers (th), source labels, activity action labels, secondary info |
| 5 | **Nav Labels** | Orbitron | 600 | `--fs-nav` (11px) | `--text-dim` | uppercase | 0.5px | Bottom navbar labels, operations sub-nav tabs (decorative, exempt from 14px min rule) |
| 6 | **Clock Display** | Orbitron | 700 | `--fs-clock` (72px, clamped) | `--text` | none | none | Bridge digital clock digits |

### 3.2 CSS Custom Properties

| Variable | Default | Class Mapping |
|----------|---------|---------------|
| `--fs-heading` | `24px` | Heading |
| `--fs-section` | `18px` | Section Heading |
| `--fs-body` | `16px` | Body Normal |
| `--fs-small` | `14px` | Body Small |
| `--fs-nav` | `11px` | Nav Labels |
| `--fs-clock` | `72px` | Clock Display |

### 3.3 CSS Custom Properties (Font Families)

| Variable | Default | Used By Classes |
|----------|---------|----------------|
| `--font-heading` | `'Orbitron', sans-serif` | Heading, Section Heading, Nav Labels, Clock Display |
| `--font-body` | `'Rajdhani', sans-serif` | Body Normal, Body Small |
| `--font-mono` | `'Courier New', Courier, monospace` | Code blocks, raw data displays |

### 3.4 Quick Reference — What Goes Where

| UI Element | Class | Notes |
|------------|-------|-------|
| Page title (h1) | Heading | Top of every page |
| Entity detail name | Heading | E.g., "Acme Corp" on client detail, "Checking Account" on account detail |
| Panel header | Section Heading | `<Panel title="...">` |
| Modal title | Section Heading | |
| Card name in entity lists | Section Heading | Card titles in accounts, people, categories, areas, courses, projects cards |
| Body text | Body Normal | Descriptions, paragraphs, table cells |
| Buttons, inputs | Body Normal | |
| Table cells (td) | Body Normal | |
| Empty state text | Body Normal | "No items yet" messages |
| Breadcrumbs | Body Normal | Rajdhani 500 weight, uppercase, 1px letter-spacing |
| Table column header (th) | Body Small | All table header cells |
| Status badge | Body Small | Task status, project status pills |
| Form field label | Body Small | |
| Timestamps, metadata | Body Small | |
| Author description | Body Normal | BookAuthors component |
| Nav label (bottom bar) | Nav Labels | 11px, exempt from 14px min rule |
| Clock digits | Clock Display | Bridge only |

### 3.5 Unbreakable Rules

- **14px is the minimum font size for all readable UI elements.** Never use fonts smaller than 14px for body text, breadcrumbs, newsroom text, EDI messages, and panel titles. Compact UI elements like nav labels (11px Orbitron `--fs-nav`) and decorative items (separator dots, watermark text) are exempt.
- **Never hardcode font-size in px.** Always use `--fs-*` variables.
- **Never hardcode font-family.** Always use `--font-*` variables.
- **Body Small uses `--text-dim`** (not `--text`) as its default color, because it's by definition secondary/informational text.

### Unbreakable Rule
**14px is the minimum font size for all readable UI elements.** Never use fonts smaller than 14px for body text, breadcrumbs, newsroom text, EDI messages, and panel titles. Compact UI elements like nav labels (11px Orbitron, uses `--fs-nav`) and decorative items are exempt.

### Font Source
- **Orbitron**: Google Fonts (`wght@400;600;700;900`)
- **Rajdhani**: Google Fonts (`wght@300;400;500;600;700`)
- **Monospace**: System (Courier New, Consolas) — for raw data tables only
- **ITC Conduit**: Local woff2 files at `static/fonts/conduit/` (Light, Medium, Bold + Italics)

---

## 4. Iconography

### Library
`@lucide/svelte` — MIT licensed, tree-shakeable, first-class Svelte support. Requires `ssr.noExternal` in `vite.config.js`.

### Icon Inventory
| Context | Icon Component | Size | Color |
|---------|---------------|------|-------|
| Academy nav | `GraduationCap` | 20px | `--text-dim` (active: `--cyan`) |
| Lounge nav | `Gamepad2` | 20px | `--text-dim` (active: `--cyan`) |
| Bridge nav | `LayoutDashboard` | 24px | `--text-dim` (active: `--cyan`) |
| Treasury nav | `Wallet` | 20px | `--text-dim` (active: `--cyan`) |
| Operations nav | `Briefcase` | 20px | `--text-dim` (active: `--cyan`) |
| Engine | `Settings` | 18px | `--text-dim` (top-right breadcrumbs area) |
| Newsroom | `Radio` | 18px | `--cyan` |
| Breadcrumb sep | `ChevronRight` | 16px | `--text-muted` |
| Add Client | `Plus` | 18px | `--cyan` |
| Table View | `Table` | 18px | `--text-dim` (active: `--cyan`) |
| Card View | `LayoutGrid` | 18px | `--text-dim` (active: `--cyan`) |
| Edit | `Pencil` | 18px | `--cyan` |
| Delete | `Trash2` | 18px | `--danger` |
| Back | `ArrowLeft` | 16px | `--text-dim` |
| Close | `X` | 18px | `--text-dim` |
| Alert | `TriangleAlert` | 32px | `--danger` |
| Placeholder | `Timer` / `CheckSquare` / `FolderKanban` | 48px | `--cyan-dim` |
| Task Add | `Plus` | 18px | `--cyan` |
| Task Create from Entry | `ExternalLink` | 14px | `--text-dim` |
| Task Status Open | `Circle` | 14px | `--text-dim` |
| Task Status Done | `Check` | 14px | `--success` |
| Sub-task Add | `Plus` | 14px | `--text-dim` |
| Sub-task Remove | `X` | 14px | `--danger` |
| Recent Tasks | `ListTodo` | 18px | `--text-dim` |
| Internal Review | `--purple` | — | `#a855f7` |
| Sort | `ArrowUpDown` | 18px | `--text-dim` (hover: `--cyan`) |
| External Link | `ExternalLink` | 14px | `--text-dim` |
| Calendar Chevron | `ChevronLeft` / `ChevronRight` | 16px | `--text-dim` |

### Icon Rules
- Always import from `@lucide/svelte` — never use emoji as icons
- Icon color inherits from parent text color unless specified
- Do not add background shapes or borders to icons
- Icons are always `strokeWidth={2}` (Lucide default)
- URL-to-icon mapping lives in `$lib/links.js` — a `domainMap` object mapping domain patterns to Lucide icon names, exported via `getIconForUrl(url)` function. Also checks path patterns for `docs.google.com` sub-routes (`/spreadsheets/` → `Table`, `/document/` → `FileText`, `/presentation/` → `Monitor`, `/forms/` → `ClipboardCheck`). Used by `LinkIcon.svelte` and `FileModal.svelte` for auto-detection.

---

## 5. Panel System

### The Panel Component (`Panel.svelte`)
Content sections wrap in this component for consistent styling.

### Panel Specification
```
┌───────────────────────────────────────┐
│           TITLE (centered)            │  ← Orbitron, 16px, uppercase, cyan
├───────────────────────────────────────┤
│                                       │
│  Content area (children / slot)       │
│                                       │
└───────────────────────────────────────┘
```

### Panel Styles
- Header background: `var(--panel-header-bg)` (darker shade, defaults to `var(--bg-panel)`)
- Content background: `var(--panel-content-bg)` (lighter shade, defaults to `var(--bg-panel)`)
- Border: `1px solid var(--border)`
- Border-radius: `var(--radius)` (5px)
- Title bar: centered, bottom border, 16px Orbitron, optional Lucide icon before title via `icon` prop
- Transition: border-color and box-shadow on hover
- Accepts `class` prop to override backgrounds via CSS variables (e.g., `.panel-accounts` sets `--panel-header-bg` and `--panel-content-bg` for green tint)

---

## 6. Component Design Specifications

### 6.1 NavBar
- Fixed bottom bar, 72px height
- Background: `--bg-surface` (darkest), top border: `1px solid var(--border)`
- **5 equal-width items**: Academy | Lounge | Bridge | Treasury | Operations (all `flex: 1`)
- **No engine icon** — Settings moved to breadcrumbs area (top-right)
- **Bridge (active)**: elevated background, cyan border, cyan box-shadow glow
- **Nav labels**: Orbitron, 11px, uppercase, 0.5px letter-spacing
- **Active nav item**: `--cyan` color, `--bg-elevated` background
- **Border-radius**: `var(--radius)` on all interactive elements

### 6.2 Breadcrumbs
- Bar at page top: background `--bg-surface` (darkest), bottom border `1px solid var(--border)`
- **Center-aligned** navigation text
- **Settings icon**: `Settings` Lucide icon, positioned absolute right, vertically centered
- **Crumb text**: Rajdhani, 16px, uppercase, 1px letter-spacing
- **Separator**: `ChevronRight` icon, 16px, `--text-muted` color
- **Active crumb**: `--text` color, weight 600
- **Inactive crumb**: `--text-dim` color, hover → `--cyan`

### 6.3 Newsroom (Flat Bar)
- **Not wrapped in Panel** — it's a flat status bar directly under breadcrumbs
- Full-width bar: background `--bg-bar`, bottom border
- Single horizontal row: `[ NEWSROOM label ] [ Radio icon ] [ scrolling ticker ]`
- **Label**: Orbitron, 16px, uppercase, cyan
- **Ticker**: horizontal auto-scrolling, 35s cycle
- **Source label**: Rajdhani, 16px, uppercase, amber color
- **Headline text**: Rajdhani, 16px, `--text-dim`

### 6.4 DigitalClock
- **Fills remaining vertical space** between Newsroom and EDI panel
- Centered both vertically and horizontally via `flex: 1; align-items: center; justify-content: center`
- **Time digits**: Orbitron, 72px, 700 weight, `--text` color
- **Glow**: `text-shadow: 0 0 10px var(--cyan-glow), 0 0 40px rgba(0, 212, 255, 0.1)`
- **Date**: Rajdhani, 18px, 500 weight, `--text-dim`, uppercase, 2px letter-spacing
- No panel wrapper — stands alone

### 6.5 EDIGreeting
- **No Panel wrapper** — compact inline text directly under the clock date
- Centered layout: `EDI:` prefix (Orbitron, cyan) + message text (Rajdhani, `--text-dim`)
- **Prefix**: Orbitron, 16px, bold, cyan with glow
- **Message text**: Rajdhani, 16px, natural conversational tone
- **Rotating messages** cycle every 8 seconds (4 messages)
- Tight spacing (`margin-top: 4px` from date)

### 6.6 Dashboard (Bridge)
- Vertical flex layout: Newsroom bar → center-group (flex: 1, centered)
- center-group: DigitalClock + EDIGreeting (compact, directly under date)
- Clock at natural height (not flex: 1), EDI message inline below
- `data-section="dashboard"` on container

### 6.7 OperationsNav
- Horizontal tab bar under newsroom, full-width (no max-width constraint on main)
- Rendered conditionally in main `+layout.svelte` when route starts with `/operations`
- Full-width bar with `--bg-nav` background, `border-top` + `border-bottom`, `margin-bottom: 10px`
- 4 equal-width tabs (flex: 1): Time Tracking, Tasks, Projects, Clients
- Each tab: Lucide icon (18px) + Rajdhani 16px label, centered with 8px gap
- Active tab: cyan text + `2px solid var(--cyan)` bottom border
- Hover tab: cyan text, `--bg-elevated` background
- 4 tabs: Time Tracking, Tasks, Projects, Clients (equal padding)
- Tab text: Rajdhani 16px, uppercase, 0.5px letter-spacing
- Active tab: cyan text + `2px solid var(--cyan)` bottom border
- Hover tab: cyan text, `--bg-elevated` background
- `data-section="operations-nav"` on container

### 6.8 Modal
- Fixed overlay with `rgba(7, 11, 20, 0.85)` backdrop
- Centered panel: max-width 700px, max-height 85vh, flex column
- Header: Orbitron 18px title (left) + X close button (right), bottom border
- Body: scrollable, padding 24px
- Close on: X button, Escape key, backdrop click
- Shadow: `0 0 30px var(--cyan-glow)`
- **Client modal variant** (`.modal-client`): amber header title (`var(--amber)`) + amber glow box-shadow (`rgba(255,140,0,0.25)`) instead of cyan

### 6.9 ClientForm
- Fields stack vertically with 20px gap
- Labels: Orbitron 12px, cyan, uppercase, 1px letter-spacing
- Inputs: `--bg-elevated` background, `--border` border, Rajdhani 16px
- **Identity row**: single horizontal flex row: `[IconPicker] [ColorPicker] [Name input flex:1]`
  - Single "Identity" label (Orbitron 12px) spans above the row
- No projects/notes fields in the form — handled in Client Details page; onsave payload: name, icon, color, logo, description (only)
- Actions: Cancel (ghost) + Save (solid cyan, disabled when name empty)
- Imports `IconPicker` and `ColorPicker` sub-components

### 6.10 IconPicker
- Props: `value` (icon string), `onchange` callback
- Preview button: 44x42px, shows selected Lucide icon + `ChevronDown` arrow
- Click toggles absolute-positioned dropdown (202px wide, 5x3 icon grid + padding)
- Dropdown uses same icon grid as before (Building2, Store, Globe, UserCircle, Factory, Landmark, ShoppingBag, HeartHandshake, GraduationCap, Gamepad2, User, Briefcase, Building)
- Selected icon has `--cyan` border + background
- Click outside or select closes dropdown (window mousedown listener via `$effect`)
- `data-section="icon-picker"` on root, `data-label="icon-dropdown"` on dropdown

### 6.11 ColorPicker
- Props: `value` (color token string e.g. `'--cyan'`), `onchange` callback
- Preview swatch: 44x42px button filled with current color, triangle arrow indicator
- Click toggles absolute-positioned popover (196px wide) with 20 color circles (28px) in a 5x4 grid
- Colors imported from `$lib/shared/colors.js` — 20-color palette
- Selected color has white border ring
- Click outside or select closes popover (window mousedown listener via `$effect`)
- `data-section="color-picker"` on root, `data-label="color-popover"` on popover

### 6.12 ClientCard / Table View
- **Card**: border panel with icon + color dot + name + description + projects badge (uses `client.projectCount ?? 0` from subquery)
- **Table**: 3 columns (Name with icon/dot, Description, Projects), rows clickable → details page
- Toggle via `Table` / `LayoutGrid` icon buttons in toolbar
- Empty state: "No clients yet. Add your first client."

### 6.13 Client Details Page
- Back link → `ArrowLeft` + "Back to Clients"
- Header panel: icon box (56x56, colored border) + name (Orbitron 22px) + description (Rajdhani)
- Header actions: Edit (`Pencil`, cyan) + Delete (`Trash2`, danger)
- Tabs: Story so Far, Important Personnel, Meeting Notes, Files, Activity
- Tab content: placeholder text ("No X yet")
- Edit → opens Modal with same ClientForm, pre-filled
- Delete → opens Modal with DeleteConfirm, shows project/task counts

### 6.14 DynamicIcon
- Props: `name` (icon string), `size`, `color`
- Maps icon name to Lucide component via lookup object
- Fallback: `User` icon if name not found
- Used by ClientCard, client list table, client details header, icon picker

### 6.15 Modal (Client Modals)
- Background: `--modal-bg` (`#0e1624`) — deep navy
- Border: `--modal-border` (`#1f2a3a`) — subtle panel border
- Border-radius: `8px` (overrides global `--radius: 5px` for modals only)
- Box-shadow: `0 0 40px rgba(0, 200, 255, 0.15)` — subtle cyan outer glow
- **Client variant** (`.modal-client`): stronger glow `rgba(0, 200, 255, 0.2)`
- Close button: border `1px solid var(--modal-border)`, hover → cyan-to-blue gradient (`linear-gradient(135deg, var(--accent-cyan), #007bff)`) with white text
- Header title: Orbitron 18px, `var(--amber)`, uppercase, 1px letter-spacing
- Header border-bottom: `1px solid var(--modal-border)`

### 6.16 ClientForm Inputs (Modal)
- Background: `var(--modal-bg)` — input blends with modal background
- Border: `1px solid var(--modal-border)`
- Border-radius: `6px` (overrides global `--radius: 5px`)
- Text color: `var(--modal-text)` (`#e0e6ed`) — soft white
- Inner glow: `inset 0 0 8px rgba(0, 200, 255, 0.2)`
- Focus state: `border-color: var(--accent-cyan)` + outer ring `0 0 0 2px rgba(0, 200, 255, 0.15)`
- Placeholder: `var(--text-placeholder)` (`#7a8ca5`) — muted gray-blue
- Transitions: `all 0.2s ease-in-out`
- Save button: solid `var(--accent-cyan)` bg, hover → `linear-gradient(135deg, var(--accent-cyan), #007bff)`, white text

### 6.14 StoryTimeline

- 3-column CSS grid: `grid-template-columns: 88px 36px 1fr`
  - Column 1: `.timeline-date` — right-aligned, contains `.date-badge` span
  - Column 2: `.timeline-connector` — centered dot with horizontal cyan arms
  - Column 3: `.timeline-card` — entry card with `--bg-card` background
- Connector column has `left: -4px` offset with `::before` (left arm, `top: 26px`, `width: calc(50% - 9px)`) and `::after` (right arm, same top/width)
- Centered dot: `12px` circle, `--accent-cyan` fill, `margin-top: 20px`
- Vertical connecting line: `.timeline-entry::before` at `left: 101px`, `top: 32px`, `width: 2px`, `background: var(--modal-border)` — hidden on last child
- `.timeline-card`: `background: var(--bg-card)`, `border: 1px solid var(--modal-border)`, `border-radius: 6px`, `padding: 14px 16px`, `cursor: pointer`, `onclick` calls `onedit(entry)`
- `.entry-actions` div has `onclick: stopPropagation()` to prevent card click when clicking edit/delete
- `.date-badge`: colored border via inline `dateColors[i % 10]`, `border-radius: var(--radius)`, `padding: 3px 10px`, `line-height: 1`, `background: rgba(0,0,0,0.25)` — cycles 10 blue/cyan shades
- Meta badges: `.note-badge` (cyan), `.project-badge` (cyan) — `padding: 2px 8px`, `border-radius: var(--radius)`, `font-size: 12px`
- Icon buttons: `28x28px`, `border: 1px solid var(--text-dim)`, hover states per color
- `data-section="story-timeline"`, `data-item={entry.id}` on each entry

### 6.15 StoryEntryModal

- 2-column grid: `grid-template-columns: 1fr 2fr; gap: 24px` (left takes 1/3, body takes 2/3)
- Left column: Title+Save/Cancel row, Date picker, Project selector, Link Meeting Notes autocomplete, Links list, Action Items list
- Right column: Entry Body textarea (flex: 1, `min-height: 375px`)
- `.modal-wide` overrides: `max-width: 1440px; max-height: 95vh` (vs default modal `max-height: 85vh`)
- Action items section: input row + status toggle + status badge + remove button + "Add Action Item" button (dashed border, full width)
- Saves action_items payload with `keep_` prefix for existing items
- Reads `entry.action_items` from entry prop for edit mode
- Title row: inline Cancel + Save buttons right of title input
- Meeting note linking: autocomplete dropdown (search filter, appears on focus/input, click outside closes) + selected tag pills with remove buttons
- Link row: LinkIcon preview + URL input + Check/Remove/Add icon buttons
- Link button: dashed border style
- Field labels: Orbitron 12px, amber, uppercase, 1px letter-spacing
- All inputs: `--bg-surface` background, `--modal-border` border, `border-radius: 6px`, inset cyan glow

### 6.16 MeetingNotesCards

- Card grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px`
- `.note-card`: `background: var(--bg-card)`, `border: 1px solid var(--modal-border)`, `border-radius: 6px`, `padding: 14px 16px`, hover → `border-color: var(--accent-cyan)`, `cursor: pointer`, `onclick` opens edit
- `.card-actions` div has `onclick: stopPropagation()` to prevent card click when clicking edit/delete
- Card content order: Title → Notes preview (150 chars max, 4-line clamp) → Badges row
- Badges: `.card-badges` uses `display: grid; grid-template-columns: 1fr 1fr`; each `.badge` has `width: 100%; box-sizing: border-box; justify-content: center` to fill columns
- Badge styling: `.badge-date` (cyan outline: `1px solid var(--accent-cyan)`, `rgba(0,200,255,0.12)` background), `.badge-actions` (amber outline: `1px solid var(--amber)`, `rgba(245,158,11,0.12)` background, includes `CheckSquare` icon)
- Inline modal (not separate component): backdrop → modal wrapper → header (amber Orbitron title + X close button) → MeetingNoteModal body
- Delete modal: same inline pattern with DeleteConfirm
- Props: `meetingNotes`, `clientId`, `addTrigger`, `apiBase` (defaults to `"/operations/clients/" + clientId` for project-scoped override), `projects` (passed through to MeetingNoteModal)

### 6.17 MeetingNoteModal

- 2-column grid: `grid-template-columns: 1fr 1fr; gap: 16px`
- Left column: Title input, DatePicker, Project selector, Action Items list
- Right column: Notes textarea (`flex: 1; min-height: 220px`)
- Project selector: shown only when `projects.length > 1`; `projectId` state initialized from `meetingNote?.project_id`; included in save payload
- Props: `projects = []` (new), `meetingNote` (existing: `project_id`, `action_items`)
- Action items: list with input + status toggle button (Circle/Check icons) + status badge + remove button
- Status badges: `padding: 2px 8px`, `border-radius: var(--radius)`, `font-weight: 700`, amber background when "not-started", green background when "completed"
- `+ Add Action Item` button: dashed border, full width
- Save preserves existing action item IDs via `keep_` prefix sent to server

### 6.18 ContactsTable

- Table with `<colgroup>` percentage widths: 30% / 22% / 22% / 18% / 8%
- `<th>`: `background: var(--bg-card)`, Orbitron 12px, cyan, uppercase, `letter-spacing: 1px`, `padding: 12px 16px`
- `<td>`: `vertical-align: middle`, `padding: 12px 16px`, last row `border-bottom: none`
- `.cell-actions`: inner `<div class="cell-actions-inner">` with `display: flex; justify-content: flex-end` — prevents flex breaking `table-cell` model
- `.table-wrapper`: `border: 1px solid var(--modal-border); border-radius: var(--radius); overflow: hidden`
- Empty state: "No contacts added yet." centered text

### 6.19 ContactModal

- 4-field form: Name, Designation, Email, Phone (all text inputs)
- Same input styling as modal defaults (`--bg-surface`, `--modal-border`, `border-radius: 6px`, inset cyan glow)
- Cancel + Save footer buttons, Save disabled when Name empty

### 6.20 FilesTable

- Table with `<colgroup>` percentage widths: 32% / 12% / 40% / 16%
- File type column: re-derives icon via `getIconForUrl(f.link || '')` instead of using stored `f.file_type` (fixes stale icon names in DB)
- Link column: `.cell-link-inner` inner flex wrapper with truncated URL + ExternalLink icon
- `<th>`: `background: var(--bg-card)`, same styling as ContactsTable headers
- Inner flex wrappers: `.cell-link-inner` (flex, align center, gap 6px), `.cell-actions-inner` (flex, justify end, gap 4px)

### 6.21 FileModal

- 3 fields: File Name (text), File Type Icon (auto-detected preview, read-only), Link (URL)
- File type icon auto-detected from URL via `getIconForUrl()` — renders DynamicIcon preview + icon name label
- `.icon-preview-row`: flex row with icon preview box + icon name text, same styling as inputs
- When no URL match: shows `Link` fallback icon, `.icon-dim` class dims the preview
- `file_type` stored in DB as icon name string, rendered by DynamicIcon in table

### 6.22 ActivityLog

- Props: `activity` array — loaded from server, read-only
- Chronological list: `flex-direction: column`, items separated by `border-bottom: 1px solid var(--modal-border)`
- Each item: Clock icon (cyan) + action label (amber, Orbitron 11px, uppercase) + description (Rajdhani 15px) + timestamp (Rajdhani 13px, `--text-dim`)
- Action labels map: `create` → "Created", `update` → "Updated", `delete` → "Deleted"
- Timestamp format: `DD-MM-YYYY HH:mm`
- Empty state: "No activity recorded yet."

### 6.23 DeleteConfirm (Generic)

- Dynamic `title` prop replaces hardcoded "Delete Client" — accepts any string
- Shows `<strong>{client?.name}</strong>` in confirmation message
- `client` object may include optional `projectsCount` and `tasksCount` — count badges only render when defined (not `undefined`)
- Warning text on separate line via `<br>`: "This will permanently remove this item and all associated data."
- Actions: Cancel (ghost) + Delete (solid danger, calls `onconfirm?.(client.id)`)
- Layout: centered icon → title → message → optional counts → buttons
- Used for: clients, story entries, contacts, meeting notes, files

### 6.24 ClientTabs Tab Bar

- Props: `tabs` (array of `{id, label}`), `active` (string), `onchange` callback, `onadd` callback
- Tab buttons: Rajdhani 16px, uppercase, `padding: 12px 20px`, active state uses `--amber` background + amber bottom border
- "+" button: fixed width 160px, amber background, black text, positioned `margin-left: auto`
- "+" button hidden for "activity" tab (`active !== 'activity'`)
- Button labels per tab: `story-so-far` → "+ Entry", `personnel` → "+ Contact", `meeting-notes` → "+ Meeting Note", `files` → "+ File"
- `.add-btn` calls `onadd?.(active)` which triggers `addTrigger` counter in parent

### 6.25 `addTrigger` Counter Mechanism

- Parent (`client [id]/+page.svelte`) maintains a `let addTrigger = $state(0)` counter
- `onadd()` handler: increments `addTrigger++`, passes it as prop to child component
- Child component (ContactsTable, MeetingNotesCards, FilesTable):
  - Receives `addTrigger` prop (default `0`)
  - Stores `prevAddTrigger = $state(addTrigger)` — initialized from prop value (not `0`) to prevent false triggers on tab-switch re-mount
  - `$effect` watches `addTrigger > prevAddTrigger` — opens add modal, updates `prevAddTrigger`
- This ensures the "+" button in ClientTabs can open modals in deeply nested tab content components

### 6.26 LinkIcon

- Thin wrapper component: `$lib/components/operations/LinkIcon.svelte`
- Props: `url` (string), `size` (default 16), `color` (default `var(--accent-cyan)`)
- Internally calls `getIconForUrl(url)` from `$lib/links.js` and renders DynamicIcon

### 6.27 DatePicker

- Props: `value` (ISO date string `YYYY-MM-DD`), `onchange` callback
- Editable `<input>` for typing DD/MM/YYYY directly with auto-slash formatting (inserts `-` after DD and MM digits)
- ChevronDown toggle button to open/close the calendar popover
- Calendar popover extracted into `CalendarPopover.svelte` sub-component
- Popover flips above (`bottom: calc(100% + 6px)`) when insufficient space below viewport via `requestAnimationFrame` position detection in `$effect`
- Popover: `260px` wide, `--bg-surface` background, `--modal-border` border, `border-radius: 6px`
- Navigation: ChevronLeft / ChevronRight buttons + month/year title (Orbitron 14px, uppercase)
- Calendar grid: 7-column grid, day buttons (`aspect-ratio: 1`), hover → cyan border/background
- Today highlighted with amber border + amber text
- Selected day: solid `--accent-cyan` background, white text
- Click outside popover closes it (window mousedown listener via `$effect`)
- Enter key commits typed date; blur also commits (skipped if popover click is in progress)
- `data-section="date-picker"`, `data-label="calendar-popover"` on popover

### 6.28 ProjectForm

- Add/Edit form for projects
- Props: `project`, `clients`, `onsave`, `oncancel`, `hideClient`
- Fields: name (text), client (select, hidden when `hideClient`), status (select: Not Started/On Hold/In Progress/Completed), color (ColorPicker), description (textarea)
- Status select values: `not-started` → label "Not Started", `on-hold` → "On Hold", `in-progress` → "In Progress", `completed` → "Completed"
- Status labels map to colors: `not-started`→`--text-dim`, `on-hold`→`--amber`, `in-progress`→`--accent-cyan`, `completed`→`--success`
- Same input/label styling as ClientForm

### 6.29 ProjectCard

- Card for project list grid view
- Props: `project`, `onedit`, `ondelete` (callbacks)
- Shows: DynamicIcon (FolderKanban, color from `project.color`), name (flex: 1), description, client name badge, status badge (colored background), task count
- Edit (`Pencil`) + Delete (`Trash2`) icon buttons in `.card-actions` div (right of title, `flex-shrink: 0`)
- `.card-actions`: `role="presentation"`, `onclick` calls `stopPropagation()` to prevent card `<a>` navigation
- Card grid: same `repeat(auto-fill, minmax(320px, 1fr))` pattern as ClientCard
- Status badge styling: `.status-pill` with colored background matching status (via inline `style="background: <color>22; border-color: <color>; color: <color>"`)
- `data-section="project-card"` on root

### 6.30 Project Detail Page Tabs

- Reuses the `ClientTabs` pattern but rendered inline (not via the component)
- Tab bar: Story So Far, Meeting Notes, Tasks, Activity (same amber-active styling as ClientTabs)
- Tab content areas wrapped in Panel components
- Header section: project name (Orbitron 22px), description, status badge (status-pill), client link (back to client)
- Header actions: Edit (Pencil, cyan) + Delete (Trash2, danger)
- `data-section="project-details"` on container

### 6.31 Project Status Badges

- `.status-badge` / `.status-pill`: inline pill with `padding: 2px 10px`, `border-radius: var(--radius)`, `font-size: 12px`, `font-weight: 600`
- Color maps: `not-started`→`--text-dim` (gray), `on-hold`→`--amber` (orange), `in-progress`→`--accent-cyan` (cyan), `completed`→`--success` (green)
- Each status gets a colored background at 12% opacity (e.g. `rgba(0, 212, 255, 0.12)` for in-progress) + colored border + colored text

### 6.32 Task Status Badges

- Same pill style as project status badges
- 6 statuses: `not-started`→`--text-dim`, `on-hold`→`--amber`, `in-progress`→`--accent-cyan`, `internal-review`→`--purple`, `external-review`→`--blue`, `completed`→`--success`
- Task status badges are plain background (no solid bg), using colored text only

### 6.33 TaskForm

- Add/Edit form for tasks in a 2-column grid
- Props: `task`, `clients` (with nested `projects` arrays), `onsave`, `oncancel`, `mode` (`'task'` or `'subtask'`), `subTasks`, `onAddSubTask`, `onEditSubTask`, `onDeleteSubTask`, `onbreadcrumb`
- Grid: `grid-template-columns: 1fr 2fr` (left col: fields, right col: description textarea)
- Left column fields: Title+Cancel/Save row, Client select, Project select (cascade — filters by selected client), Status select (6 options), Start Date + Due Date (DatePicker in a row), Sub-Tasks list (only in `mode='task'`)
- Client select cascades to project select: when client changes, project list filters; if selected project doesn't belong to new client, resets to null (`$effect` watcher)
- Status options: Not Started, On Hold, In Progress, Internal Review, External Review, Completed
- Sub-Tasks section (mode='task' only): list of child tasks with edit/delete buttons + dashed "+ Add Sub-Task" button — opens a new modal level, not inline editing
- `mode='subtask'` changes field labels to "Sub-Task Title", placeholder text to "sub-task details"
- `onbreadcrumb` fires current title value reactively via `$effect` for parent breadcrumb updates
- Description textarea: right column, `min-height: 300px`
- Same input/label styling as ClientForm

### 6.34 TasksTable

- Full-width table with `<colgroup>` column widths: 4% / 20% / 12% / 14% / 14% / 10% / 10% / 10% / 6%
- Columns: Checkbox (multi-select) | Task Name (clickable link to `/operations/tasks/{id}`) | Status | Client | Project | Start Date | Due Date | Phase | Actions (Edit/Delete)
- Props: `tasks`, `onedit`, `ondelete`, `onbulkdelete`
- Phase column: computed from `due_date` — Overdue (red, `--danger`), Today (amber, `--amber`), Upcoming (cyan, `--accent-cyan`), empty string (no badge) if no due date
- Multi-select: `selectAll` checkbox + per-row checkboxes; when any selected, a `.multi-toolbar` appears showing count + "Delete Selected" button
- .multi-toolbar: cyan border, rgba background, "Delete Selected" in danger color
- Cell values: formatted dates (DD-MM-YYYY via formatDate helper), status pills, client/project names from JOIN
- Actions column: `role="presentation"` + `stopPropagation` wrapper, 28px Pencil + Trash2 buttons
- `data-section="tasks-table"` on wrapper

### 6.35 StatusDashboard

- Horizontal status overview: `display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px`
- Props: `counts` object with keys for all 6 statuses
- 6 blocks, each showing count (Orbitron 28px, colored by status) + label (Rajdhani 12px, uppercase)
- Colors: Not Started→`--text-dim`, On Hold→`--amber`, In Progress→`--accent-cyan`, Internal Review→`--purple`, External Review→`--blue`, Completed→`--success`
- Each block: `background: var(--bg-card)`, `border: 1px solid var(--block-color)` via inline CSS var
- `data-section="status-dashboard"` on root

### 6.36 ModalBreadcrumbs

- Component: `src/lib/components/operations/ModalBreadcrumbs.svelte`
- Renders a horizontal row of badges with `ChevronRight` separators between them
- **Props**: `crumbs` (array of `{ label, value?, placeholder? }`), `onback`, `onforward`, `hasPrev`, `hasNext`
- Each badge:
  - If `value` is non-empty: solid badge with cyan border and text
  - If `value` is empty/null: dashed grey border with `placeholder` text in italic
- Navigation arrows (← / →) at edges of breadcrumb row, visible when `hasPrev`/`hasNext` are true
- Arrows call `onback`/`onforward` callbacks
- Used in modal headers to show the drill-down path: `[entry title] ▸ [task title] ▸ [sub-task title]`
- `data-section="modal-breadcrumbs"` on root element

### 6.37 Task & Sub-Task Architecture

Sub-tasks are stored as rows in the `tasks` table with a `parent_task_id` self-referential foreign key. No inline action_items are used for sub-tasks.

**Server (`tasks.js`):**
- `getByParent(parentId)` returns tasks where `parent_task_id = ?`
- `parent_task_id` column on `tasks` table links sub-tasks to their parent
- `getById` attaches `sub_tasks` via `getByParent`
- The `getAll`, `getByProject`, `getByClient` queries filter `WHERE parent_task_id IS NULL` to return only top-level tasks

**TaskForm:**
- `mode` prop: `'task'` (default) or `'subtask'` — controls field labels ("Sub-Task Title", "sub-task details")
- `subTasks` prop: array of child tasks to display in a list
- `onAddSubTask`, `onEditSubTask`, `onDeleteSubTask` callbacks for sub-task management
- `onbreadcrumb` callback fires the current title value for dynamic breadcrumb updates
- No inline sub-task editing — sub-tasks are created/edited in a separate modal level

**Modal State Machine:**
Parent pages manage a `modalLevel` state: `'entry'` / `'meeting-note'` → `'task'` → `'subtask'`
- Each level switches the modal body content
- Breadcrumb computed reactively from `modalLevel` + title values
- Navigation arrows: ← goes up one level (subtask→task→entry), → goes down to first sub-task

### 6.38 TaskNotesEditor

- Props: `taskId`, `notes` (initial value), `onupdate` (callback after save)
- Full-height textarea (`min-height: 300px`) with same modal input styling (inset cyan glow)
- "Save Notes" button (solid cyan, right-aligned)
- Saves via PUT to `/operations/tasks/{taskId}/notes`
- `data-section="task-notes-editor"` on root

### 6.39 Section Box (Bounding Box)

Used to group related items (Tasks, Links, Sub-Tasks) inside forms with a centered header.

- **Container class**: `.section-box`
- **Variant classes**: `.box-tasks`, `.box-links`, `.box-subtasks`
- **Header class**: `.box-label`
- **Spec**:
  - Border: `1px solid var(--border-glow)`
  - Border-radius: `var(--radius)`
  - Padding: 12px
  - Display: `flex; flex-direction: column; gap: 8px`
  - Header: Orbitron 12px, amber, uppercase, `text-align: center`, `border-bottom: 1px solid var(--border-glow)`
- **Background colors**:
  - `.box-tasks` — purple tint: `rgba(168, 85, 247, 0.06)`
  - `.box-links` — amber tint: `rgba(255, 140, 0, 0.06)`
  - `.box-subtasks` — cyan tint: `rgba(0, 212, 255, 0.06)`
- Used in: `StoryEntryModal.svelte` (Links, Tasks), `TaskForm.svelte` (Sub-Tasks), `MeetingNoteModal.svelte` (Tasks)

### 6.40 Time Tracking

**Page**: `/operations/time-tracking`

**Layout**: Toolbar bar on top, 2-column grid below (Timeline | Table). The entire page is constrained to viewport — only internal areas scroll.

**Toolbar**: 
- `<` `>` day navigation buttons (ChevronLeft / ChevronRight, 18px)
- Date display (Orbitron 16px, centered, DD-MM-YYYY)
- "Now" button (Rajdhani 14px, jumps to today + centers timeline)
- Density toggle: single icon button cycling Narrow (Minimize2) → Normal (Equal) → Tall (Maximize2) — persisted via `sessionStorage`
- "All Entries" button → opens full-screen modal with filters
- "+ Time Entry" button → opens TimeEntryModal

**Timeline** (`TimeTrackingTimeline.svelte`):
- Virtual day-scrolling: renders 3 days (yesterday, today, tomorrow) initially, adds/removes days dynamically as user scrolls
- Each day block contains 24 hour rows
- Hour labels are pill badges (`[09:00]`) — Rajdhani 12px, `--bg-elevated` background, `--border` outline
- A thin `.hour-line` (1px, `--border`) extends from each badge across the row width
- Day badges: centered floating pill on the 00:00 line — `Monday | 01-06-2026`. Orbitron day name + Rajdhani date, `--accent-cyan` border
- Red `.now-line` (2px, `--danger`): positioned at the exact current-minute within the today day block, scrolls with content
- Red `.now-badge`: centered on the red line, shows current time, `--danger` background, white text, Clock icon
- Entry chips: colored blocks at the entry's start hour with task/project/client tags stacked vertically
- Native `overflow-y: auto` scrollbar
- Auto-recenter: 60s after last scroll → snaps to current time position
- Density: Narrow (40px/h), Normal (60px/h), Tall (80px/h)

**Time Entries Table**:
- Columns: Title | Start | End | Duration | Task | Project | Client | Actions (Edit/Delete)
- Badge colors: `--purple` (task), `--accent-cyan` (project), `--amber` (client)
- Alternating rows: `--bg-surface` / `--bg-card`

**TimeEntryModal**:
- 2-column form (1fr 1.5fr): fields left, description right
- Fields: Title, Start Time, End Time, Total (auto-computed), Date (DatePicker), Task (autocomplete search), Client (select), Project (select filtered by client)
- When a task is linked, Client/Project auto-fill and are greyed out (disabled)
- Time inputs: auto-format "0100" → "01:00" via `onblur` handler
- Header: PlusCircle (new) / Pencil (edit) icon + title

**AllEntriesModal**:
- 90% viewport modal: max-width 90vw, max-height 90vh
- Filter tabs: Day / Week / Month / Range
- Filter selects: Client, Project
- Full table with Edit/Delete row actions (opens TimeEntryModal on edit)

### 6.37 Task Detail Page

- Route: `/operations/tasks/[id]`
- Layout: Back link → Task header → Tab bar → Tab content
- Header: title (Orbitron 22px), description, status badge, client link, project link, start/due dates, source info ("Created from Entry / Meeting Note (ID: #)") when `source_type`/`source_id` populated
- Header actions: Edit (Pencil, cyan) + Delete (Trash2, danger) buttons
- 2 tabs: Notes (active by default), Time Entries
- Notes tab: renders TaskNotesEditor component
- Time Entries tab: renders placeholder or time entries component

### 6.41 SummaryCards (SitRep)

**Component**: `src/lib/components/treasury/SummaryCards.svelte`

**Page**: `/treasury/situation-report`

**Layout**: 6 cards in a single horizontal grid row.

**Card spec**:
- Grid: `grid-template-columns: repeat(6, 1fr); gap: 8px`
- Background: `--bg-card`, radius: `var(--radius)`
- Border: `1px solid var(--border)`, plus `border-top: 3px solid var(--card-accent)` — green (`--success`) for 'up' trend, red (`--danger`) for 'down' trend, default for 'flat'
- Padding: 10px, content centered vertically
- Inner gap: 4px between icon / value / label
- Value font: Orbitron 16px 700, label font: Rajdhani 12px uppercase

**Trend watermark**:
- `TrendingUp` / `TrendingDown` Lucide icon (64px) positioned `absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- Opacity: `0.06`, pointer-events: none
- Color: `--success` for up, `--danger` for down
- Sits behind card content (z-index: 0), content has `z-index: 1`

**Trend data**:
- Server computes month-over-month comparison (latest month with data vs previous month)
- 6 trend values returned: `income`, `expense`, `netFlow`, `available`, `liabilities`, `topCategory`
- Each is `'up' | 'down' | 'flat'` based on >5% change threshold
- Available uses net flow sign as proxy
- Liabilities inverts the spending trend (more debt payments = liabilities decreasing = good)

**Cards (in order)**:
1. Income — `ArrowUpFromLine`, `--success`
2. Expenses — `ArrowDownFromLine`, `--danger`
3. Net Flow — `ArrowLeftRight`, `--cyan` (positive) / `--danger` (negative)
4. Available — `DollarSign`, `--blue`
5. Liabilities — `Ban`, `--amber`
6. Top Category — `Trophy`, `--purple` (shows category name, not a number)

### 6.43 AccountBalances Card Grid

**Component**: `src/lib/components/treasury/AccountBalances.svelte`

**Layout**: 3-column card grid inside SitRep's mid-row panel.

**Card spec**:
- Grid: `grid-template-columns: repeat(4, 1fr); gap: 8px`
- Same card spec as SummaryCards: icon, name, value, border colored by balance sign
- Border: `1px solid var(--border)`, plus `border-top: 3px solid var(--card-accent)` — green (`--success`) for positive balance, red (`--danger`) for negative balance
- Shows accounts (bank, cash, loans) + people combined
- Negative balances use `--danger` color

### 6.44 SitRep Page Layout

**Route**: `/treasury/situation-report`

**Layout (top-to-bottom)**:
1. **Financial Summary** panel — 6 cards in a single row (SummaryCards)
2. **Mid row** — `grid-template-columns: 3fr 2fr` (60-40 split):
   - Left: Account Balances panel (green-tinted background)
   - Right: Spending by Category panel (amber-tinted background)
3. **Recent Transactions** panel — full-width mini table (red-tinted background)

**Containment**: `.sitrep` uses `overflow-y: auto` to stay within viewport bounds (between treasury-nav and nav-bar). Gap: 8px between panels.

**Panel variant backgrounds**: All four panels use the same blue scheme. Default Panel variables:
- Header: `--panel-header-bg` defaults to `#0b1a30` (dark blue)
- Content: `--panel-content-bg` defaults to `--bg-panel` (`#14284a`, lighter blue)

Pass `class` prop to override, e.g. `.panel-accounts` sets `--panel-header-bg` and `--panel-content-bg` for different tints.

### 6.45 Reports Page Layout

**Route**: `/treasury/reports`

**Layout**: Vertical stack of full-width Panel cards (no grid). Each card wraps a chart component. Full page scrolls via `overflow-y: auto`. Gap: 8px.

Order:
1. **Monthly Trends** — full-width line chart with Week/Month/Year toggle
2. **Net Worth Trajectory** — full-width assets/liabilities/net-worth chart
3. **EDI Insights** — full-width placeholder panel for AI-driven insights

### 6.46 MonthlyTrends

**Component**: `src/lib/components/treasury/MonthlyTrends.svelte`

- Props: `data` (object with `{weekly, monthly, yearly}` properties, each an array of `{period, income, expense, net}`)
- Period toggle: 3 buttons (Week / Month / Year) in the header row, right-aligned
- SVG line chart: 3 lines — income (solid green, `var(--success)`), expense (solid red, `var(--danger)`), net (dashed cyan, `var(--cyan)`)
- Data points shown as filled circles on each line
- Y-axis: auto-scaled to max value, 5 grid lines with `₹` formatted labels
- X-axis: period labels vary by toggle — weekly (`W22 '26`), monthly (`Jan '26`), yearly (`2026`)
- Chart dimensions: viewBox `0 0 1000 260`, responsive via `width: 100%; height: auto`
- Legend left, period toggle right in the header row
- `data-section="monthly-trends"` on root

### 6.51 NetWorthTrajectory

**Component**: `src/lib/components/treasury/NetWorthTrajectory.svelte`

- Props: `data` (array of `{ym, assets, liabilities, netWorth}`)
- Dual visualization: green bars (assets) + red bars (liabilities, drawn downward from 0) + cyan line with dots (net worth)
- Liabilities shown as positive values (absolute) drawn below the axis
- Net worth line: `<path>` with `fill="none"` + cyan `stroke-width="2.5"`, dots at each data point as `<circle r="4">`
- Y-axis handles negative values via `minVal`/`range` computation
- Legend: Assets (green dot), Liabilities (red dot), Net Worth (cyan dot)
- Empty state: "No data available"
- `data-section="net-worth-trajectory"` on root

### 6.52 Insights Section (within Reports)

**Route**: `/treasury/reports` (embedded in reports page)

**Component**: Inline in `src/routes/treasury/reports/+page.svelte`

- Placeholder section for future EDI AI-driven financial insights
- Centered `Sparkles` icon + message: "Insights feed coming online, Mav."
- Status panel with pulsing dot: "Neural analysis matrix — offline. Awaiting deployment."
- `data-section="insights-section"` on root

### 6.53 Import Wizard Save & Resume

**Component**: `src/lib/components/treasury/ImportWizard.svelte`

**Save Button (`.btn-save`)**:
- Positioned in the `.wizard-title-row` next to the page title
- Small button: `padding: 4px 12px; font-size: 13px`, cyan border (`--cyan-dim`), cyan text
- After first auto-save: shows green `.save-dot` (6px circle, `--success` background) with "Saved" label
- Auto-saves 500ms after each step change (debounced) via `$effect`
- Not visible on step 0 (upload) or step 7 (result)

**Resume Banner (`.resume-banner`)**:
- Appears on mount when saved state exists in localStorage
- Centered row: message text + "Resume Import" (primary) + "Start Fresh" (ghost) buttons
- Background: `rgba(0,212,255,0.06)` with `1px solid var(--cyan-dim)` border
- Font: Rajdhani 15px

**State Persistence**:
- `localStorage` key: `lazarus-import-wizard`
- Saved fields: `parsedRows`, `step`, `checked`, `duplicatesFound`, `mergeActions`, `checkTab`, `baseSourceFile`, `isMultiFile`, `filename`, `useDebitCredit`, `detectedHeaders`, `titleCleanupMap`, `entityMap`, `catMapConfig`, `importRules`
- Auto-saves on step change (debounced 500ms)
- Cleared on successful import, "Import Another" button, or "Start Fresh" from restore banner
- Restore via `restoreState()` — assigns all saved fields back to `$state` vars
- Resume banner shows timestamp of saved state (date + time)

### 6.54 Reconciliation Table (New Design)

The reconciliation step uses a paginated one-transaction-at-a-time view with navigation via `< Prev | X/Y | Next >` buttons in the wizard title row.

**Layout (top-to-bottom within reconcile step)**:
1. **Summary bar** — centered `◄ X/Y ►` Chevron nav + right-aligned pending/confirmed/flagged/deleted counts
2. **PreviewRow** — table-format single row showing final merged transaction (read-only), with Confirm/Flag/Delete action buttons in the header and a "Ready"/"Incomplete" status badge
3. **ReconcileTable** — main 8-column table with 4 rows: BASE (inline-editable with date/title/amount inputs, type/category/paid_by dropdowns, split chips) + 3 supporting rows (cell-level tickboxes via ReconcileCell)
4. **ReconcileConfirmedTable** — all confirmed entries below with Restore/Delete
5. **Footer** — Skip (ghost) + Continue (primary) buttons, disabled until all pending items resolved

**Navigation**: `◄` / `►` Chevron buttons with `X / Y` counter sit in the summary bar center. Disabled on first/last. Parent (`ImportWizard.svelte`) manages `reconcileCurrentIndex` and `reconcileTotal`. Clamped automatically when groups change via delete.

**Inline-editable base row**: The BASE row in the reconciliation table matches the TransactionsTable inline editor:
- Date: `<input type="date">`
- Title: `<input type="text">`
- Amount: `<input type="number" step="0.01">`
- Type: `<select>` with Income/Expense/Transfer options
- Category: `<select>` from loaded categories
- Paid By: `<select>` from loaded accounts + people
- Split: 4 chip toggle buttons (Me/Family/Sister/Wife), disabled for non-expense types
- Editing the base row immediately re-evaluates auto-select for supporting cells

**Removed**:
- ReconcileActionsList component (actions moved to PreviewRow header)
- Confirm All Matched / Confirm All buttons

**ReconcileTable columns** (9 total):
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Source | 7% | Badge: BASE (green) / GPay / Notion / Sheet (blue) |
| 2 | Date | 10% | Cell-level tickbox on supporting rows |
| 3 | Title | 17% | Cell-level tickbox, left-aligned |
| 4 | Amount | 10% | Cell-level tickbox, bold weight |
| 5 | Type | 8% | Cell-level tickbox, colored by type |
| 6 | Category | 12% | Cell-level tickbox |
| 7 | Paid By | 12% | Cell-level tickbox |
| 8 | Split | 10% | Cell-level tickbox; GPay Split always greyed out |
| 9 | Actions | 14% | Action buttons (placed in ReconcileActionsList below) |

**Row structure per group** (4 rows):
- **Row 1 (BASE)**: green-tinted bg (`rgba(34,197,94,0.04)`), read-only values (no tickboxes)
- **Row 2 (GPay)**: cell-level tickboxes via `ReconcileCell.svelte`
- **Row 3 (Notion)**: cell-level tickboxes
- **Row 4 (Sheet)**: cell-level tickboxes

**Cell behavior**:
- Greyed cells (`opacity: 0.2`): no data in source, no checkbox
- Ticked cells: cyan highlight (`--cyan` at 10% opacity + `1px` border)
- Auto-selected cells: green tint (`rgba(34,197,94,0.06)`) — when supporting value matches base
- Font: Rajdhani 14px throughout
- Clicking a non-greyed cell toggles its selection state

**ReconcileCell.svelte** (standalone tickbox cell):
- Props: `value`, `field`, `greyed`, `ticked`, `onToggle`
- Shows `CheckCircle2` (15px) when ticked, `Circle` when unticked
- Empty/greyed cells show a spacer (no icon)
- Amount values formatted as `₹X,XXX.XX`, date values as `DD-MM-YYYY`
- Split values display first-letter initials (e.g. "M" for Me, "WF" for Me,Wife,Family)

**Auto-select logic**: When a supporting source value matches the base row value (case-insensitive trimmed comparison), the cell is auto-ticked on mount. User can override by clicking.

**Bulk actions**:
- "Confirm All Matched": confirms groups where all sources with data have at least amount or date ticked
- "Confirm All": confirms all remaining pending groups
- "Save Progress": saves selections, confirmed/deleted/flagged state to localStorage

**ReconcileActionsList.svelte** (per-group action buttons):
- 3 buttons per row: Confirm (green CircleCheck), Flag (amber Flag, toggles), Delete (red Trash2)
- Shows summary: title, date, amount, supporting source count
- Flagged rows get amber background tint

**ReconcileConfirmedTable.svelte** (below main table):
- Shows confirmed entries as single merged rows
- Columns: Date, Title, Amount, Type, Category, Paid By, Split, Actions
- Actions: Restore (cyan RotateCcw) — pulls back to pending, Delete (red Trash2) — permanently removes
- Empty state: "No confirmed entries yet."

**ReconcilePreviewRow.svelte** (above main table):
- Shows final merged transaction preview (based on current cell selections)
- Fields: Date, Title, Amount, Type, Category, Paid By, Split
- Green "Ready" badge if all mandatory fields resolved, amber "Incomplete" otherwise
- Updates reactively as tickboxes change

**Save/Resume**:
- Auto-saves to localStorage (`lazarus-reconcile-state`) 2s after last change
- Saved state: selections, confirmedEntries, deletedIds, flaggedIds
- Parent ImportWizard stores `reconcileState` in its save blob and passes it back on resume

**Components**: `ReconcileStep.svelte` (orchestrator), `ReconcileTable.svelte`, `ReconcileCell.svelte`, `ReconcileActionsList.svelte`, `ReconcileConfirmedTable.svelte`, `ReconcilePreviewRow.svelte`

### 6.55 Blank Row Filter

**Location**: `src/lib/components/treasury/ImportWizard.svelte` — `finishBatch()` function

- All rows with empty/whitespace-only titles are removed from `allParsedTemp` before creating `parsedRows`
- Filter: `allParsedTemp = allParsedTemp.filter(r => r.title && r.title.trim())`
- Applied to both CSV and PDF rows (all rows converge through `allParsedTemp`)

---

### 6.56 Academy (Phase 2)

**Route**: `/academy`

**Layout**: Areas list (`/academy`) → All Courses (`/academy/courses`) → All Notes (`/academy/notes`) → Area detail (`[id]`) → Course detail (`[id]/course/[courseId]`). AcademyNav (3 tabs: Areas / Courses / Notes) appears in main layout when route starts with `/academy`. Each tab links to its aggregate view: `/academy`, `/academy/courses`, `/academy/notes`. Active tab is determined by URL depth: `/academy`→Areas, any other `/academy/*` depth-2 path→Courses, course detail paths→Notes.

**Components** (all under `src/lib/components/academy/`):
| Component | Description |
|-----------|-------------|
| `AcademyNav.svelte` | 3-tab static sub-nav (Areas / Courses / Notes) linking to `/academy`, `/academy/courses`, `/academy/notes` with route-depth active states |
| `AreaCard.svelte` | Card for areas grid: 16:9 cover, icon watermark, priority badge, course/note counts, hover-reveal edit/delete, density variants |
| `AreaForm.svelte` | Add/Edit form: name, cover_url, description, icon, color, priority |
| `CourseCard.svelte` | Card for courses: 4:3 cover image, status pill, started date, hover-reveal edit/delete on cover, density variants |
| `CourseForm.svelte` | Add/Edit form: area, name, description, status, started_on, completed_on, course_url, cover_image |
| `NoteCard.svelte` | Note list item with title, optional areaName/courseName context badges, edit/delete, density variants |
| `NoteForm.svelte` | Simplified Add/Edit form: just title input |

**Area list page** (`/academy`): Card grid (`repeat(auto-fill, minmax(280px, 1fr))`), add/edit/delete modals. Uses `notify()` on CRUD.

**Area detail page** (`/academy/[id]`): Back link, area header (icon 56px + name Orbitron 22px + description + edit/delete actions), Courses Panel (list of CourseCards with add/delete), Notes Panel (list of NoteCards, read-only at this level).

**Course detail page** (`/academy/[id]/course/[courseId]`): Back link to area, course header (name Orbitron 22px + description + status pill + edit/delete), Notes Panel with add/edit/delete modals.

**Data attributes**: `data-section="academy-areas"` on list, `data-section="area-detail"`, `data-section="course-detail"`.

**Form pattern**: All form components use the same `.form-fields` / `.field-label` / `.field-input` / `.form-actions` / `.btn-ghost` / `.btn-primary` CSS classes (identical styling to Operations forms).

**API structure**: Same RESTful pattern as Operations — list endpoint (`+server.js`) for GET/POST, detail endpoint (`[id]/+server.js`) for GET/PUT/DELETE. Course detail at `[id]/course/[courseId]/+server.js`. Notes CRUD via POST with `{action: 'update-note' | 'delete-note'}`.

### 6.57 FilteredTransactionView (Entity Detail Pages)

**Component**: `src/lib/components/treasury/FilteredTransactionView.svelte`

**Route**: `/treasury/accounts/[id]`, `/treasury/people/[id]`, `/treasury/categories/[id]`

**Props**: `filterType` (`'entity'` or `'category'`), `filterValue` (entity name or category ID), `initialTransactions`, `accounts`, `people`, `categories`

A reusable full transaction management interface that pre-filters by entity (paid_by OR paid_to) or category. Used on entity detail pages to show all transactions for a specific account, person, or category.

**Features**:
- Date range navigation: All Time / Day / Week / Month / Year with prev/next, jump-to-today
- Custom date range picker (visible when not in "All Time" mode)
- Add Transaction button + TransactionModal
- TransactionsTable with inline editing and multi-select
- Bulk delete and bulk rename actions
- Search overlay with debounced title search
- All CRUD modals (add, delete, bulk delete, bulk rename)

**Date range**: Defaults to "All Time" mode (rangeMode='all') — no date filter applied. Switching to a date range mode shows the standard navigation controls.

**Scrolling**: Root div has `.ftv-container { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }` to complete the flex chain from `main.content` through to `TransactionsTable.table-wrap`.

**Entity header**: Each entity detail page renders its own header (icon + name only, no badges) above the FilteredTransactionView. Headers are not part of the shared component. Right-side layout spec:

**People** (`/treasury/people/[id]`):
- `balance = paidByAmount - paidBackDirect - paidBackSplit`
- Right side: `[TrendingUp/Down] ₹Balance` in a `.balance-top` row, then 3 breakdown items:
  - `Paid by:` (paidByAmount — total entity gave that benefits Me)
  - `Paid back:` (paidBackDirect — direct cash repayments to entity)
  - `Via split:` (paidBackSplit — entity's share of My-paid shared expenses)

**Accounts** (`/treasury/accounts/[id]`):
- Right side: `[TrendingUp/Down] ₹Balance` in `.balance-top`, then 2 items:
  - `Income:` (money credited)
  - `Expense:` (money debited)

**Categories** (`/treasury/categories/[id]`):
- Right side: `₹TotalSpent` in `.balance-top`, then 2 items:
  - `Total spent:` (sum of initialTransactions amounts)
  - `Budget:` (if set)

**People Server Computation** (`people.js` `computeBalance()`):
- `paidByAmount`: SUM of all transactions WHERE paid_by=entity, with shared expenses split-prorated — direct payments count in full, shared expenses (paid_for has multiple including 'Me') count only the entity's split portion
- `paidBackDirect`: SUM WHERE paid_to=entity AND paid_by≠entity (cash received by entity)
- `paidBackSplit`: SUM of entity's split portions WHERE type='expense' AND paid_for includes both entity and 'Me' AND paid_by NOT in family persons (shared expenses I paid where entity benefited)
- `balance = paidByAmount - paidBackDirect - paidBackSplit`

**CSS classes**:
- `.balance-top`: `display: flex; align-items: center; gap: 8px; justify-content: flex-end;`
- `.balance-value`: Orbitron 24px 700, `--cyan` (`.negative` → `--danger`)
- `.balance-breakdown`: flex column, gap 2px, margin-top 6px, Rajdhani 14px, `--text-dim`
- `.bd-label`: `--text-muted` color
- `.bd-item`: `white-space: nowrap; display: flex; gap: 4px; justify-content: flex-end;`

**Routes created**:
- `/treasury/accounts/[id]` + `+page.server.js`, `+server.js` — loads account + filtered transactions
- `/treasury/people/[id]` + `+page.server.js`, `+server.js` — loads person + filtered transactions
- `/treasury/categories/[id]` + `+page.server.js`, `+server.js` — loads category + filtered transactions

### 6.58 Clickable Entity Cards

Entity list cards (accounts, people, categories) and balance strip cards now link to entity detail pages:

**List pages**: Card `<div>` elements changed to `<a>` tags linking to `/treasury/accounts/{a.id}`, `/treasury/people/{p.id}`, `/treasury/categories/{c.id}`. CSS updated with `text-decoration: none; color: inherit;`. Card action buttons have `stopPropagation()` to prevent navigation when clicking edit/delete.

**Balance strip** (`AccountBalances.svelte`): Cards changed to `<a>` tags with `detailHref()` helper routing to either `/treasury/accounts/${item.id}` or `/treasury/people/${item.id}` based on `item.kind`. Hover state added: `.balance-card:hover { border-color: var(--cyan-dim); }`.

### 6.59 Entity Filter API

**Backend** (`transactions.js`): `getFiltered()` accepts an `entity` param that filters by `(paid_by = @entity OR paid_to = @entity)`.

**API** (`transactions/+server.js`): GET endpoint accepts `entity` and `category_id` params. `hasFilter` check includes `entity` param.

**Server load functions**: Entity detail `+page.server.js` files call `getFiltered({ entity: account.name })` or `getFiltered({ category_id: params.id })` with no date range for all-time view.

### 6.60 Transcription Engine (Settings)

**Route**: `/settings/engine`

**Server module**: `src/lib/server/transcribe.js`
- Exports `transcribeAudio(audioBuffer, ext)` → pipes audio through FFmpeg (16kHz mono WAV) → base64 → Ollama `/api/chat` with `gemma4:e4b` via `images` array → returns transcribed text
- Temporary files cleaned up in `finally` block

**POST endpoint** (`+server.js`): Accepts `multipart/form-data` with `audio` field (File), validates format/ext/size, transcodes via FFmpeg to 16kHz mono WAV, sends to whisper.cpp `/inference`, returns SSE stream with `token`, `log`, `progress`, `done`, `error` event types. Progress events carry `{ stage: 'upload'|'process'|'transcribe', percent: 0-100, label: string }` for granular client-side progress tracking.

**Page** (`+page.svelte`):
- **Upload dropzone**: dashed border, drag-and-drop + click-to-browse, accepts `.mp3/.wav/.ogg/.m4a/.webm`, max 50MB
- **Progress state**: when file is submitted, dropzone is replaced by `TranscriptionProgress` component showing 4 stages with progress bars
- **Error state**: red-bordered error box with message
- **Output state**: Orbitron "Transcription" title, Copy button, transcript text in pre-wrap card (streams live as tokens arrive), "Transcribe Another" ghost button
- **Empty state**: "Upload an audio file above to begin transcription."

### 6.61 EngineSettingsModal Component (replaces EngineResourcePanel)

**Component**: `src/lib/components/settings/EngineSettingsModal.svelte`

**Route**: Inside a wide Modal on `/settings/engine`, opened by gear icon in toolbar.

**Props**: `config`, `systemInfo`, `modelsList`, `downloadStatus`, `serverRunning`, `connected`, `saveSuccessMessage`, `onconfigchange`, `onstart`, `onstop`, `onrestart`, `onsave`, `ondownload`, `onmodeldelete`

**Layout**: Profile bar → 2-column grid (settings) → System info row. All inside a `.modal-body-inner` flex column.

**Profile selector** (`.profile-bar`):
- 3 equal flex buttons (Low / Medium / High)
- Each button: Orbitron 14px label + Rajdhani 12px description
- Active profile: cyan border + background tint + box-shadow glow
- Click calls `selectProfile(name)` which auto-fills all config params and auto-selects the recommended model
- Deviance detection: `$derived` compares current config values against all profile presets; if no match, all buttons deselect

**2-column grid** (`.settings-grid`): `grid-template-columns: 1fr 1fr; gap: 12px`
- **Left column**: Compute Resources (threads, processors, GPU toggle, flash attn) + Accuracy & Speed (bestOf, beamSize) + Audio Processing (chunk, VAD)
- **Right column**: Server Control (binary path, model select, port, status pill, Start/Stop/Restart/Save buttons) + Available Models list with download/delete buttons
- **Equal column height**: All `.settings-section` elements get `flex: 1; min-height: 0` so sections stretch to fill their columns evenly — 3 left sections and 2 right sections both reach the same bottom edge. Compute Resources gets `flex: 2` (via `.settings-col:first-child .settings-section:first-child`) to accommodate its denser content, giving a 2:1:1 ratio on the left column (50/25/25).
- **Action bar split**: `.action-split` (flex row, `width: 100%`) wraps the action buttons; all `.split-btn` buttons have `flex: 1; justify-content: center` for equal-width split — 2 buttons = 50/50, 3 buttons = 33/33/33
- **Model rows**: Each model shows `CheckCircle` icon (`var(--success)`) if downloaded, a progress badge if downloading, or a `Download` button otherwise. Downloaded models also show a `Trash2` delete button (`.model-del-btn`, hover→`var(--danger)`). No download banners — status is inline in the model row.

**System info** (`.info-section`): Full-width at bottom, flex-wrap grid showing CPU, GPU, RAM, CUDA, binary type

**All section/control styling**: Same as 6.61 spec (`.settings-section` with `.section-header`/`.section-body`, `.field-compact` inputs, `.toggle-btn`, `.gpu-badge`, `.status-pill`, `.btn-sm` actions)

`data-section="engine-settings-modal"` on root element.

### 6.62 TranscriptionProgress Component

**Component**: `src/lib/components/settings/TranscriptionProgress.svelte`

**Route**: Shown inside `/settings/engine` upload area during active transcription.

**Props**: `status`, `fileName`, `fileSize`, `stagePercent` (object `{upload, process, transcribe}` 0-100), `stageLabels` (detail text per stage), `elapsed` (formatted MM:SS string).

**Layout**: 4-stage vertical progress card:
1. **Receiving Audio** — active when `status === 'uploading'`, shows file size, progress bar to 100%
2. **Processing Audio** — active after upload completes, covers FFmpeg conversion + whisper.cpp inference
3. **Transcribing** — active when first token streams, progress fills as tokens arrive (every 10 words)
4. **Complete** — shown when transcription finishes, displays elapsed time

**Stage spec**:
- Each stage: icon (Circle pending / LoaderCircle active with pulse animation / CircleCheck done) + label (Rajdhani 16px) + detail text (Rajdhani 13px, right-aligned)
- Progress bar: 4px height, `--border` track, `--cyan` fill (or `--success` when done), `0.4s` width transition
- Active icon has `pulse-icon` animation (opacity 1→0.5)
- Done icon and bar fill use `--success` color with glow

**State transitions**:
- `status='uploading'`: stages[0] active (pulsing), stages[1-2] pending, stage[3] hidden
- `status='transcribing'`: stages[0-1] done, stage[2] active, stage[3] pending  
- `status='complete'`: stages[0-2] done, stage[3] done with elapsed badge

**data-section**: `data-section="transcription-progress"` on root

### 6.63 BookAuthors (Lounge — Single-Row Layout)

**Component**: `src/lib/components/lounge/BookAuthors.svelte`

**Layout**: Each author section is a single flex row inside a Panel with the author name in the Panel title bar.

**Header** (`Panel title` + `headerRight` snippet):
- `title={section.name}` — Panel's built-in header renders the author name (Orbitron 16px, cyan)
- `headerRight` contains count badge (amber pill, `[N books]`) + amber edit Pencil button
- Count and edit sit in the header bar, not in the body

**Body (single flex row)** — 3 columns with `gap: 14px`, `align-items: stretch`:
1. **Image column** (`.author-img-col`): `width: 90px`, `flex-shrink: 0`, colored 2px border, `overflow: hidden`. Either an `<img>` with `object-fit: cover` or a placeholder div (Users icon, colored border, `min-height: 90px`)
2. **Description column** (`.author-desc-col`): `width: 220px`, `flex-shrink: 0`, vertically centered, 3-line clamp, italic Rajdhani `--text-dim`. Entirely hidden (not rendered) when description is empty — books column gets the full width
3. **Books column** (`.author-books-col`): `flex: 1`, `min-width: 0`, renders `BookCoverCarousel`

**Empty state**: Centered "No authors found." in Rajdhani `--text-dim`

`data-section="book-authors"` on root element.

### 6.64 Unified Book Detail Modal (Create + Edit)

**Component**: `src/lib/components/lounge/BookDetailModal.svelte`

**Tri-state `activeBook` pattern** (in parent `+page.svelte`):
- `activeBook === undefined` — no modal shown
- `activeBook === null` — create mode (Modal open, "Add New Book")
- `activeBook === object` — edit mode (Modal open, book data pre-filled)

**BookDetailModal** handles both create and edit:
- **Create mode** (`book === null`): Notes panel hidden, shows placeholder "Notes will be available after saving." Save button → POST to `/lounge/books` → on success switches to edit mode with new book's ID
- **Edit mode** (`book === object`): 2-panel grid — BookDetailForm (left) + DocumentForgeEditor notes (right). Save → PUT. Delete button visible.

**BookDetailForm.svelte** — always-editable unified form:
- Props: `{ book, genres, series, onsave, oncancel, saveFn = $bindable(), ondirty }`
- Embedded `BookUrlScraper` with `initialUrl` prop for pre-filling in edit mode
- Cover nav arrows when multiple covers from scraper
- Dirty tracking: pristine snapshot on init, `$derived hasChanges` comparing all fields
- `saveFn` is `$bindable()` — parent binds it to the modal header Save button
- `ondirty` callback fires on any field change (header shows Save button reactively)
- `source_url` field displayed in form (hidden no-input display when populated)
- No separate edit toggle — form is always editable

**Layout**: full modal (`<Modal full={true} noHeader={true}>`) with 2-column `.detail-grid` (`1fr 1fr`). Left panel wraps BookDetailForm, right panel wraps DocumentForgeEditor notes.

**Close protection**: same as 6.5 pattern — unsaved changes dialog with Save & Close / Discard / Stay buttons when `hasChanges` is dirty.

**Delete**: DeleteConfirm modal → DELETE `/lounge/books/{id}` → re-fetches list.

**Parent refetch**: On close, `activeBook = undefined`, re-fetches `GET /lounge/books` to sync.

`data-section="book-detail-modal"` on root element.

## 7. Common Design Patterns

### Sort Button Pattern
List pages (projects, clients) have an `ArrowUpDown` sort button in the toolbar that cycles through modes:
- Projects: `default` → `alphabetical` (by name) → `status` (by status order: not-started→on-hold→in-progress→completed)
- Clients: `default` → `alphabetical` (by name)
- Implemented via `$derived.by()` with a `sortMode` state variable
- Button shows current mode label (Default / Name / Status)
- `.sort-btn`: flex row with icon + label, border, `--text-dim` color, hover→cyan

### Card/Table Edit/Delete Actions
Cards and table rows that link to a detail page include Edit/Delete buttons with `stopPropagation`:
- `<div role="presentation" onclick={(e) => e.stopPropagation()}>` wraps action buttons so clicking them navigates to edit/delete instead of the detail page
- Table rows: adds an "Actions" `<th>` column with small 28px icon buttons
- Card: buttons in `.card-actions` div positioned right of the title
- Used by ProjectCard and projects table rows

### Edit Modal Pattern
Any Edit button opens the same Modal + form used for Create, pre-filled with existing data. Title switches between "Add New Client" / "Edit Client" based on context.

### SQLite Server Store
Server data lives in SQLite via `$lib/server/db.js`. Each entity module (e.g. `$lib/server/clients.js`) imports `db` and uses prepared statements. API routes (`+server.js`) expose endpoints. Load functions in `+page.server.js` import the server module directly.

### Shared Color Module
The 20-color client palette lives in `$lib/shared/colors.js` exporting `colors` (string array), `colorValues` (token→hex map), and `colorLabels` (token→label map). All components import from here instead of defining color maps inline. This ensures the palette is consistent across ClientForm, ClientCard, client list table, and client details header.

### Profile Preset Pattern

Used in settings forms where multiple config params should be set in one click.

- 3 toggle buttons (Low / Medium / High) in a flex row, equal width
- Orbitron 14px label + Rajdhani 12px description per button
- Active state: cyan border + `rgba(0,212,255,0.06)` background + box-shadow glow
- Selecting a profile calls a function that merges preset values into the config object
- Deviance detection via `$derived.by()`: compares all relevant config fields against each profile's values; returns matching profile name or null
- Preset also auto-selects recommended model if downloaded
- Profile name is persisted in config (`config.profile`)

**Three profiles** and their values:

| Setting | Low | Medium | High |
|---------|-----|--------|------|
| Recommended model | `ggml-tiny.bin` | `ggml-small.bin` | `ggml-large-v3-turbo.bin` |
| `threads` | 2 | 4 | 8 |
| `processors` | 1 | 2 | 4 |
| `useGpu` | false | true | true |
| `flashAttn` | false | true | true |
| `bestOf` | 1 | 2 | 5 |
| `beamSize` | -1 (disabled) | 5 | 10 |
| `chunkSeconds` | 30 | 60 | 120 |
| `useVad` | false | true | true |

Used by: `EngineSettingsModal.svelte`.

### 6.65 Typography Table — Sub Family Column

**System Design page** (`/settings/system-design`): The typography table has 5 columns:

```
Text Style | Font Family | Sub Family | Font Size | Preview
```

Each row uses two dropdowns instead of the previous single font select:

- **Font Family dropdown**: Lists distinct `family` values from `fonts.js` (deduplicated, sorted alphabetically).
- **Sub Family dropdown**: Shows variants for the selected family from `getFontsByFamily(family)`.
  - Families with only `variant: null`: static `—` indicator (no dropdown).
  - Multi-variant families: dropdown with options like `"Regular"` (for `variant: null`), `"Condensed"`, `"Extra Condensed"`, `"Semi Condensed"`.

**State model per row** (`$state` object `{ family, variant }`):
- `family` — string matching the `family` field in font entries
- `variant` — string (empty `''` for base/regular, variant name otherwise)
- Font ID is `$derived` via `resolveFontId(family, variant)` for config persistence
- `$effect` watches all rows — if a style's variant becomes invalid after its family changes, it resets to the first available variant
- Grid: `grid-template-columns: 150px 200px 150px 150px 1fr`

`data-section="system-design"` on page container.

### Responsive Font Scaling
- Clock: `clamp(42px, 11vw, 72px)`
- Clock date: `clamp(14px, 2.8vw, 18px)`
- Card grids: `repeat(auto-fill, minmax(320px, 1fr))`

---

## 8. Layout Structure

### Main Shell (`+layout.svelte`) — Vertical Gradient
```
┌─ data-section="breadcrumbs" (--bg-surface: #030712) ──┐  ← darkest
│            Bridge > Dashboard              [⚙]         │
├─ data-section="newsroom" (--bg-bar: #080d1a) ────────┤  ← mid-dark
│  NEWSROOM  📻  [Normandy Network: briefing ready...]   │
├─ data-section="operations-nav" (--bg-bar) [conditional]┤
│  TIME TRACKING │ TASKS │ PROJECTS │ CLIENTS            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  <main> (--bg-primary: #070b14, width: 100%,          │  ← main bg
│           padding: 10px 20px)                         │
│                                                        │
│    Panel content (--bg-panel: #0d1520)                 │  ← lighter
│                                                        │
├────────────────────────────────────────────────────────┤
│  NavBar (--bg-surface: #030712, fixed bottom)          │  ← darkest
│  Academy │ Lounge │ ⬟ BRIDGE ⬟ │ Treasury │ Ops       │
└────────────────────────────────────────────────────────┘
```

### Operations Area (`/operations/`)
```
┌─ operations/+layout.svelte ───────────────────────────┐
│  data-section="operations-nav"                        │
│  TIME TRACKING │ TASKS │ PROJECTS │ CLIENTS           │
│  ▲ active tab has cyan bottom border                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Sub-page content (<slot />)                           │
│    ┌──────────────────────────────────────────┐        │
│    │  Clients List                            │        │
│    │  [+ Add Client]                [≡][▦]    │        │
│    │  ┌──────┐ ┌──────┐ ┌──────┐             │        │
│    │  │Card 1│ │Card 2│ │Card 3│             │        │
│    │  └──────┘ └──────┘ └──────┘             │        │
│    └──────────────────────────────────────────┘        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 9. Data Attribute Conventions

| Attribute | When | Example |
|-----------|------|---------|
| `data-section` | Every major section root | `data-section="newsroom"`, `data-section="dashboard"`, `data-section="clients-page"`, `data-section="client-details"` |
| `data-label` | Labels, titles | `data-label="clock-time"`, `data-label="edi-prefix"`, `data-label="add-client"` |
| `data-nav` | Nav items | `data-nav="academy"`, `data-nav="time-tracking"`, `data-nav="clients"` |
| `data-crumb` | Breadcrumb links | `data-crumb="bridge"` |
| `data-item` | List items | `data-item="headline"` + `data-index={i}` |
| `data-component` | Component root elements | `data-component="panel"` |

---

## 6.66 Document Forge Layout Modes

The block editor supports 4 document-wide layout modes that control the 8-column CSS grid. Each mode has a corresponding `<!-- mode: <name> -->` comment at the top of the Markdown for persistence.

| Mode | Grid Column | Width | Pills Icon | Use Case |
|------|-------------|-------|-----------|----------|
| `normal` | `3 / span 4` | 50% centered | AlignCenter | Default paragraph reading |
| `wide` | `2 / span 6` | 75% centered | AlignLeft | Wider content like tables |
| `ultrawide` | `1 / -1` | 100% | AlignRight | Full-width content like images |
| `book` | Pages side-by-side | 50% each | BookOpen | Facing-pages reading |

### 8-Column Grid Spec

- `.blocks-list` uses `display: grid; grid-template-columns: repeat(8, 1fr); gap: 0 8px`
- Each block wrapper is a `.grid-cell` with `grid-column` set by the mode
- `max-width: 1100px` for normal/wide/ultrawide, `max-width: 900px` for book (tighter)
- In book mode, `.blocks-list` gets `overflow: hidden` — page navigation replaces scroll

### Mode Toggle UI

- Rendered as pill buttons in the ForgeWorkspace Panel `headerLeft` snippet:
  - Normal (AlignCenter) | Wide (AlignLeft) | Ultra (AlignRight) | Book (BookOpen)
  - Active: `--bg-elevated` + `--cyan` color
  - Inactive: transparent + `--text-dim`
- In Book detail modal: compact single-letter pills (N/W/U/B) in `notesHeaderRight`

### Page Nav (Book Mode)

- Centered pill: `[◀│▶] Page X / Y`
- ChevronLeft / ChevronRight with disabled state on first/last page
- Orbitron 11px label, cyan chevrons
- `overflow: hidden` on content pane — page nav controls visible content
- Page splitting: blocks measured at render, cumulative height compared to container height

### 2-Column Block (`type: 'columns'`)

A container block with two child block arrays rendered side-by-side.

**Markdown serialization**:
```
<!-- columns:2 -->
Left column content...
<!-- column -->
Right column content...
<!-- /columns -->
```

**Rendering**: `grid-template-columns: 1fr 1fr; gap: 8px` with each column in a bordered `.column-col` div (dark tint `rgba(0,0,0,0.15)`, white theme uses `rgba(0,0,0,0.03)`).

**Slash command**: `/2col` → creates two empty `p` child blocks. Available in the Convert To menu as "2 Columns" (Columns2 icon).

## 10. Do Not Deviate (Hard Rules)

1. **NEVER use emoji as icons.** Only Lucide SVGs.
2. **NEVER introduce colors outside the palette.** No random greens, reds, purples.
3. **NEVER change font stack.** Orbitron for headings/display, Rajdhani for body.
4. **16px minimum font size for all UI.** Never go below 16px (exception: decorative clock at 72px, separator dots at 8px).
5. **ALWAYS use `border-radius: var(--radius)` (5px).** Never use clip-path parallelograms or other corner shapes.
6. **ALWAYS wrap content sections in Panel.** Unless it's the clock (stands alone) or the Newsroom (flat bar).
7. **ALWAYS add `data-section` to new elements.** The user inspects in browser to give feedback.
8. **Settings icon lives in breadcrumbs area (top-right), not in navbar.**
9. **EDI message is conversational** — natural language, not stats format with bullets.
10. **NEVER exceed 200 lines per file.** Split into components.
11. **Main content area has `10px 20px` padding** (`10px` top/bottom, `20px` left/right). Applied globally in `+layout.svelte` on `<main class="content">`. Do not add per-page padding. Toolbars use `margin: 0 -20px` to break out, then `padding: 15px 30px` to realign.
12. **ALWAYS run `npm run build`** after changes to verify no errors.
13. **ALWAYS update this file** if new design patterns are introduced.
14. **Blue/cyan is primary. Amber is only for source labels, warnings, and client modal headers.** Never use orange as primary accent.
