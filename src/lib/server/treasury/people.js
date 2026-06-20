import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM people ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM people WHERE id = ?'),
  create: db.prepare('INSERT INTO people (name, balance, relationship, icon, color, show_in_summary) VALUES (@name, 0, @relationship, @icon, @color, @show_in_summary)'),
  update: db.prepare('UPDATE people SET name = @name, balance = 0, relationship = @relationship, icon = @icon, color = @color, show_in_summary = @show_in_summary WHERE id = @id'),
  remove: db.prepare('DELETE FROM people WHERE id = ?')
};

function getSplitCount(paid_for) {
  if (!paid_for) return 1;
  return (paid_for.match(/,/g) || []).length + 1;
}

function computeBalance(name) {
  // paidByAmount: gross amount this person paid out as the payer.
  // If they paid for others AND themselves (Me in split), deduct their own share.
  // If they paid purely for others (no Me in split), full amount counts as what others owe them.
  const paidByRow = db.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN type = 'expense' AND paid_for LIKE '%Me%' AND paid_for LIKE '%,%'
          THEN amount / MAX(1, LENGTH(paid_for) - LENGTH(REPLACE(paid_for, ',', '')) + 1)
        ELSE amount
      END
    ), 0) as val
    FROM transactions WHERE paid_by = ?
  `).get(name);
  const paidByAmount = paidByRow?.val || 0;

  // paidBackSplit: what Me paid on behalf of this person.
  // Divisor = number of people in paid_for (correctly handles Family,Wife = /2
  // and Me,Family,Wife = /3 without needing Me to be present).
  const paidBackSplitRow = db.prepare(`
    SELECT COALESCE(SUM(
      amount / MAX(1, LENGTH(paid_for) - LENGTH(REPLACE(paid_for, ',', '')) + 1)
    ), 0) as val
    FROM transactions
    WHERE type = 'expense'
      AND paid_for LIKE '%' || ? || '%'
      AND paid_by NOT IN ('Family', 'Sister', 'Wife')
      AND paid_by != '' AND paid_by IS NOT NULL
      AND paid_by != ?
  `).get(name, name);
  const paidBackSplit = paidBackSplitRow?.val || 0;

  const paidToRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as val FROM transactions WHERE paid_to = ? AND paid_by != ?`).get(name, name);
  const paidBackDirect = paidToRow?.val || 0;

  const initialRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as val FROM transactions WHERE paid_by = ?`).get(name);
  const initialAmount = initialRow?.val || 0;

  const splitRow = db.prepare(`
    SELECT COALESCE(SUM(amount / MAX(1, LENGTH(paid_for) - LENGTH(REPLACE(paid_for, ',', '')) + 1)), 0) as val
    FROM transactions
    WHERE paid_by = ? AND type = 'expense' AND paid_for LIKE '%Me%'
  `).get(name);
  const splitAmount = splitRow?.val || 0;

  const balance = paidBackDirect + paidBackSplit - paidByAmount;

  return { balance, paidByAmount, paidBackDirect, paidBackSplit, initialAmount, splitAmount };
}

export function getAll() {
  const people = stmts.getAll.all();
  for (const p of people) {
    const result = computeBalance(p.name);
    p.balance = result.balance;
    p.paidByAmount = result.paidByAmount;
    p.paidBackDirect = result.paidBackDirect;
    p.paidBackSplit = result.paidBackSplit;
    p.initialAmount = result.initialAmount;
    p.splitAmount = result.splitAmount;
  }
  return people;
}

export function getById(id) {
  const p = stmts.getById.get(id) || null;
  if (p) {
    const result = computeBalance(p.name);
    p.balance = result.balance;
    p.paidByAmount = result.paidByAmount;
    p.paidBackDirect = result.paidBackDirect;
    p.paidBackSplit = result.paidBackSplit;
    p.initialAmount = result.initialAmount;
    p.splitAmount = result.splitAmount;
  }
  return p;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    relationship: data.relationship || '',
    icon: data.icon || 'User',
    color: data.color || '--cyan',
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : 1
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    relationship: data.relationship ?? existing.relationship,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : existing.show_in_summary,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const p = getById(id);
  if (!p) return null;
  stmts.remove.run(id);
  return p;
}
