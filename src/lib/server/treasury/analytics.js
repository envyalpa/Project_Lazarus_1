import db from '../db.js';

export function getTrendsData(period = 'month', count = 12) {
  const configs = {
    week: { group: "strftime('%Y-%W', date)", interval: `-${count * 7} days`, start: '' },
    month: { group: "substr(date, 1, 7)", interval: `-${count} months`, start: ", 'start of month'" },
    year: { group: "substr(date, 1, 4)", interval: `-${count} years`, start: ", 'start of year'" }
  };
  const cfg = configs[period] || configs.month;
  const rows = db.prepare(`
    SELECT ${cfg.group} as period,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE date >= date('now', ?${cfg.start})
    GROUP BY period ORDER BY period ASC
  `).all(cfg.interval);
  return rows.map(r => ({ ...r, net: r.income - r.expense }));
}

export function getCategorySpendingByMonth(categoryId, months = 12) {
  return db.prepare(`
    SELECT substr(date, 1, 7) as ym, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE category_id = ? AND type = 'expense'
      AND date >= date('now', ? || ' months', 'start of month')
    GROUP BY ym ORDER BY ym ASC
  `).all(categoryId, `-${months}`);
}

export function getTopMerchants(limit = 10, startDate, endDate) {
  const clauses = ["paid_to != ''"];
  const params = { limit };
  if (startDate) { clauses.push('date >= @start'); params.start = startDate; }
  if (endDate) { clauses.push('date <= @end'); params.end = endDate; }
  return db.prepare(`
    SELECT paid_to as merchant, SUM(amount) as total, COUNT(*) as count
    FROM transactions WHERE ${clauses.join(' AND ')}
    GROUP BY paid_to ORDER BY total DESC LIMIT @limit
  `).all(params);
}

export function getPeriodComparison(start1, end1, start2, end2) {
  function periodStats(s, e) {
    return db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions WHERE date >= ? AND date <= ?
    `).get(s, e);
  }
  function topCat(s, e) {
    return db.prepare(`
      SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t JOIN categories c ON t.category_id = c.id
      WHERE t.type='expense' AND t.date >= ? AND t.date <= ?
      GROUP BY c.id ORDER BY total DESC LIMIT 3
    `).all(s, e);
  }
  const p1 = periodStats(start1, end1);
  const p2 = periodStats(start2, end2);
  const p1n = p1.income - p1.expense;
  const p2n = p2.income - p2.expense;
  function pct(a, b) {
    if (b === 0) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / Math.abs(b)) * 100);
  }
  return {
    period1: { ...p1, net: p1n, topCategories: topCat(start1, end1) },
    period2: { ...p2, net: p2n, topCategories: topCat(start2, end2) },
    changes: {
      income: pct(p1.income, p2.income),
      expense: pct(p1.expense, p2.expense),
      net: pct(p1n, p2n)
    }
  };
}

export function getAllCategoryMonthlySpending(months = 12) {
  const cats = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  const spending = db.prepare(`
    SELECT t.category_id, substr(t.date, 1, 7) as ym, COALESCE(SUM(t.amount), 0) as total
    FROM transactions t WHERE t.type = 'expense'
      AND t.date >= date('now', ? || ' months', 'start of month')
    GROUP BY t.category_id, ym ORDER BY ym ASC
  `).all(`-${months}`);
  return cats.map(c => ({ ...c, spendingByMonth: spending.filter(s => s.category_id === c.id) }));
}

export function getPaidForAnalysis(months = 12) {
  return db.prepare(`
    SELECT substr(date, 1, 7) as ym,
      COALESCE(SUM(CASE WHEN paid_for LIKE '%Wife%' THEN amount ELSE 0 END), 0) as wife,
      COALESCE(SUM(CASE WHEN paid_for LIKE '%Sister%' THEN amount ELSE 0 END), 0) as sister,
      COALESCE(SUM(CASE WHEN paid_for LIKE '%Family%' THEN amount ELSE 0 END), 0) as family,
      COALESCE(SUM(CASE WHEN paid_for = '' OR paid_for IS NULL THEN amount ELSE 0 END), 0) as self
    FROM transactions WHERE type = 'expense'
      AND date >= date('now', ? || ' months', 'start of month')
    GROUP BY ym ORDER BY ym ASC
  `).all(`-${months}`);
}

export function getNetWorthHistory(months = 12) {
  return db.prepare(`
    WITH months AS (
      SELECT DISTINCT substr(date, 1, 7) as ym,
        date(substr(date, 1, 7) || '-01', '+1 month', '-1 day') as end_date
      FROM transactions
      WHERE date >= date('now', ? || ' months', 'start of month')
      ORDER BY ym
    )
    SELECT me.ym,
      COALESCE(SUM(CASE WHEN a.is_asset = 1 THEN (
        COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.paid_to = a.name AND t.date <= me.end_date), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.paid_by = a.name AND t.date <= me.end_date), 0)
      ) ELSE 0 END), 0) as assets,
      COALESCE(SUM(CASE WHEN a.type = 'loan' THEN ABS(
        COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.paid_to = a.name AND t.date <= me.end_date), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.paid_by = a.name AND t.date <= me.end_date), 0))
      ELSE 0 END), 0) as liabilities
    FROM months me CROSS JOIN accounts a
    WHERE a.is_asset = 1 OR a.type = 'loan'
    GROUP BY me.ym ORDER BY me.ym
  `).all(`-${months}`).map(r => ({ ym: r.ym, assets: r.assets, liabilities: r.liabilities, netWorth: r.assets - r.liabilities }));
}
