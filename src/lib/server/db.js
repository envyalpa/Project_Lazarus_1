import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DATA_DIR } from './paths.js';

const dataDir = DATA_DIR;
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_anime_series_title ON anime_series(title COLLATE NOCASE);

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

  function patch(sql) {
    try {
      db.exec(sql);
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) {
        console.error('[db] schema patch failed:', sql.slice(0, 80), '->', e.message);
      }
    }
  }

  patch("ALTER TABLE projects ADD COLUMN icon TEXT DEFAULT 'FolderKanban'")
  patch("ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER")
  patch("ALTER TABLE time_entries ADD COLUMN title TEXT DEFAULT ''")
  patch("ALTER TABLE time_entries ADD COLUMN project_id INTEGER")
  patch("ALTER TABLE time_entries ADD COLUMN start_time TEXT DEFAULT ''")
  patch("ALTER TABLE time_entries ADD COLUMN end_time TEXT DEFAULT ''")
  patch("ALTER TABLE time_entries ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))")
  patch("ALTER TABLE title_cleanup ADD COLUMN confirmed INTEGER DEFAULT 0")

  try { db.exec("INSERT OR IGNORE INTO title_cleanup (source, cleaned) VALUES ('dummy_init', 'dummy_init')"); db.exec("DELETE FROM title_cleanup WHERE source = 'dummy_init'"); } catch {}
  patch("ALTER TABLE import_log ADD COLUMN merge_count INTEGER DEFAULT 0")
  patch("ALTER TABLE academy_areas ADD COLUMN cover_url TEXT DEFAULT ''")
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
  patch("ALTER TABLE test_runs ADD COLUMN url TEXT DEFAULT ''")
  patch("ALTER TABLE test_runs ADD COLUMN username TEXT DEFAULT ''")
  patch("ALTER TABLE test_runs ADD COLUMN password TEXT DEFAULT ''")
  patch("ALTER TABLE test_runs ADD COLUMN research_notes TEXT DEFAULT ''")
  patch("ALTER TABLE academy_areas ADD COLUMN priority TEXT DEFAULT 'medium'")
  patch("ALTER TABLE academy_courses ADD COLUMN started_on TEXT DEFAULT ''")
  patch("ALTER TABLE academy_courses ADD COLUMN completed_on TEXT DEFAULT ''")
  patch("ALTER TABLE academy_courses ADD COLUMN course_url TEXT DEFAULT ''")
  patch("ALTER TABLE academy_courses ADD COLUMN cover_image TEXT DEFAULT ''")
  patch("ALTER TABLE meeting_notes ADD COLUMN transcript TEXT DEFAULT ''")
  patch("ALTER TABLE contacts ADD COLUMN source_type TEXT DEFAULT ''")
  patch("ALTER TABLE contacts ADD COLUMN source_id INTEGER")
  patch("ALTER TABLE client_files ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE")
  patch("ALTER TABLE client_files ADD COLUMN is_internal INTEGER DEFAULT 0")
  patch("ALTER TABLE client_files ADD COLUMN internal_path TEXT")
  patch("ALTER TABLE client_files ADD COLUMN content_markdown TEXT")
  patch("ALTER TABLE book_series ADD COLUMN source_url TEXT DEFAULT ''")
  patch("ALTER TABLE people ADD COLUMN include_in_split INTEGER DEFAULT 1")
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
  patch("ALTER TABLE memory_embeddings ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE")
  patch("ALTER TABLE memory_embeddings ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE")
  patch("ALTER TABLE projects ADD COLUMN codex_markdown TEXT DEFAULT ''")
  patch("ALTER TABLE clients ADD COLUMN codex_markdown TEXT DEFAULT ''")
  patch("ALTER TABLE clients ADD COLUMN dossier_markdown TEXT DEFAULT ''")
  patch("ALTER TABLE clients ADD COLUMN dossier_updated_at TEXT")
  patch("ALTER TABLE client_documents ADD COLUMN conversation_id INTEGER REFERENCES client_conversations(id) ON DELETE SET NULL")
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
  patch("ALTER TABLE client_conversations ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL")
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
  patch("ALTER TABLE series ADD COLUMN icon TEXT DEFAULT 'BookMarked'")
  patch("ALTER TABLE series ADD COLUMN color TEXT DEFAULT '--cyan'")
  patch("ALTER TABLE series ADD COLUMN description TEXT DEFAULT ''")
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
    const insertStmt = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
    const updateStmt = db.prepare('UPDATE genres SET icon = ?, color = ? WHERE LOWER(name) = ?');
    for (const mg of genreMigrations) {
      for (const name of mg.names) {
        insertStmt.run(name);
        updateStmt.run(mg.icon, mg.color, name);
      }
    }
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT 'Tag',
        color TEXT DEFAULT '--cyan',
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS book_genres (
        book_id INTEGER NOT NULL REFERENCES book_series(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (book_id, genre_id)
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS anime_genres (
        anime_id INTEGER NOT NULL REFERENCES anime_series(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (anime_id, genre_id)
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tv_shows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        cover_url TEXT DEFAULT '',
        rating TEXT,
        status TEXT DEFAULT 'not_started',
        notes TEXT DEFAULT '',
        synopsis TEXT DEFAULT '',
        source_url TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tv_show_seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        show_id INTEGER NOT NULL REFERENCES tv_shows(id) ON DELETE CASCADE,
        season_number INTEGER NOT NULL,
        total_episodes INTEGER DEFAULT 0,
        episodes_watched INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tv_show_genres (
        show_id INTEGER NOT NULL REFERENCES tv_shows(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (show_id, genre_id)
      );
    `);
  } catch {}
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_tv_shows_title ON tv_shows(title COLLATE NOCASE)'); } catch {}
  patch("ALTER TABLE tv_shows ADD COLUMN source_url TEXT DEFAULT ''")
  patch("ALTER TABLE movies ADD COLUMN cover_url TEXT DEFAULT ''")
  patch("ALTER TABLE movies ADD COLUMN synopsis TEXT DEFAULT ''")
  patch("ALTER TABLE movies ADD COLUMN source_url TEXT DEFAULT ''")
  patch("ALTER TABLE movies ADD COLUMN created_at TEXT DEFAULT (datetime('now'))")
  patch("ALTER TABLE movies ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))")
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS movie_genres (
        movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, genre_id)
      );
    `);
  } catch {}
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_title ON movies(title COLLATE NOCASE)'); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS collectible_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'Package',
        color TEXT DEFAULT '--cyan',
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS collectible_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL REFERENCES collectible_collections(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        status TEXT DEFAULT 'not_collected',
        image_url TEXT DEFAULT '',
        source_url TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        collected_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(collection_id, name)
      );
    `);
  } catch {}
  try {
    const insertCollection = db.prepare('INSERT OR IGNORE INTO collectible_collections (slug, name, icon, color, description) VALUES (?, ?, ?, ?, ?)');
    insertCollection.run('monster-cans', 'Monster Energy Cans', 'Package', '--success', 'Every flavor across Monster Energy, Monster Ultra, Monster Coffee, Juice Monster, and Rehab Monster.');
    const collection = db.prepare('SELECT id FROM collectible_collections WHERE slug = ?').get('monster-cans');
    if (collection) {
      const insertItem = db.prepare('INSERT OR IGNORE INTO collectible_items (collection_id, name, category, image_url, source_url) VALUES (@collection_id, @name, @category, @image_url, @source_url)');
      const monsterCans = [
        // Monster Energy (Original)
        { name: 'Original Green "OG"', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/86be6554-4e12-435b-b8d0-bc492e68e436.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/original-green/' },
        { name: 'Zero Sugar', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/e6e3cf70-f77e-4d4d-bd51-f2448af390ce.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/zero-sugar/' },
        { name: 'Strawberry Shot', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/ab8489fb-b3fd-4f43-b7f5-7b91ec28874c.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/strawberry-shot/' },
        { name: 'Zero Sugar Strawberry Shot', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/fd62414f-7c2a-404e-8578-95ff2457c7f0.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/zero-sugar-strawberry-shot/' },
        { name: 'Zero Sugar Yuzu Melon (Lando Norris)', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/e487eb23-5358-4119-9ff2-d8fa1d11ad0c.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/lando-norris/' },
        { name: 'Electric Blue', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/0c758b62-b6c4-4b34-b560-e908f11582c4.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/electric-blue/' },
        { name: 'Orange Dreamsicle', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/d2be55a1-266d-4f28-b829-9301cfa688f1.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/orange-dreamsicle/' },
        { name: 'Lo-Carb', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/68cec0c3-fab0-4d39-9cea-1dd757a84ab7.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/lo-carb/' },
        { name: 'Reserve Orange Dreamsicle', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/ecbd5c80-57d1-4e5a-887f-80b1ccb6c585.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/reserve-orange-dreamsicle/' },
        { name: "Reserve Peaches n' Crème", category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/64017997-879a-4aee-bb3e-47c1032e21a2.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/reserve-peaches-n-creme/' },
        { name: 'Nitro Super Dry', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/03129094-b0f6-41d9-b188-ab0677afdf2c.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/nitro-super-dry/' },
        { name: 'Super-Premium Import', category: 'Monster Energy', image_url: 'https://web-assests.monsterenergy.com/mnst/9e0f35fc-fc2f-456f-a6f5-4e7110e96967.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/monster-energy/import/' },
        // Monster Ultra (Zero Sugar)
        { name: 'Red White Blue Razz', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/ffcc6d78-44ed-43cd-b4a4-153ff81fe799.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-red-white-blue-razz/' },
        { name: 'Zero Ultra "White Monster"', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/5587a01b-3c83-42f7-a741-b29a1d534409.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/zero-ultra/' },
        { name: 'Punk Punch', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/27ce1546-3656-4992-a630-4c7142a8f4c0.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-punk-punch/' },
        { name: 'Blue Hawaiian', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/211d7c75-cd9f-45e6-be23-270e37cb89ba.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-blue-hawaiian/' },
        { name: 'Vice Guava', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/f3247a88-0489-493a-b1d3-67d9fec21efe.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-vice-guava/' },
        { name: 'Wild Passion', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/a407f89f-e37a-4479-af44-6ea877acb47f.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-wild-passion/' },
        { name: 'Strawberry Dreams', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/f7c37e77-9b5d-46ae-83ee-8d8cd27042b3.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-strawberry-dreams/' },
        { name: 'Sunrise', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/c66034b5-eee7-4bbe-8283-6f6beb051872.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-sunrise/' },
        { name: 'Violet', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/7e5ab5c3-07a2-402b-ad77-d13458d0b73e.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-violet/' },
        { name: 'Peachy Keen', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/38a1d9c7-b926-41a6-a0cd-5020b83da8e9.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-peachy-keen/' },
        { name: 'Fantasy Ruby Red', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/b51a3dd9-c4b8-4e12-82f4-1ea2dd25eb2a.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-fantasy-ruby-red/' },
        { name: 'Paradise', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/bc17ca83-d4e3-4c5d-a8ad-414bc3e1b2d8.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-paradise/' },
        { name: 'Fiesta Mango', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/b4aa6355-45ef-4a5e-8f27-c17dbba50003.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-fiesta-mango/' },
        { name: 'Watermelon', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/1cb31b0a-fd8d-42b4-8e3b-e9fcb0f6bb80.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-watermelon/' },
        { name: 'Rosá', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/d8a379e2-9213-4b9f-9520-b6a562b126f9.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-rosa/' },
        { name: 'Red', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/1bc46890-6c15-4c60-aa46-a6ea7e9c06db.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-red/' },
        { name: 'Blue', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/b13d441c-b02a-4e42-bc05-e629a1907e14.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-blue/' },
        { name: 'Black', category: 'Monster Ultra', image_url: 'https://web-assests.monsterenergy.com/mnst/172d2ac5-a1fd-40f4-a477-5d045d62982e.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-black/' },
        // Monster Coffee (Java Monster)
        { name: 'Mean Bean', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/25ba7d1a-5df2-4199-9510-4b1d98c496f9.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/mean-bean/' },
        { name: 'Loca Moca', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/abb62e59-fbe2-4ef1-a0c9-4812d6928ce8.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/loca-moca/' },
        { name: 'Salted Caramel', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/ab4bb4d0-fef6-4238-821f-fb475c7684fb.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/salted-caramel/' },
        { name: 'Café Latte', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/3eaef620-a889-4f49-9c80-15d10c0e94e0.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/cafe-latte/' },
        { name: 'Irish Crème', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/87fba31e-3680-446a-8d86-a714a91d7fe8.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/irish-creme/' },
        { name: 'Killer Brew Loca Moca', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/74d3f453-83d1-49e8-b8d6-8c667121b794.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/killer-brew-loca-moca/' },
        { name: 'Killer Brew Mean Bean', category: 'Monster Coffee', image_url: 'https://web-assests.monsterenergy.com/mnst/aa871ebb-aa73-4f9b-99ab-e66acd3ac07d.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/java-monster/killer-brew-mean-bean/' },
        // Juice Monster
        { name: 'Strawberry Lemonade', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/5b5d1deb-397b-492a-8762-c0721768a4bb.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/strawberry-lemonade/' },
        { name: 'Voodoo Grape', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/9695d25a-752e-4b7a-beb6-0fe74c012c8b.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/voodoo-grape/' },
        { name: 'Mango Loco', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/bcbf7fc0-05e9-4d0d-933c-30eabf9ca620.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/mango-loco/' },
        { name: 'Pacific Punch', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/52ec68fb-cd25-4cbb-9bf0-5f38931e5875.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/pacific-punch/' },
        { name: 'Viking Berry', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/c04d7602-9590-4f16-98ed-db7c023e8c21.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/viking-berry/' },
        { name: 'Bad Apple', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/8ed0cc51-5dc9-4648-8c20-600ab30fc83e.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/bad-apple/' },
        { name: 'Rio Punch', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/664fb7f7-9ad2-4c36-923d-70cd767e0d9f.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/rio-punch/' },
        { name: 'Pipeline Punch', category: 'Juice Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/6aa8ff45-fcd8-4c9d-b2b2-d15a69a1d465.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/juice-monster/pipeline-punch/' },
        // Rehab Monster (Tea)
        { name: 'Tea + Lemonade', category: 'Rehab Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/d9cfa97e-c911-4859-88dd-192b03b8e5a2.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/rehab-monster/tea-lemonade/' },
        { name: 'Peach Tea', category: 'Rehab Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/cb9a5b60-ac4d-4a56-aa4d-23417a22e144.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/rehab-monster/peach-tea/' },
        { name: 'Wild Berry Tea', category: 'Rehab Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/f44f8b1b-2480-4d68-8938-1b5d859be6e3.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/rehab-monster/wild-berry/' },
        { name: 'Green Tea', category: 'Rehab Monster', image_url: 'https://web-assests.monsterenergy.com/mnst/384bc104-0db7-48e5-a528-905d245be4d1.png', source_url: 'https://www.monsterenergy.com/en-us/energy-drinks/rehab-monster/green-tea/' }
      ];
      for (const item of monsterCans) {
        insertItem.run({ collection_id: collection.id, name: item.name, category: item.category, image_url: item.image_url, source_url: item.source_url });
      }
    }
  } catch (e) {
    console.error('Error seeding collectibles:', e);
  }
  patch("ALTER TABLE collectible_items ADD COLUMN region TEXT DEFAULT 'US'")
  try {
    const collection = db.prepare('SELECT id FROM collectible_collections WHERE slug = ?').get('monster-cans');
    if (collection) {
      const insertItem = db.prepare('INSERT OR IGNORE INTO collectible_items (collection_id, name, category, image_url, source_url, region) VALUES (@collection_id, @name, @category, @image_url, @source_url, @region)');
      const intlExclusives = [
        // United Kingdom
        { name: 'Assault', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/ee3d31f3-1f2e-4148-846d-bc70fbdf96f1.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/assault/' },
        { name: 'Monster Mule', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/abe6ac22-4972-4caa-9f51-f4fb8ee3c3f1.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/monster-mule/' },
        { name: 'VR46 aka The Doctor', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/fce2caa1-d334-49a4-9325-257e78484459.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/vr46-aka-the-doctor/' },
        { name: 'VR46 Zero Sugar', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/ee28b253-d7c2-4a3c-b014-ae679461be9c.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/vr-46-zero-sugar/' },
        { name: 'Full Throttle Zero Sugar', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/4b6aa558-500e-4d01-ae3f-68d042fa78ee.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/full-throttle-zero-sugar/' },
        { name: 'Nitro Cosmic Peach', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/5a284f68-572a-4f85-b057-0ecd6cf7663d.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/nitro-cosmic-peach/' },
        { name: 'Reserve White Pineapple', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/00ff8933-1e29-43ac-bf49-91cd2b4399d9.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/reserve-white-pineapple/' },
        { name: 'Reserve Watermelon', category: 'Monster Energy', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/4eddd859-3c06-463e-9b62-e09ff17cc3b0.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-energy/reserve-watermelon/' },
        { name: 'Ultra Gold (Golden Pineapple)', category: 'Monster Ultra', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/ce23cf5f-1c5e-412d-aad5-f5ee155915f8.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/monster-ultra/zero-sugar-ultra-gold/' },
        { name: 'Khaotic', category: 'Juice Monster', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/432fbcdf-76c7-429a-998f-9c1c568d84b7.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/juiced-monster/khaotic/' },
        { name: 'Monarch', category: 'Juice Monster', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/82356595-2412-41fa-ac27-25cd063c48a4.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/juiced-monster/monarch/' },
        { name: 'Ripper', category: 'Juice Monster', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/adf4ba73-c94b-4ea4-afe6-be438b9710da.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/juiced-monster/ripper/' },
        { name: 'Mixxd Punch', category: 'Juice Monster', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/b11c0b96-46a6-4def-a453-69dd977b0106.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/juiced-monster/mixxd-punch/' },
        { name: 'Aussie Lemonade', category: 'Juice Monster', region: 'UK', image_url: 'https://web-assests.monsterenergy.com/mnst/a15b3684-98ec-4ace-be42-8cb4dea6475a.png', source_url: 'https://www.monsterenergy.com/en-gb/energy-drinks/juiced-monster/aussie-lemonade/' },
        // Australia
        { name: 'Papillon', category: 'Juice Monster', region: 'Australia', image_url: 'https://web-assests.monsterenergy.com/mnst/8b5acff7-c7cb-4211-a3cc-43d09852c5a4.png', source_url: 'https://www.monsterenergy.com/en-au/energy-drinks/juice-monster/papillon/' },
        // Canada
        { name: 'Triple Shot Mocha', category: 'Monster Coffee', region: 'Canada', image_url: 'https://web-assests.monsterenergy.com/mnst/e8d2c58c-a603-4e51-9df5-5043cafd6f71.png', source_url: 'https://www.monsterenergy.com/en-ca/energy-drinks/java-monster/java-monster-triple-shot-mocha/' },
        { name: 'Triple Shot French Vanilla', category: 'Monster Coffee', region: 'Canada', image_url: 'https://web-assests.monsterenergy.com/mnst/2c0ee323-fa12-4ea2-ba74-c30e96dbab05.png', source_url: 'https://www.monsterenergy.com/en-ca/energy-drinks/java-monster/java-monster-triple-shot-french-vanilla/' },
        // Brazil
        { name: 'Absolutely Zero', category: 'Monster Energy', region: 'Brazil', image_url: 'https://web-assests.monsterenergy.com/mnst/0bcf4538-7fdd-49f3-b0fe-07a657b22b02.png', source_url: 'https://www.monsterenergy.com/pt-br/energy-drinks/monster-energy/monster-energy-absolutely-zero/' },
        { name: 'Dragon Ice Tea Limão (Lemon)', category: 'Dragon Tea', region: 'Brazil', image_url: 'https://web-assests.monsterenergy.com/mnst/2b5bfc18-fb32-4f23-80ac-7f3b58ac16ef.png', source_url: 'https://www.monsterenergy.com/pt-br/energy-drinks/dragon-tea/monster-energy-dragon-ice-tea-lim%C3%A3o/' },
        { name: 'Dragon Ice Tea Pêssego (Peach)', category: 'Dragon Tea', region: 'Brazil', image_url: 'https://web-assests.monsterenergy.com/mnst/00502e05-a89a-4da2-94b4-676ae408af5a.png', source_url: 'https://www.monsterenergy.com/pt-br/energy-drinks/dragon-tea/monster-energy-dragon-ice-tea-p%C3%AAssego/' },
        // Japan
        { name: 'M3', category: 'Monster Energy', region: 'Japan', image_url: 'https://web-assests.monsterenergy.com/mnst/861be057-9aab-4efa-897b-b39484544416.png', source_url: 'https://www.monsterenergy.com/ja-jp/energy-drinks/monster-energy/%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%A8%E3%83%8A%E3%82%B8%E3%83%BC-m3/' },
        // Germany
        { name: 'Top Speed Zero Sugar', category: 'Monster Energy', region: 'Germany', image_url: 'https://web-assests.monsterenergy.com/mnst/0746dc69-10c4-4b37-9f2d-cd2330964db1.png', source_url: 'https://www.monsterenergy.com/de-de/energy-drinks/monster-energy/top-speed-zero-sugar/' },
        // South Africa
        { name: 'Mucho Loco', category: 'Juice Monster', region: 'South Africa', image_url: 'https://web-assests.monsterenergy.com/mnst/aa3e7bda-bb6c-409c-b556-7c4d5648a4a5.png', source_url: 'https://www.monsterenergy.com/en-za/energy-drinks/juiced-monster/monster-mucho-loco/' },
        { name: 'Mariposa', category: 'Juice Monster', region: 'South Africa', image_url: 'https://web-assests.monsterenergy.com/mnst/4780ea05-f288-4339-81d6-c1f6395dc339.png', source_url: 'https://www.monsterenergy.com/en-za/energy-drinks/juiced-monster/monster-mariposa/' },
        // South Korea
        { name: 'Ultra Citra', category: 'Monster Ultra', region: 'South Korea', image_url: 'https://web-assests.monsterenergy.com/mnst/a3332afb-81c0-4171-8000-06a9550a7e5c.png', source_url: 'https://www.monsterenergy.com/ko-kr/energy-drinks/monster-ultra/monster-energy-ultra-citra/' }
      ];
      for (const item of intlExclusives) {
        insertItem.run({ collection_id: collection.id, name: item.name, category: item.category, image_url: item.image_url, source_url: item.source_url, region: item.region });
      }
    }
  } catch (e) {
    console.error('Error seeding international collectibles:', e);
  }
  return db;
}

const db = new Proxy({}, {
  get(_, prop) {
    if (!_db) _db = initDb();
    return _db[prop];
  }
});

export default db;
