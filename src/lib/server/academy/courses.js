import db from '../db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT c.*, a.name AS area_name
    FROM academy_courses c
    LEFT JOIN academy_areas a ON c.area_id = a.id
    ORDER BY c.name ASC
  `),
  getByArea: db.prepare(`
    SELECT c.*, a.name AS area_name
    FROM academy_courses c
    LEFT JOIN academy_areas a ON c.area_id = a.id
    WHERE c.area_id = ?
    ORDER BY c.name ASC
  `),
  getById: db.prepare(`
    SELECT c.*, a.name AS area_name
    FROM academy_courses c
    LEFT JOIN academy_areas a ON c.area_id = a.id
    WHERE c.id = ?
  `),
  create: db.prepare('INSERT INTO academy_courses (area_id, name, description, status, started_on, completed_on, course_url, cover_image) VALUES (@area_id, @name, @description, @status, @started_on, @completed_on, @course_url, @cover_image)'),
  update: db.prepare('UPDATE academy_courses SET area_id = @area_id, name = @name, description = @description, status = @status, started_on = @started_on, completed_on = @completed_on, course_url = @course_url, cover_image = @cover_image WHERE id = @id'),
  remove: db.prepare('DELETE FROM academy_courses WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getByArea(areaId) {
  return stmts.getByArea.all(areaId);
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    area_id: data.area_id || null,
    name: data.name,
    description: data.description || '',
    status: data.status || 'in-progress',
    started_on: data.started_on || '',
    completed_on: data.completed_on || '',
    course_url: data.course_url || '',
    cover_image: data.cover_image || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    area_id: data.area_id ?? existing.area_id,
    name: data.name ?? existing.name,
    description: data.description ?? existing.description,
    status: data.status ?? existing.status,
    started_on: data.started_on ?? existing.started_on,
    completed_on: data.completed_on ?? existing.completed_on,
    course_url: data.course_url ?? existing.course_url,
    cover_image: data.cover_image ?? existing.cover_image,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const course = getById(id);
  if (!course) return null;
  stmts.remove.run(id);
  return course;
}
