import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';

const SECTIONS = {
  anime: { table: 'anime_series', label: 'Anime' },
  movies: { table: 'movies', label: 'Movies' },
  tv: { table: 'tv_shows', label: 'TV Shows' },
  books: { table: 'book_series', label: 'Books' }
};

const PER_SECTION = 5;
const TOTAL = 12;

export async function GET({ url }) {
  const q = (url.searchParams.get('q') || '').trim();
  const section = url.searchParams.get('section') || '';

  if (!q) return json({ results: [] });

  const like = `%${q}%`;
  const prefix = `${q}%`;
  const results = [];
  const targets = SECTIONS[section] ? { [section]: SECTIONS[section] } : SECTIONS;

  for (const [key, meta] of Object.entries(targets)) {
    const rows = db.prepare(`
      SELECT id, title, cover_url
      FROM ${meta.table}
      WHERE title LIKE @like COLLATE NOCASE
      ORDER BY CASE WHEN title LIKE @prefix COLLATE NOCASE THEN 0 ELSE 1 END, title
      LIMIT ${PER_SECTION}
    `).all({ like, prefix });

    for (const row of rows) {
      results.push({
        section: key,
        id: row.id,
        title: row.title,
        cover_url: row.cover_url || ''
      });
      if (results.length >= TOTAL) break;
    }
    if (results.length >= TOTAL) break;
  }

  return json({ results });
}
