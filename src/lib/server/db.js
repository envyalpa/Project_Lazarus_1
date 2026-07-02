import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const dataDir = path.join(process.cwd(), 'data');
let _db = null;

function initDb() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'lazarus.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Building2',
      color TEXT DEFAULT '--cyan',
      logo TEXT DEFAULT '',
      description TEXT DEFAULT '',
      codex_markdown TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'not-started',
      color TEXT DEFAULT '--cyan',
      codex_markdown TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'not-started',
      start_date TEXT,
      due_date TEXT,
      source_type TEXT,
      source_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      duration INTEGER NOT NULL,
      description TEXT DEFAULT '',
      date TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'bank',
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      icon TEXT DEFAULT 'Wallet',
      color TEXT DEFAULT '--cyan',
      is_asset INTEGER DEFAULT 1,
      show_in_summary INTEGER DEFAULT 1,
      total_payable REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      relationship TEXT DEFAULT '',
      icon TEXT DEFAULT 'User',
      color TEXT DEFAULT '--cyan',
      show_in_summary INTEGER DEFAULT 1,
      include_in_split INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT 'Tag',
      color TEXT DEFAULT '--cyan',
      budget REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      paid_by TEXT DEFAULT '',
      paid_to TEXT DEFAULT '',
      paid_for TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_paid_by ON transactions(paid_by);
    CREATE INDEX IF NOT EXISTS idx_transactions_paid_to ON transactions(paid_to);

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      period TEXT DEFAULT 'monthly',
      limit_amount REAL NOT NULL,
      spent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      status TEXT DEFAULT 'tbr',
      rating INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      status TEXT DEFAULT 'planned',
      rating INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS anime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      episodes INTEGER,
      status TEXT DEFAULT 'planned',
      rating INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      platform TEXT,
      status TEXT DEFAULT 'backlog',
      hours_played REAL DEFAULT 0,
      rating INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'GraduationCap',
      color TEXT DEFAULT '--cyan'
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER REFERENCES areas(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      provider TEXT,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in-progress'
    );

    CREATE TABLE IF NOT EXISTS study_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS story_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      entry_date TEXT NOT NULL,
      entry_color TEXT DEFAULT '#00c8ff',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entry_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES story_entries(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entry_meeting_notes (
      entry_id INTEGER NOT NULL REFERENCES story_entries(id) ON DELETE CASCADE,
      meeting_note_id INTEGER NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, meeting_note_id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      designation TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      source_type TEXT,
      source_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meeting_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_note_id INTEGER REFERENCES meeting_notes(id) ON DELETE CASCADE,
      story_entry_id INTEGER REFERENCES story_entries(id) ON DELETE SET NULL,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'not-started',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT DEFAULT '',
      link TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      report_month INTEGER NOT NULL,
      report_year INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(client_id, report_month, report_year)
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      profile_name TEXT NOT NULL,
      logo_data_uri TEXT,
      colors_json TEXT NOT NULL,
      typography_json TEXT NOT NULL,
      layout_json TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      conversation_id INTEGER REFERENCES client_conversations(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );


    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      new_accounts INTEGER DEFAULT 0,
      new_people INTEGER DEFAULT 0,
      merge_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS title_vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT NOT NULL,
      item TEXT DEFAULT '',
      canonical TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_title_vendors_canonical ON title_vendors(canonical);

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS title_cleanup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL UNIQUE,
      cleaned TEXT NOT NULL,
      category_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reconciliation_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'in_progress',
      base_source TEXT NOT NULL,
      total_groups INTEGER DEFAULT 0,
      confirmed_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reconciliation_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
      row_index INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      base_json TEXT NOT NULL DEFAULT '{}',
      gpay_json TEXT DEFAULT '{}',
      notion_json TEXT DEFAULT '{}',
      spreadsheet_json TEXT DEFAULT '{}',
      selections_json TEXT DEFAULT '{}',
      merged_json TEXT DEFAULT '{}',
      confirmed_transaction_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try { db.exec("INSERT OR IGNORE INTO title_cleanup (source, cleaned) VALUES ('dummy_init', 'dummy_init')"); db.exec("DELETE FROM title_cleanup WHERE source = 'dummy_init'"); } catch {}
  try { db.exec("ALTER TABLE import_log ADD COLUMN merge_count INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE academy_areas ADD COLUMN cover_url TEXT DEFAULT ''"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        platform_name TEXT NOT NULL,
        run_name TEXT NOT NULL,
        url TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        research_notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch (e) {
    console.error("Error creating test_runs table:", e);
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
        criteria_id INTEGER NOT NULL,
        stage TEXT NOT NULL,
        pain_point TEXT DEFAULT '',
        what_to_test TEXT NOT NULL,
        expected_outcome TEXT NOT NULL,
        test_role TEXT DEFAULT '',
        severity TEXT DEFAULT 'Important',
        status TEXT DEFAULT 'pending',
        notes_gap TEXT DEFAULT '',
        screenshot_path TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(test_run_id, criteria_id)
      );
    `);
  } catch (e) {
    console.error("Error creating test_results table:", e);
  }
  try { db.exec("ALTER TABLE test_runs ADD COLUMN url TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE test_runs ADD COLUMN username TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE test_runs ADD COLUMN password TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE test_runs ADD COLUMN research_notes TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE academy_areas ADD COLUMN priority TEXT DEFAULT 'medium'"); } catch {}
  try { db.exec("ALTER TABLE academy_courses ADD COLUMN started_on TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE academy_courses ADD COLUMN completed_on TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE academy_courses ADD COLUMN course_url TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE academy_courses ADD COLUMN cover_image TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE meeting_notes ADD COLUMN transcript TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE contacts ADD COLUMN source_type TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE contacts ADD COLUMN source_id INTEGER"); } catch {}
  try { db.exec("ALTER TABLE client_files ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE"); } catch {}
  try { db.exec("ALTER TABLE client_files ADD COLUMN is_internal INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE client_files ADD COLUMN internal_path TEXT"); } catch {}
  try { db.exec("ALTER TABLE client_files ADD COLUMN content_markdown TEXT"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN source_url TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE people ADD COLUMN include_in_split INTEGER DEFAULT 1"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS token_usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        estimated_cost REAL NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        vector TEXT NOT NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        timestamp TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        duration REAL NOT NULL,
        transcribe_mode TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        transcription TEXT DEFAULT '',
        segments_json TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try { db.exec("ALTER TABLE memory_embeddings ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE"); } catch {}
  try { db.exec("ALTER TABLE memory_embeddings ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE"); } catch {}
  try { db.exec("ALTER TABLE projects ADD COLUMN codex_markdown TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE clients ADD COLUMN codex_markdown TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE clients ADD COLUMN dossier_markdown TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE clients ADD COLUMN dossier_updated_at TEXT"); } catch {}
  try { db.exec("ALTER TABLE client_documents ADD COLUMN conversation_id INTEGER REFERENCES client_conversations(id) ON DELETE SET NULL"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS client_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        messages_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try { db.exec("ALTER TABLE client_conversations ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS authors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '--cyan',
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        wiki_link TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_debug_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        system_prompt TEXT DEFAULT '',
        user_prompt TEXT DEFAULT '',
        raw_response TEXT DEFAULT '',
        final_response TEXT DEFAULT '',
        provider TEXT DEFAULT '',
        model TEXT DEFAULT '',
        request_data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN processed INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN edi_correct_title INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN edi_correct_author INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN edi_correct_series INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN edi_correct_genres INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE book_series ADD COLUMN edi_correct_synopsis INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE genres ADD COLUMN icon TEXT DEFAULT 'Tag'"); } catch {}
  try { db.exec("ALTER TABLE genres ADD COLUMN color TEXT DEFAULT '--cyan'"); } catch {}
  try { db.exec("ALTER TABLE genres ADD COLUMN description TEXT DEFAULT ''"); } catch {}
  try { db.exec("DELETE FROM genres WHERE id NOT IN (SELECT DISTINCT genre_id FROM book_genres)"); } catch {}
  try { db.exec("ALTER TABLE series ADD COLUMN icon TEXT DEFAULT 'BookMarked'"); } catch {}
  try { db.exec("ALTER TABLE series ADD COLUMN color TEXT DEFAULT '--cyan'"); } catch {}
  try { db.exec("ALTER TABLE series ADD COLUMN description TEXT DEFAULT ''"); } catch {}
  try {
    const genreMigrations = [
      { names: ['fantasy', 'epic fantasy', 'dark fantasy', 'sword and sorcery', 'urban fantasy'], icon: 'Sparkles', color: '--purple' },
      { names: ['science fiction', 'sci-fi', 'space opera', 'cyberpunk', 'steampunk', 'dystopian', 'post-apocalyptic'], icon: 'Rocket', color: '--blue' },
      { names: ['mystery', 'crime', 'noir', 'suspense', 'thriller'], icon: 'Search', color: '--indigo' },
      { names: ['horror', 'supernatural', 'gothic', 'ghost'], icon: 'Ghost', color: '--red-dark' },
      { names: ['romance'], icon: 'Heart', color: '--pink' },
      { names: ['historical fiction', 'history'], icon: 'Scroll', color: '--amber-dark' },
      { names: ['literary fiction', 'fiction'], icon: 'BookOpen', color: '--cyan' },
      { names: ['adventure'], icon: 'Compass', color: '--amber' },
      { names: ['saga'], icon: 'BookMarked', color: '--teal' },
      { names: ['short stories', 'essay'], icon: 'FileText', color: '--cyan-light' },
      { names: ['poetry'], icon: 'Music', color: '--magenta' },
      { names: ['biography', 'memoir'], icon: 'User', color: '--green' },
      { names: ['drama'], icon: 'Clapperboard', color: '--amber-light' },
      { names: ['fairy tale', 'mythology', 'folklore'], icon: 'Star', color: '--amber' },
      { names: ['comic', 'graphic novel'], icon: 'Image', color: '--blue-light' },
      { names: ['philosophy'], icon: 'Lightbulb', color: '--indigo' },
      { names: ['art'], icon: 'Palette', color: '--pink' },
      { names: ['gaming'], icon: 'Gamepad2', color: '--cyan-dark' },
      { names: ['science', 'technology'], icon: 'FlaskConical', color: '--green-light' },
      { names: ['religion', 'spirituality'], icon: 'Church', color: '--amber-dark' },
      { names: ['self-help', 'psychology'], icon: 'HeartHandshake', color: '--teal' },
      { names: ['travel'], icon: 'Plane', color: '--green' },
      { names: ['music'], icon: 'Music', color: '--magenta' },
      { names: ['alternative history'], icon: 'TimerReset', color: '--blue-dark' },
      { names: ['criticism', 'literary criticism'], icon: 'Bookmark', color: '--cyan-light' },
      { names: ['magical realism', 'realismo mágico'], icon: 'Sparkles', color: '--cyan' },
      { names: ['southern gothic'], icon: 'Ghost', color: '--red' },
    ];
    for (const mg of genreMigrations) {
      for (const name of mg.names) {
        db.prepare('UPDATE genres SET icon = ?, color = ? WHERE LOWER(name) = ? AND (icon = ? OR color = ?)').run(mg.icon, mg.color, name, 'Tag', '--cyan');
      }
    }
  } catch {}
  return db;
}

const db = new Proxy({}, {
  get(_, prop) {
    if (!_db) _db = initDb();
    return _db[prop];
  }
});

export default db;
