import db from './db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM anime_seasons ORDER BY anime_id, season_number ASC'),
  getByAnime: db.prepare('SELECT * FROM anime_seasons WHERE anime_id = ? ORDER BY season_number ASC'),
  getById: db.prepare('SELECT * FROM anime_seasons WHERE id = ?'),
  create: db.prepare('INSERT INTO anime_seasons (anime_id, season_number, total_episodes, episodes_watched) VALUES (@anime_id, @season_number, @total_episodes, @episodes_watched)'),
  update: db.prepare('UPDATE anime_seasons SET season_number = @season_number, total_episodes = @total_episodes, episodes_watched = @episodes_watched WHERE id = @id'),
  remove: db.prepare('DELETE FROM anime_seasons WHERE id = ?'),
  updateWatched: db.prepare('UPDATE anime_seasons SET episodes_watched = @episodes_watched WHERE id = @id'),
  touchParent: db.prepare("UPDATE anime_series SET updated_at = datetime('now') WHERE id = ?")
};

export function getAll() {
  return stmts.getAll.all();
}

export function getByAnime(animeId) {
  return stmts.getByAnime.all(animeId);
}

function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    anime_id: data.anime_id,
    season_number: data.season_number,
    total_episodes: data.total_episodes || 0,
    episodes_watched: data.episodes_watched || 0
  });
  stmts.touchParent.run(data.anime_id);
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    season_number: data.season_number ?? existing.season_number,
    total_episodes: data.total_episodes ?? existing.total_episodes,
    episodes_watched: data.episodes_watched ?? existing.episodes_watched,
    id: id
  });
  stmts.touchParent.run(existing.anime_id);
  return getById(id);
}

export function incrementWatched(id) {
  const season = getById(id);
  if (!season) return null;
  const next = Math.min(season.episodes_watched + 1, season.total_episodes);
  stmts.updateWatched.run({ episodes_watched: next, id });
  stmts.touchParent.run(season.anime_id);
  return getById(id);
}

export function decrementWatched(id) {
  const season = getById(id);
  if (!season) return null;
  const prev = Math.max(season.episodes_watched - 1, 0);
  stmts.updateWatched.run({ episodes_watched: prev, id });
  stmts.touchParent.run(season.anime_id);
  return getById(id);
}

export function markAllWatched(id) {
  const season = getById(id);
  if (!season) return null;
  stmts.updateWatched.run({ episodes_watched: season.total_episodes, id });
  stmts.touchParent.run(season.anime_id);
  return getById(id);
}

export function bulkCreate(animeId, seasons) {
  const insert = db.prepare('INSERT OR IGNORE INTO anime_seasons (anime_id, season_number, total_episodes, episodes_watched) VALUES (?, ?, ?, 0)');
  const txn = db.transaction((items) => {
    for (const s of items) {
      insert.run(animeId, s.season_number, s.total_episodes || 0);
    }
  });
  txn(seasons);
  return getByAnime(animeId);
}

export function remove(id) {
  const season = getById(id);
  if (!season) return null;
  stmts.remove.run(id);
  stmts.touchParent.run(season.anime_id);
  return season;
}
