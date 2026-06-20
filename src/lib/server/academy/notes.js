import db from '../db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT n.*, a.name AS area_name, c.name AS course_name
    FROM academy_notes n
    LEFT JOIN academy_areas a ON n.area_id = a.id
    LEFT JOIN academy_courses c ON n.course_id = c.id
    ORDER BY n.updated_at DESC
  `),
  getByArea: db.prepare(`
    SELECT n.*, a.name AS area_name, c.name AS course_name
    FROM academy_notes n
    LEFT JOIN academy_areas a ON n.area_id = a.id
    LEFT JOIN academy_courses c ON n.course_id = c.id
    WHERE n.area_id = ?
    ORDER BY n.updated_at DESC
  `),
  getByCourse: db.prepare(`
    SELECT n.*, a.name AS area_name, c.name AS course_name
    FROM academy_notes n
    LEFT JOIN academy_areas a ON n.area_id = a.id
    LEFT JOIN academy_courses c ON n.course_id = c.id
    WHERE n.course_id = ?
    ORDER BY n.updated_at DESC
  `),
  getById: db.prepare(`
    SELECT n.*, a.name AS area_name, c.name AS course_name
    FROM academy_notes n
    LEFT JOIN academy_areas a ON n.area_id = a.id
    LEFT JOIN academy_courses c ON n.course_id = c.id
    WHERE n.id = ?
  `),
  create: db.prepare('INSERT INTO academy_notes (area_id, course_id, title, content, view_mode) VALUES (@area_id, @course_id, @title, @content, @view_mode)'),
  update: db.prepare('UPDATE academy_notes SET area_id = @area_id, course_id = @course_id, title = @title, content = @content, view_mode = @view_mode WHERE id = @id'),
  updateContent: db.prepare('UPDATE academy_notes SET content = @content, updated_at = datetime(\'now\') WHERE id = @id'),
  remove: db.prepare('DELETE FROM academy_notes WHERE id = ?')
};

export function getAll() {
  return stmts.getAll.all();
}

export function getByArea(areaId) {
  return stmts.getByArea.all(areaId);
}

export function getByCourse(courseId) {
  return stmts.getByCourse.all(courseId);
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    area_id: data.area_id || null,
    course_id: data.course_id || null,
    title: data.title,
    content: data.content || '{}',
    view_mode: data.view_mode || 'wide'
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    area_id: data.area_id ?? existing.area_id,
    course_id: data.course_id ?? existing.course_id,
    title: data.title ?? existing.title,
    content: data.content ?? existing.content,
    view_mode: data.view_mode ?? existing.view_mode,
    id: id
  });
  return getById(id);
}

export function updateContent(id, content) {
  stmts.updateContent.run({ content: content, id: id });
  return getById(id);
}

export function remove(id) {
  const note = getById(id);
  if (!note) return null;
  stmts.remove.run(id);
  return note;
}
