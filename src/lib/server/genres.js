import db from './db.js';

const CYCLE_ICONS = ['Tag', 'Bookmark', 'Sparkles', 'Star', 'Heart', 'Flame', 'Zap', 'Moon', 'Sun', 'Cloud', 'Droplet', 'Shield', 'Sword', 'Ghost', 'Skull', 'Gem', 'Crown', 'Scroll', 'Music', 'Palette'];
const CYCLE_COLORS = ['--cyan', '--cyan-light', '--cyan-dark', '--blue', '--blue-light', '--blue-dark', '--indigo', '--purple', '--magenta', '--pink', '--amber', '--amber-light', '--amber-dark', '--green', '--green-light', '--green-dark', '--red', '--red-light', '--red-dark', '--teal'];

let countStmtGenre = db.prepare('SELECT COUNT(*) as cnt FROM genres');

function getNextIconColor() {
  const { cnt } = countStmtGenre.get();
  return {
    icon: CYCLE_ICONS[cnt % CYCLE_ICONS.length],
    color: CYCLE_COLORS[cnt % CYCLE_COLORS.length]
  };
}

const stmts = {
  getAll: db.prepare('SELECT * FROM genres ORDER BY name ASC'),
  getById: db.prepare('SELECT * FROM genres WHERE id = ?'),
  create: db.prepare('INSERT INTO genres (name, icon, color, description) VALUES (@name, @icon, @color, @description)'),
  update: db.prepare('UPDATE genres SET name = @name, icon = @icon, color = @color, description = @description WHERE id = @id'),
  remove: db.prepare('DELETE FROM genres WHERE id = ?'),
  unlinkBooks: db.prepare('DELETE FROM book_genres WHERE genre_id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const next = getNextIconColor();
  const info = stmts.create.run({
    name: data.name.trim(),
    icon: data.icon || next.icon,
    color: data.color || next.color,
    description: data.description || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name?.trim() ?? existing.name,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    description: data.description ?? existing.description,
    id
  });
  return getById(id);
}

export function remove(id) {
  const genre = getById(id);
  if (!genre) return null;
  stmts.unlinkBooks.run(id);
  stmts.remove.run(id);
  return genre;
}
