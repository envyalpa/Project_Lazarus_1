import db from './db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM tv_show_seasons ORDER BY show_id, season_number ASC'),
  getByShow: db.prepare('SELECT * FROM tv_show_seasons WHERE show_id = ? ORDER BY season_number ASC'),
  getById: db.prepare('SELECT * FROM tv_show_seasons WHERE id = ?'),
  create: db.prepare('INSERT INTO tv_show_seasons (show_id, season_number, total_episodes, episodes_watched) VALUES (@show_id, @season_number, @total_episodes, @episodes_watched)'),
  update: db.prepare('UPDATE tv_show_seasons SET season_number = @season_number, total_episodes = @total_episodes, episodes_watched = @episodes_watched WHERE id = @id'),
  remove: db.prepare('DELETE FROM tv_show_seasons WHERE id = ?'),
  updateWatched: db.prepare('UPDATE tv_show_seasons SET episodes_watched = @episodes_watched WHERE id = @id'),
  touchParent: db.prepare("UPDATE tv_shows SET updated_at = datetime('now') WHERE id = ?")
};

export function getAll() {
  return stmts.getAll.all();
}

export function getByShow(showId) {
  return stmts.getByShow.all(showId);
}

function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    show_id: data.show_id,
    season_number: data.season_number,
    total_episodes: data.total_episodes || 0,
    episodes_watched: data.episodes_watched || 0
  });
  stmts.touchParent.run(data.show_id);
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
  stmts.touchParent.run(existing.show_id);
  return getById(id);
}

export function incrementWatched(id) {
  const season = getById(id);
  if (!season) return null;
  const next = Math.min(season.episodes_watched + 1, season.total_episodes);
  stmts.updateWatched.run({ episodes_watched: next, id });
  stmts.touchParent.run(season.show_id);
  return getById(id);
}

export function decrementWatched(id) {
  const season = getById(id);
  if (!season) return null;
  const prev = Math.max(season.episodes_watched - 1, 0);
  stmts.updateWatched.run({ episodes_watched: prev, id });
  stmts.touchParent.run(season.show_id);
  return getById(id);
}

export function markAllWatched(id) {
  const season = getById(id);
  if (!season) return null;
  stmts.updateWatched.run({ episodes_watched: season.total_episodes, id });
  stmts.touchParent.run(season.show_id);
  return getById(id);
}

export function bulkCreate(showId, seasons) {
  const insert = db.prepare('INSERT OR IGNORE INTO tv_show_seasons (show_id, season_number, total_episodes, episodes_watched) VALUES (?, ?, ?, 0)');
  const txn = db.transaction((items) => {
    for (const s of items) {
      insert.run(showId, s.season_number, s.total_episodes || 0);
    }
  });
  txn(seasons);
  return getByShow(showId);
}

export function remove(id) {
  const season = getById(id);
  if (!season) return null;
  stmts.remove.run(id);
  stmts.touchParent.run(season.show_id);
  return season;
}
