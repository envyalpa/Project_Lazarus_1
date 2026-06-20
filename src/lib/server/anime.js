import db from './db.js';
import { bulkCreate } from './anime-seasons.js';

const stmts = {
  getAll: db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM anime_seasons WHERE anime_id = a.id) as season_count,
      (SELECT COALESCE(SUM(episodes_watched), 0) FROM anime_seasons WHERE anime_id = a.id) as total_watched,
      (SELECT COALESCE(SUM(total_episodes), 0) FROM anime_seasons WHERE anime_id = a.id) as total_episodes
    FROM anime_series a ORDER BY a.updated_at DESC
  `),
  getById: db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM anime_seasons WHERE anime_id = a.id) as season_count,
      (SELECT COALESCE(SUM(episodes_watched), 0) FROM anime_seasons WHERE anime_id = a.id) as total_watched,
      (SELECT COALESCE(SUM(total_episodes), 0) FROM anime_seasons WHERE anime_id = a.id) as total_episodes
    FROM anime_series a WHERE a.id = ?
  `),
  create: db.prepare('INSERT INTO anime_series (title, cover_url, rating, status, notes, synopsis) VALUES (@title, @cover_url, @rating, @status, @notes, @synopsis)'),
  update: db.prepare('UPDATE anime_series SET title = @title, cover_url = @cover_url, rating = @rating, status = @status, notes = @notes, synopsis = @synopsis, updated_at = datetime(\'now\') WHERE id = @id'),
  remove: db.prepare('DELETE FROM anime_series WHERE id = ?'),
  getGenres: db.prepare(`
    SELECT g.* FROM genres g
    JOIN anime_genres ag ON ag.genre_id = g.id
    WHERE ag.anime_id = ? ORDER BY g.name ASC
  `),
  setGenres: db.prepare('DELETE FROM anime_genres WHERE anime_id = ?'),
  addGenre: db.prepare('INSERT OR IGNORE INTO anime_genres (anime_id, genre_id) VALUES (?, ?)')
};

export function getAll() {
  const list = stmts.getAll.all();
  for (const item of list) {
    item.genres = stmts.getGenres.all(item.id);
  }
  return list;
}

export function getById(id) {
  const anime = stmts.getById.get(id) || null;
  if (anime) {
    anime.genres = stmts.getGenres.all(id);
  }
  return anime;
}

export function create(data) {
  const info = stmts.create.run({
    title: data.title,
    cover_url: data.cover_url || '',
    rating: data.rating || null,
    status: data.status || 'not_started',
    notes: data.notes || '',
    synopsis: data.synopsis || ''
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
  stmts.update.run({
    title: data.title ?? existing.title,
    cover_url: data.cover_url ?? existing.cover_url,
    rating: data.rating ?? existing.rating,
    status: data.status ?? existing.status,
    notes: data.notes ?? existing.notes,
    synopsis: data.synopsis ?? existing.synopsis,
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
  const anime = getById(id);
  if (!anime) return null;
  stmts.remove.run(id);
  return anime;
}
