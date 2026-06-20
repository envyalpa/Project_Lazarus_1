import db from '../db.js';

const removeNotes = db.prepare('DELETE FROM academy_notes WHERE area_id = ?');
const removeCourses = db.prepare('DELETE FROM academy_courses WHERE area_id = ?');

const stmts = {
  getAll: db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM academy_courses WHERE area_id = a.id) AS course_count,
      (SELECT COUNT(*) FROM academy_notes WHERE area_id = a.id) AS note_count
    FROM academy_areas a
    ORDER BY a.name ASC
  `),
  getById: db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM academy_courses WHERE area_id = a.id) AS course_count,
      (SELECT COUNT(*) FROM academy_notes WHERE area_id = a.id) AS note_count
    FROM academy_areas a
    WHERE a.id = ?
  `),
  create: db.prepare('INSERT INTO academy_areas (name, description, icon, color, cover_url, priority) VALUES (@name, @description, @icon, @color, @cover_url, @priority)'),
  update: db.prepare('UPDATE academy_areas SET name = @name, description = @description, icon = @icon, color = @color, cover_url = @cover_url, priority = @priority WHERE id = @id'),
  remove: db.prepare('DELETE FROM academy_areas WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    description: data.description || '',
    icon: data.icon || 'BookOpen',
    color: data.color || '--cyan',
    cover_url: data.cover_url || '',
    priority: data.priority || 'medium'
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    cover_url: data.cover_url ?? existing.cover_url,
    priority: data.priority ?? existing.priority,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const area = getById(id);
  if (!area) return null;
  const tx = db.transaction((id) => {
    removeNotes.run(id);
    removeCourses.run(id);
    stmts.remove.run(id);
  });
  tx(id);
  return area;
}
