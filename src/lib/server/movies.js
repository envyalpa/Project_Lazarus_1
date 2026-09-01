import db from './db.js';

const stmts = {
  getByTitle: db.prepare('SELECT id FROM movies WHERE title = ? COLLATE NOCASE'),
  getAll: db.prepare('SELECT m.* FROM movies m ORDER BY m.updated_at DESC'),
  getById: db.prepare('SELECT m.* FROM movies m WHERE m.id = ?'),
  create: db.prepare('INSERT INTO movies (title, year, cover_url, rating, status, notes, synopsis, source_url) VALUES (@title, @year, @cover_url, @rating, @status, @notes, @synopsis, @source_url)'),
  update: db.prepare('UPDATE movies SET title = @title, year = @year, cover_url = @cover_url, rating = @rating, status = @status, notes = @notes, synopsis = @synopsis, source_url = @source_url, updated_at = datetime(\'now\') WHERE id = @id'),
  remove: db.prepare('DELETE FROM movies WHERE id = ?'),
  getGenres: db.prepare(`
    SELECT g.* FROM genres g
    JOIN movie_genres mg ON mg.genre_id = g.id
    WHERE mg.movie_id = ? ORDER BY g.name ASC
  `),
  setGenres: db.prepare('DELETE FROM movie_genres WHERE movie_id = ?'),
  addGenre: db.prepare('INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)')
};

export function getAll() {
  const list = stmts.getAll.all();
  for (const item of list) {
    item.genres = stmts.getGenres.all(item.id);
  }
  return list;
}

export function getById(id) {
  const movie = stmts.getById.get(id) || null;
  if (movie) {
    movie.genres = stmts.getGenres.all(id);
  }
  return movie;
}

export function create(data) {
  const existing = stmts.getByTitle.get(data.title);
  if (existing) return { error: true, message: `Movie "${data.title}" already exists.` };
  const info = stmts.create.run({
    title: data.title,
    year: data.year || null,
    cover_url: data.cover_url || '',
    rating: data.rating || null,
    status: data.status || 'planned',
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
  return getById(id);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  const newTitle = data.title ?? existing.title;
  if (newTitle !== existing.title) {
    const dup = stmts.getByTitle.get(newTitle);
    if (dup && dup.id !== id) return { error: true, message: `Movie "${newTitle}" already exists.` };
  }
  stmts.update.run({
    title: data.title ?? existing.title,
    year: data.year ?? existing.year,
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
  const movie = getById(id);
  if (!movie) return null;
  stmts.remove.run(id);
  return movie;
}

export function removeMultiple(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM movies WHERE id IN (${placeholders})`).run(...ids);
  return ids;
}
