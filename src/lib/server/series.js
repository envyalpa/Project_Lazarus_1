import db from './db.js';

const CYCLE_ICONS = ['BookMarked', 'BookOpen', 'Library', 'BookA', 'BookHeart', 'Sparkles', 'Sword', 'Dragon', 'Ghost', 'Heart', 'Star', 'Moon', 'Sun', 'Cloud', 'Zap', 'Flame', 'Scroll', 'Puzzle', 'Compass', 'Map'];
const CYCLE_COLORS = ['--cyan', '--cyan-light', '--cyan-dark', '--blue', '--blue-light', '--blue-dark', '--indigo', '--purple', '--magenta', '--pink', '--amber', '--amber-light', '--amber-dark', '--green', '--green-light', '--green-dark', '--red', '--red-light', '--red-dark', '--teal'];

let countStmt = db.prepare('SELECT COUNT(*) as cnt FROM series');

function getNextIconColor() {
  const { cnt } = countStmt.get();
  return {
    icon: CYCLE_ICONS[cnt % CYCLE_ICONS.length],
    color: CYCLE_COLORS[cnt % CYCLE_COLORS.length]
  };
}

const stmts = {
  getAll: db.prepare('SELECT * FROM series ORDER BY name ASC'),
  getById: db.prepare('SELECT * FROM series WHERE id = ?'),
  create: db.prepare('INSERT INTO series (name, total_volumes, icon, color, description) VALUES (@name, @total_volumes, @icon, @color, @description)'),
  update: db.prepare('UPDATE series SET name = @name, total_volumes = @total_volumes, icon = @icon, color = @color, description = @description WHERE id = @id'),
  remove: db.prepare('DELETE FROM series WHERE id = ?'),
  unlinkBooks: db.prepare('UPDATE book_series SET series_id = NULL WHERE series_id = ?')
};

export function getAll() {
  return stmts.getAll.all() || [];
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const next = getNextIconColor();
  const info = stmts.create.run({
    name: data.name.trim(),
    total_volumes: data.total_volumes || 0,
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
    name: data.name ?? existing.name,
    total_volumes: data.total_volumes ?? existing.total_volumes,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    description: data.description ?? existing.description,
    id
  });
  return getById(id);
}

export function remove(id) {
  const item = getById(id);
  if (!item) return null;
  stmts.unlinkBooks.run(id);
  stmts.remove.run(id);
  return item;
}
