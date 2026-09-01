import db from './db.js';
import { bulkCreate } from './tv-show-seasons.js';

const stmts = {
  getByTitle: db.prepare('SELECT id FROM tv_shows WHERE title = ? COLLATE NOCASE'),
  getAll: db.prepare(`
    SELECT ts.*,
      (SELECT COUNT(*) FROM tv_show_seasons WHERE show_id = ts.id) as season_count,
      (SELECT COALESCE(SUM(episodes_watched), 0) FROM tv_show_seasons WHERE show_id = ts.id) as total_watched,
      (SELECT COALESCE(SUM(total_episodes), 0) FROM tv_show_seasons WHERE show_id = ts.id) as total_episodes
    FROM tv_shows ts ORDER BY ts.updated_at DESC
  `),
  getById: db.prepare(`
    SELECT ts.*,
      (SELECT COUNT(*) FROM tv_show_seasons WHERE show_id = ts.id) as season_count,
      (SELECT COALESCE(SUM(episodes_watched), 0) FROM tv_show_seasons WHERE show_id = ts.id) as total_watched,
      (SELECT COALESCE(SUM(total_episodes), 0) FROM tv_show_seasons WHERE show_id = ts.id) as total_episodes
    FROM tv_shows ts WHERE ts.id = ?
  `),
  create: db.prepare('INSERT INTO tv_shows (title, cover_url, rating, status, notes, synopsis, source_url) VALUES (@title, @cover_url, @rating, @status, @notes, @synopsis, @source_url)'),
  update: db.prepare('UPDATE tv_shows SET title = @title, cover_url = @cover_url, rating = @rating, status = @status, notes = @notes, synopsis = @synopsis, source_url = @source_url, updated_at = datetime(\'now\') WHERE id = @id'),
  remove: db.prepare('DELETE FROM tv_shows WHERE id = ?'),
  getGenres: db.prepare(`
    SELECT g.* FROM genres g
    JOIN tv_show_genres tsg ON tsg.genre_id = g.id
    WHERE tsg.show_id = ? ORDER BY g.name ASC
  `),
  setGenres: db.prepare('DELETE FROM tv_show_genres WHERE show_id = ?'),
  addGenre: db.prepare('INSERT OR IGNORE INTO tv_show_genres (show_id, genre_id) VALUES (?, ?)')
};

export function getAll() {
  const list = stmts.getAll.all();
  for (const item of list) {
    item.genres = stmts.getGenres.all(item.id);
  }
  return list;
}

export function getById(id) {
  const show = stmts.getById.get(id) || null;
  if (show) {
    show.genres = stmts.getGenres.all(id);
  }
  return show;
}

export function create(data) {
  const existing = stmts.getByTitle.get(data.title);
  if (existing) return { error: true, message: `TV Show "${data.title}" already exists.` };
  const info = stmts.create.run({
    title: data.title,
    cover_url: data.cover_url || '',
    rating: data.rating || null,
    status: data.status || 'not_started',
    notes: data.notes || '',
    synopsis: data.synopsis || '',
    source_url: data.source_url || ''
  });
  const id = info.lastInsertRowid;
  if (data.genre_ids && data.genre_ids.length) {
    stmts.setGenres.run(id);
    for (const gid of data.genre_ids) {
      stmts.addGenre.run(id, gid);
    }
  }
  if (data.seasons && data.seasons.length) {
    bulkCreate(id, data.seasons);
  }
  return getById(id);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  const newTitle = data.title ?? existing.title;
  if (newTitle !== existing.title) {
    const dup = stmts.getByTitle.get(newTitle);
    if (dup && dup.id !== id) return { error: true, message: `TV Show "${newTitle}" already exists.` };
  }
  stmts.update.run({
    title: data.title ?? existing.title,
    cover_url: data.cover_url ?? existing.cover_url,
    rating: data.rating ?? existing.rating,
    status: data.status ?? existing.status,
    notes: data.notes ?? existing.notes,
    synopsis: data.synopsis ?? existing.synopsis,
    source_url: data.source_url ?? existing.source_url,
    id: id
  });
  if (data.genre_ids !== undefined) {
    stmts.setGenres.run(id);
    for (const gid of data.genre_ids) {
      stmts.addGenre.run(id, gid);
    }
  }
  return getById(id);
}

export function remove(id) {
  const show = getById(id);
  if (!show) return null;
  stmts.remove.run(id);
  return show;
}

export function removeMultiple(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM tv_shows WHERE id IN (${placeholders})`).run(...ids);
  return ids;
}
