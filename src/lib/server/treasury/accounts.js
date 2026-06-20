import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM accounts ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM accounts WHERE id = ?'),
  create: db.prepare('INSERT INTO accounts (name, type, balance, currency, icon, color, is_asset, show_in_summary, total_payable) VALUES (@name, @type, 0, @currency, @icon, @color, @is_asset, @show_in_summary, @total_payable)'),
  update: db.prepare('UPDATE accounts SET name = @name, type = @type, balance = 0, currency = @currency, icon = @icon, color = @color, is_asset = @is_asset, show_in_summary = @show_in_summary, total_payable = @total_payable WHERE id = @id'),
  remove: db.prepare('DELETE FROM accounts WHERE id = ?')
};

const balanceStmt = db.prepare(`
  SELECT a.*,
    CASE WHEN a.type = 'loan' AND a.total_payable > 0 THEN a.total_payable - COALESCE(tx.balance, 0) ELSE COALESCE(tx.balance, 0) END as balance,
    COALESCE(inc.income, 0) as income,
    COALESCE(exp.expense, 0) as expense
  FROM accounts a
  LEFT JOIN (
    SELECT name, SUM(net) as balance FROM (
      SELECT paid_to as name, SUM(amount) as net FROM transactions GROUP BY paid_to
      UNION ALL
      SELECT paid_by as name, -SUM(amount) as net FROM transactions GROUP BY paid_by
    ) GROUP BY name
  ) tx ON a.name = tx.name
  LEFT JOIN (
    SELECT paid_to as name, SUM(amount) as income FROM transactions GROUP BY paid_to
  ) inc ON a.name = inc.name
  LEFT JOIN (
    SELECT paid_by as name, SUM(amount) as expense FROM transactions GROUP BY paid_by
  ) exp ON a.name = exp.name
  ORDER BY a.created_at DESC
`);

const balanceSingleStmt = db.prepare(`
  SELECT a.*,
    CASE WHEN a.type = 'loan' AND a.total_payable > 0 THEN a.total_payable - COALESCE(tx.balance, 0) ELSE COALESCE(tx.balance, 0) END as balance,
    COALESCE(inc.income, 0) as income,
    COALESCE(exp.expense, 0) as expense
  FROM accounts a
  LEFT JOIN (
    SELECT name, SUM(net) as balance FROM (
      SELECT paid_to as name, SUM(amount) as net FROM transactions GROUP BY paid_to
      UNION ALL
      SELECT paid_by as name, -SUM(amount) as net FROM transactions GROUP BY paid_by
    ) GROUP BY name
  ) tx ON a.name = tx.name
  LEFT JOIN (
    SELECT paid_to as name, SUM(amount) as income FROM transactions GROUP BY paid_to
  ) inc ON a.name = inc.name
  LEFT JOIN (
    SELECT paid_by as name, SUM(amount) as expense FROM transactions GROUP BY paid_by
  ) exp ON a.name = exp.name
  WHERE a.id = ?
`);

export function getAll() {
  return balanceStmt.all();
}

export function getById(id) {
  return balanceSingleStmt.get(id) || null;
}

export function getBalanceMap() {
  const rows = db.prepare(`
    SELECT name, SUM(net) as balance FROM (
      SELECT paid_to as name, SUM(amount) as net FROM transactions GROUP BY paid_to
      UNION ALL
      SELECT paid_by as name, -SUM(amount) as net FROM transactions GROUP BY paid_by
    ) GROUP BY name
  `).all();
  const map = {};
  for (const r of rows) map[r.name] = r.balance;
  return map;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    type: data.type || 'bank',
    currency: data.currency || 'INR',
    icon: data.icon || 'Wallet',
    color: data.color || '--cyan',
    is_asset: data.is_asset != null ? (data.is_asset ? 1 : 0) : 1,
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : 1,
    total_payable: data.total_payable || 0
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    type: data.type ?? existing.type,
    currency: data.currency ?? existing.currency,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    is_asset: data.is_asset != null ? (data.is_asset ? 1 : 0) : existing.is_asset,
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : existing.show_in_summary,
    total_payable: data.total_payable != null ? data.total_payable : existing.total_payable,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const a = getById(id);
  if (!a) return null;
  stmts.remove.run(id);
  return a;
}
