import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM categories ORDER BY name ASC'),
  getById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  create: db.prepare('INSERT INTO categories (name, icon, color, budget) VALUES (@name, @icon, @color, @budget)'),
  update: db.prepare('UPDATE categories SET name = @name, icon = @icon, color = @color, budget = @budget WHERE id = @id'),
  remove: db.prepare('DELETE FROM categories WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getAllWithSpending(startDate, endDate) {
  const rows = db.prepare(`
    SELECT c.*, COALESCE(SUM(t.amount), 0) as spent
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND t.date >= @start AND t.date <= @end AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all({ start: startDate, end: endDate });
  return rows;
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    icon: data.icon || 'Tag',
    color: data.color || '--cyan',
    budget: data.budget || 0
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    budget: data.budget ?? existing.budget,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const c = getById(id);
  if (!c) return null;
  stmts.remove.run(id);
  return c;
}
