#!/usr/bin/env node
/**
 * backfill-genres.js — One-time migration script
 *
 * Reads all anime, TV, movie, and book entries from the database.
 * For each entry, fetches genres from the source URL or by searching
 * the title against TMDB / AniList / Google Books, then links them
 * via the junction tables.
 *
 * Usage:
 *   node scripts/backfill-genres.js [--dry-run] [--type movies|anime|tv|books|all]
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'lazarus.db');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const TIMEOUT = 15000;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const typeIdx = args.indexOf('--type');
const TYPE_FILTER = typeIdx !== -1 ? (args[typeIdx + 1] || 'all') : 'all';

const db = new Database(DB_PATH, { readonly: DRY_RUN });
if (!DRY_RUN) db.pragma('journal_mode = WAL');

// ─── Shared helpers ───────────────────────────────────────────────

function decodeHtml(str) {
  return (str || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, '');
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta\\s+property=["']og:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+name=["']og:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+property=["']twitter:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']*)["']`, 'i')
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtml(m[1]);
  }
  return null;
}

function fetchPage(url) {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT)
  }).then(async r => {
    if (!r.ok) return null;
    return r.text();
  }).catch(() => null);
}

function resolveGenres(scrapedGenres) {
  const genre_ids = [];
  const newGenres = [];
  const insertStmt = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
  const findStmt = db.prepare('SELECT id FROM genres WHERE LOWER(name) = LOWER(?)');
  for (const raw of scrapedGenres) {
    const name = (raw || '').trim();
    if (!name) continue;
    const normalized = name.replace(/\b\w/g, c => c.toUpperCase());
    let row = findStmt.get(normalized);
    if (!row) {
      if (DRY_RUN) {
        console.log(`    [dry-run] Would create genre: "${normalized}"`);
        genre_ids.push(-1);
        continue;
      }
      const info = insertStmt.run(normalized);
      genre_ids.push(Number(info.lastInsertRowid));
      newGenres.push({ id: Number(info.lastInsertRowid), name: normalized });
    } else {
      genre_ids.push(row.id);
    }
  }
  return { genre_ids, new_genres: newGenres };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── TMDB (Movies + TV) ─────────────────────────────────────────

function parseTmdbPage(html) {
  const genres = [];
  const genreMatches = html.matchAll(/<a\s+href="\/genre\/\d+[^"]*"[^>]*>([^<]+)<\/a>/gi);
  for (const m of genreMatches) {
    const name = decodeHtml(m[1]).trim();
    if (name && !genres.includes(name)) genres.push(name);
  }
  return genres;
}

async function scrapeTmdbUrl(url) {
  const enUrl = url.includes('?') ? url + '&language=en-US' : url + '?language=en-US';
  const html = await fetchPage(enUrl);
  if (!html) return [];
  return parseTmdbPage(html);
}

async function searchTmdbByName(title, type) {
  const query = encodeURIComponent(title.trim());
  const searchUrl = `https://www.themoviedb.org/search/${type}?query=${query}`;
  const html = await fetchPage(searchUrl);
  if (!html) return null;

  const pattern = type === 'movie'
    ? /<a[^>]*href="\/movie\/(\d+)-([^"]*)"[^>]*>/gi
    : /<a[^>]*href="\/tv\/(\d+)-([^"]*)"[^>]*>/gi;
  const m = pattern.exec(html);
  if (!m) return null;

  const slug = m[2];
  const resultUrl = `https://www.themoviedb.org/${type}/${m[1]}-${slug}`;
  return resultUrl;
}

async function fetchMovieGenres(title, sourceUrl) {
  if (sourceUrl && sourceUrl.includes('themoviedb.org')) {
    return scrapeTmdbUrl(sourceUrl);
  }
  const url = await searchTmdbByName(title, 'movie');
  if (url) return scrapeTmdbUrl(url);
  return [];
}

async function fetchTvGenres(title, sourceUrl) {
  if (sourceUrl && sourceUrl.includes('themoviedb.org')) {
    return scrapeTmdbUrl(sourceUrl);
  }
  const url = await searchTmdbByName(title, 'tv');
  if (url) return scrapeTmdbUrl(url);
  return [];
}

// ─── Jikan (Anime — MyAnimeList API v4) ────────────────────────

function normalizeForMatch(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function searchJikanByTitle(title, _attempt = 0) {
  const MAX_RETRIES = 3;
  try {
    const encoded = encodeURIComponent(title);
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encoded}&limit=5`, {
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (res.status === 429 || res.status >= 500) {
      if (_attempt < MAX_RETRIES) {
        await sleep(res.status === 429 ? 1000 + _attempt * 500 : 2000 + _attempt * 1000);
        return searchJikanByTitle(title, _attempt + 1);
      }
      return [];
    }
    if (!res.ok) return [];
    const { data } = await res.json();

    // 1) Try exact match first
    const normalised = title.toLowerCase().trim();
    let match = data.find(a => {
      const t = (a.title || '').toLowerCase().trim();
      const tEn = (a.title_english || '').toLowerCase().trim();
      return t === normalised || tEn === normalised;
    });

    // 2) Fallback: normalized alphanumeric comparison (handles romanization differences)
    if (!match) {
      const norm = normalizeForMatch(title);
      match = data.find(a => {
        const t = normalizeForMatch(a.title);
        const tEn = normalizeForMatch(a.title_english);
        return t.includes(norm) || norm.includes(t) || tEn.includes(norm) || norm.includes(tEn);
      });
    }

    if (!match) return [];
    return (match.genres || []).map(g => g.name).filter(Boolean);
  } catch { return []; }
}

async function fetchAnimeGenres(title, _sourceUrl) {
  if (DRY_RUN) return searchJikanByTitle(title);
  return searchJikanByTitle(title);
}

// ─── Google Books ────────────────────────────────────────────────

async function searchGoogleBooksGenres(title) {
  const query = encodeURIComponent(title.trim());
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) return [];
    const body = await res.json();
    const item = body.items?.[0];
    return item?.volumeInfo?.categories || [];
  } catch { return []; }
}

async function fetchBookGenres(title, sourceUrl) {
  // If it's a Google Books URL, try to extract the volume ID and fetch directly
  if (sourceUrl && /books\.google/i.test(sourceUrl)) {
    const volMatch = sourceUrl.match(/id=([^&]+)/);
    if (volMatch) {
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volMatch[1]}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT)
        });
        if (res.ok) {
          const body = await res.json();
          const cats = body.volumeInfo?.categories || [];
          if (cats.length > 0) return cats;
        }
      } catch {}
    }
  }
  return searchGoogleBooksGenres(title);
}

// ─── Main ────────────────────────────────────────────────────────

function linkGenres(table, entityIdCol, entityId, genreIds) {
  if (DRY_RUN) {
    console.log(`    [dry-run] Would link ${genreIds.length} genres to ${table} id=${entityId}`);
    return;
  }
  const delStmt = db.prepare(`DELETE FROM ${table} WHERE ${entityIdCol} = ?`);
  const insStmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${entityIdCol}, genre_id) VALUES (?, ?)`);
  delStmt.run(entityId);
  for (const gid of genreIds) {
    if (gid > 0) insStmt.run(entityId, gid);
  }
}

const STATS = { processed: 0, linked: 0, skipped: 0, errors: 0, created: 0 };

async function processSection(label, table, idCol, titleCol, urlCol, fetchFn) {
  if (TYPE_FILTER !== 'all' && TYPE_FILTER !== label) return;

  console.log(`\n── ${label.toUpperCase()} ──`);
  const urlSelect = urlCol ? `, ${urlCol}` : `, NULL`;
  const rows = db.prepare(`SELECT ${idCol}, ${titleCol}${urlSelect} AS source_url FROM ${table}`).all();
  console.log(`  Found ${rows.length} entries`);

  for (const row of rows) {
    const id = row[idCol];
    const title = row[titleCol];
    const sourceUrl = row.source_url;

    if (!title?.trim()) {
      console.log(`  [${id}] (no title) — skipped`);
      STATS.skipped++;
      continue;
    }

    try {
      const genreNames = await fetchFn(title, sourceUrl);
      if (genreNames.length === 0) {
        console.log(`  [${id}] "${title}" — no genres found`);
        STATS.skipped++;
        continue;
      }

      const { genre_ids, new_genres } = resolveGenres(genreNames);
      STATS.created += new_genres.length;
      linkGenres(`${table.replace('anime_series', 'anime').replace('tv_shows', 'tv_show').replace('movies', 'movie').replace('book_series', 'book')}_genres`,
        label === 'anime' ? 'anime_id' : label === 'tv' ? 'show_id' : label === 'movies' ? 'movie_id' : 'book_id',
        id, genre_ids);

      const genreLabels = genreNames.join(', ');
      console.log(`  [${id}] "${title}" → ${genreNames.length} genre(s): ${genreLabels}`);
      STATS.processed++;
      STATS.linked += genreNames.length;
    } catch (err) {
      console.log(`  [${id}] "${title}" — ERROR: ${err.message}`);
      STATS.errors++;
    }

    await sleep(label === 'anime' ? 400 : 300);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Genre Backfill Script');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Filter: ${TYPE_FILTER}`);
  console.log('═══════════════════════════════════════════');

  await processSection('movies', 'movies', 'id', 'title', 'source_url', fetchMovieGenres);
  await processSection('tv', 'tv_shows', 'id', 'title', 'source_url', fetchTvGenres);
  await processSection('anime', 'anime_series', 'id', 'title', null, fetchAnimeGenres);
  await processSection('books', 'book_series', 'id', 'title', 'source_url', fetchBookGenres);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Summary');
  console.log(`  Processed: ${STATS.processed} entries`);
  console.log(`  Linked:    ${STATS.linked} genre associations`);
  console.log(`  Created:   ${STATS.created} new genres`);
  console.log(`  Skipped:   ${STATS.skipped} (no genres found)`);
  console.log(`  Errors:    ${STATS.errors}`);
  console.log('═══════════════════════════════════════════');

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
