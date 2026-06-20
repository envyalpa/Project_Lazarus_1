import db from '../db.js';
import * as accounts from './accounts.js';
import * as peopleModule from './people.js';

export function getMonthlySummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;

  const income = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'income' AND date LIKE ?
  `).get(prefix + '%');

  const expense = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'expense' AND date LIKE ?
  `).get(prefix + '%');

  return {
    income: income.total,
    expense: expense.total,
    netFlow: income.total - expense.total
  };
}

export function getAccountBalances() {
  return accounts.getAll();
}

export function getPeopleBalances() {
  return peopleModule.getAll();
}

export function getTopCategories(limit = 5) {
  return db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense'
    GROUP BY c.id ORDER BY total DESC LIMIT ?
  `).all(limit);
}

export function getTotalAvailable() {
  const balanceMap = accounts.getBalanceMap();
  const rows = db.prepare("SELECT name FROM accounts WHERE type IN ('bank', 'cash')").all();
  return rows.reduce((sum, r) => sum + (balanceMap[r.name] || 0), 0);
}

export function getTotalLiabilities() {
  const balanceMap = accounts.getBalanceMap();
  const loans = db.prepare("SELECT name FROM accounts WHERE type = 'loan'").all();
  const loanTotal = loans.reduce((sum, r) => sum + (balanceMap[r.name] || 0), 0);

  const negPeople = peopleModule.getAll();
  const peopleNeg = negPeople.reduce((sum, p) => sum + (p.balance < 0 ? p.balance : 0), 0);

  return Math.abs(loanTotal) + Math.abs(peopleNeg);
}

export function getTopCategory() {
  const top = getTopCategories(1);
  return top.length > 0 ? top[0] : null;
}

export function getTrends() {
  const latestMonth = db.prepare(`
    SELECT substr(date, 1, 7) as ym FROM transactions
    ORDER BY date DESC LIMIT 1
  `).get();

  if (!latestMonth) {
    return { income: 'flat', expense: 'flat', netFlow: 'flat', available: 'flat', liabilities: 'flat', topCategory: 'flat' };
  }

  const ym = latestMonth.ym;
  const [year, month] = ym.split('-').map(Number);
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const prefix = ym + '%';
  const prevPrefix = prevMonth + '%';

  function getTotal(type, datePrefix) {
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = ? AND date LIKE ?
    `).get(type, datePrefix);
    return row.total;
  }

  const curIncome = getTotal('income', prefix);
  const prevIncome = getTotal('income', prevPrefix);
  const curExpense = getTotal('expense', prefix);
  const prevExpense = getTotal('expense', prevPrefix);
  const curNet = curIncome - curExpense;
  const prevNet = prevIncome - prevExpense;

  function trend(cur, prev) {
    const ratio = prev === 0 ? (cur > 0 ? 1 : 0) : (cur - prev) / Math.abs(prev);
    if (ratio > 0.05) return 'up';
    if (ratio < -0.05) return 'down';
    return 'flat';
  }

  const topCat = getTopCategory();
  let topCatTrend = 'flat';
  if (topCat) {
    const curTop = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
      WHERE t.category_id = ? AND t.type = 'expense' AND t.date LIKE ?
    `).get(topCat.id, prefix);
    const prevTop = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
      WHERE t.category_id = ? AND t.type = 'expense' AND t.date LIKE ?
    `).get(topCat.id, prevPrefix);
    topCatTrend = trend(curTop.total, prevTop.total);
  }

  const availableTrend = curNet >= 0 ? 'up' : 'down';

  function getLiabilityTotal(datePrefix) {
    const spent = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'expense' AND paid_by = 'ICICI Credit' AND date LIKE ?
    `).get(datePrefix);
    return spent.total;
  }

  const curLiab = getLiabilityTotal(prefix);
  const prevLiab = getLiabilityTotal(prevPrefix);
  const liabilitiesTrend = trend(prevLiab, curLiab);

  return {
    income: trend(curIncome, prevIncome),
    expense: trend(curExpense, prevExpense),
    netFlow: trend(curNet, prevNet),
    available: availableTrend,
    liabilities: liabilitiesTrend === 'up' ? 'down' : (liabilitiesTrend === 'down' ? 'up' : 'flat'),
    topCategory: topCatTrend
  };
}
