import db from '../db.js';

const stmts = {
  getAll: db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.id DESC
  `),
  getRecent: db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.id DESC LIMIT 10
  `),
  getById: db.prepare('SELECT * FROM transactions WHERE id = ?'),
  create: db.prepare(`INSERT INTO transactions (date, title, amount, type, category_id, paid_by, paid_to, paid_for, notes)
    VALUES (@date, @title, @amount, @type, @category_id, @paid_by, @paid_to, @paid_for, @notes)`),
  update: db.prepare(`UPDATE transactions SET date = @date, title = @title, amount = @amount,
    type = @type, category_id = @category_id, paid_by = @paid_by, paid_to = @paid_to,
    paid_for = @paid_for, notes = @notes WHERE id = @id`),
  remove: db.prepare('DELETE FROM transactions WHERE id = ?'),
  removeAll: db.prepare('DELETE FROM transactions')
};

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange(dateStr) {
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = parts[1] ? Number(parts[1]) : (parts[0].length === 4 ? 1 : 0);
  const monthStart = y + '-' + String(m).padStart(2, '0') + '-01';
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
  return { start: monthStart, end: monthEnd };
}

function getYearRange(dateStr) {
  const y = dateStr.split('-')[0];
  return { start: y + '-01-01', end: y + '-12-31' };
}

const stmtCache = new Map();

function getCachedStmt(sql) {
  if (!stmtCache.has(sql)) {
    stmtCache.set(sql, db.prepare(sql));
  }
  return stmtCache.get(sql);
}

export function getFiltered(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.q) {
    clauses.push('t.title LIKE @q');
    params.q = '%' + filters.q + '%';
  } else {
    if (filters.startDate && filters.endDate) {
      clauses.push('t.date >= @startDate AND t.date <= @endDate');
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    } else if (filters.range) {
      const refDate = filters.date || new Date().toISOString().slice(0, 10);
      let range;
      if (filters.range === 'day') {
        range = { start: refDate, end: refDate };
      } else if (filters.range === 'week') {
        range = getWeekRange(refDate);
      } else if (filters.range === 'month') {
        range = getMonthRange(refDate);
      } else if (filters.range === 'year') {
        range = getYearRange(refDate);
      }
      if (range) {
        clauses.push('t.date >= @startDate AND t.date <= @endDate');
        params.startDate = range.start;
        params.endDate = range.end;
      }
    }
  }

  if (filters.type) {
    clauses.push('t.type = @type');
    params.type = filters.type;
  }

  if (filters.entity) {
    clauses.push('(t.paid_by = @entity OR t.paid_to = @entity)');
    params.entity = filters.entity;
  }

  if (filters.category_id) {
    clauses.push('t.category_id = @category_id');
    params.category_id = Number(filters.category_id);
  }

  if (filters.paid_by) {
    clauses.push('t.paid_by = @paid_by');
    params.paid_by = filters.paid_by;
  }

  if (filters.paid_to) {
    clauses.push('t.paid_to = @paid_to');
    params.paid_to = filters.paid_to;
  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const sql = `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ${where}
    ORDER BY t.date DESC, t.id DESC`;
  return getCachedStmt(sql).all(params);
}

export function getAll() {
  return stmts.getAll.all();
}

export function getRecent(limit = 10) {
  return stmts.getRecent.all();
}

export function getById(id) {
  return stmts.getById.get(id) || null;
}

export function create(data) {
  const info = stmts.create.run({
    date: data.date,
    title: data.title,
    amount: data.amount,
    type: data.type || 'expense',
    category_id: data.category_id || null,
    paid_by: data.paid_by || '',
    paid_to: data.paid_to || '',
    paid_for: data.paid_for || '',
    notes: data.notes || ''
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    date: data.date ?? existing.date,
    title: data.title ?? existing.title,
    amount: data.amount ?? existing.amount,
    type: data.type ?? existing.type,
    category_id: data.category_id ?? existing.category_id,
    paid_by: data.paid_by ?? existing.paid_by,
    paid_to: data.paid_to ?? existing.paid_to,
    paid_for: data.paid_for ?? existing.paid_for,
    notes: data.notes ?? existing.notes,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const t = getById(id);
  if (!t) return null;
  stmts.remove.run(id);
  return t;
}

export function removeAll() {
  const info = stmts.removeAll.run();
  return { deleted: info.changes };
}

export function removeMultiple(ids) {
  if (!ids || ids.length === 0) return { deleted: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`);
  const info = stmt.run(...ids);
  return { deleted: info.changes };
}

export function updateMultiple(ids, data) {
  if (!ids || ids.length === 0) return { updated: 0 };
  const setClauses = [];
  const params = {};
  for (const key of Object.keys(data)) {
    setClauses.push(`${key} = @${key}`);
    params[key] = data[key];
  }
  if (setClauses.length === 0) return { updated: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`);
  const info = stmt.run(...Object.values(params), ...ids);
  return { updated: info.changes };
}
