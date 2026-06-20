/**
 * Full audit of treasury balance calculations.
 * Compares what the UI shows vs what the raw transaction data says.
 *
 * Run: node scripts/audit_balances.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'lazarus.db'));

const SEP = '─'.repeat(72);
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

function fmt(n) {
  if (n == null) return 'NULL';
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sign(n) {
  return n >= 0 ? GREEN('+' + fmt(n)) : RED('-' + fmt(n));
}

// ═══════════════════════════════════════════════════════════
// 1. RAW TRANSACTION DUMP (split transactions highlighted)
// ═══════════════════════════════════════════════════════════
console.log('\n' + BOLD('══════ RAW TRANSACTIONS ══════'));
const txns = db.prepare(`
  SELECT id, date, title, amount, type, paid_by, paid_to, paid_for
  FROM transactions
  ORDER BY date DESC, id DESC
`).all();

console.log(`Total: ${txns.length} transactions\n`);

const splitTxns = txns.filter(t => t.paid_for && t.paid_for.trim() !== '');
console.log(BOLD(`Split transactions (paid_for is set): ${splitTxns.length}`));
if (splitTxns.length > 0) {
  console.log(DIM('  id   date        amount     type      paid_by        paid_to  paid_for'));
  for (const t of splitTxns) {
    const parts = t.paid_for.split(',').filter(Boolean);
    const share = t.amount / Math.max(1, parts.length);
    console.log(
      `  ${String(t.id).padEnd(5)}${t.date}  ${String(fmt(t.amount)).padEnd(12)} ${String(t.type).padEnd(9)} ` +
      `${String(t.paid_by || '(none)').padEnd(15)} ${String(t.paid_to || '(none)').padEnd(8)} ` +
      `[${t.paid_for}] → ${parts.length} people × ${fmt(share)} each`
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 2. ACCOUNT BALANCE AUDIT
// ═══════════════════════════════════════════════════════════
console.log('\n' + SEP);
console.log(BOLD('══════ ACCOUNT BALANCES (Bank / Credit cards) ══════'));
console.log(SEP);

const accounts = db.prepare('SELECT * FROM accounts ORDER BY name').all();

for (const acc of accounts) {
  const incomeRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as v FROM transactions WHERE paid_to = ?`
  ).get(acc.name);
  const expenseRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as v FROM transactions WHERE paid_by = ?`
  ).get(acc.name);

  const income = incomeRow.v;
  const expense = expenseRow.v;
  const balance = income - expense;

  // What the UI shows via balanceStmt
  const uiRow = db.prepare(`
    SELECT
      COALESCE(tx.balance, 0) as balance,
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
    LEFT JOIN (SELECT paid_to as name, SUM(amount) as income FROM transactions GROUP BY paid_to) inc ON a.name = inc.name
    LEFT JOIN (SELECT paid_by as name, SUM(amount) as expense FROM transactions GROUP BY paid_by) exp ON a.name = exp.name
    WHERE a.id = ?
  `).get(acc.id);

  const ok = Math.abs((uiRow?.balance ?? 0) - balance) < 0.01;
  const statusStr = ok ? GREEN('✓ OK') : RED('✗ MISMATCH');

  console.log(`\n${BOLD(acc.name)} ${DIM(`(${acc.type})`)} ${statusStr}`);
  console.log(`  Income (paid_to):   ${GREEN(fmt(income))}`);
  console.log(`  Expense (paid_by):  ${RED(fmt(expense))}`);
  console.log(`  Net balance:        ${sign(balance)}`);
  console.log(`  UI shows:           ${sign(uiRow?.balance ?? 0)}  income=${fmt(uiRow?.income)} expense=${fmt(uiRow?.expense)}`);
  if (!ok) {
    console.log(RED(`  ⚠ Discrepancy: calculated=${fmt(balance)}, UI shows=${fmt(uiRow?.balance)}`));
  }
}

// ═══════════════════════════════════════════════════════════
// 3. PEOPLE BALANCE AUDIT
// ═══════════════════════════════════════════════════════════
console.log('\n' + SEP);
console.log(BOLD('══════ PEOPLE BALANCES (Family / Sister / Wife) ══════'));
console.log(SEP);

const people = db.prepare('SELECT * FROM people ORDER BY name').all();
const ACCOUNT_NAMES = db.prepare('SELECT name FROM accounts').all().map(a => a.name);
const PERSON_NAMES = ['Family', 'Sister', 'Wife'];

for (const person of people) {
  console.log(`\n${BOLD(person.name)} ${DIM(`(${person.relationship || 'no relationship'})`)}:`);

  // paidByAmount: what this person paid as the payer
  const paidByRow = db.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN type = 'expense' AND paid_for LIKE '%Me%' AND paid_for LIKE '%,%'
          THEN amount / MAX(1, LENGTH(paid_for) - LENGTH(REPLACE(paid_for, ',', '')) + 1)
        ELSE amount
      END
    ), 0) as val
    FROM transactions WHERE paid_by = ?
  `).get(person.name);
  const paidByAmount = paidByRow?.val ?? 0;

  // paidBackSplit (CURRENT fixed logic — no Me requirement):
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
  `).get(person.name, person.name);
  const paidBackSplit = paidBackSplitRow?.val ?? 0;

  // paidBackDirect (direct cash sent to them)
  const paidBackDirectRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as val FROM transactions WHERE paid_to = ? AND paid_by != ?`
  ).get(person.name, person.name);
  const paidBackDirect = paidBackDirectRow?.val ?? 0;

  const balance = paidBackDirect + paidBackSplit - paidByAmount;

  // Show individual split transactions for this person
  const myTxns = db.prepare(`
    SELECT id, date, title, amount, type, paid_by, paid_to, paid_for
    FROM transactions
    WHERE paid_for LIKE '%' || ? || '%' OR paid_by = ? OR paid_to = ?
    ORDER BY date DESC
  `).all(person.name, person.name, person.name);

  console.log(`  paidByAmount:    ${fmt(paidByAmount)}  (what they paid as payer)`);
  console.log(`  paidBackDirect:  ${fmt(paidBackDirect)}  (direct repayments TO them)`);
  console.log(`  paidBackSplit:   ${fmt(paidBackSplit)}  (Me paid for their split share)`);
  console.log(`  Computed balance: ${sign(balance)}  ${balance > 0 ? YELLOW('(they owe ME)') : balance < 0 ? CYAN('(ME owes them)') : '(settled)'}`);

  if (myTxns.length > 0) {
    console.log(`  ${DIM('Relevant transactions:')}`);
    for (const t of myTxns) {
      const parts = t.paid_for ? t.paid_for.split(',').filter(Boolean) : [];
      const share = parts.includes(person.name)
        ? t.amount / Math.max(1, parts.length)
        : null;
      const shareStr = share != null ? ` → ${person.name}'s share: ${fmt(share)}` : '';
      const role = t.paid_by === person.name ? '[PAYER]' : t.paid_to === person.name ? '[RECIPIENT]' : '[IN SPLIT]';
      console.log(
        `    ${DIM(String(t.id).padEnd(5))} ${t.date}  ${String(fmt(t.amount)).padEnd(12)} ` +
        `${String(t.type).padEnd(9)} paidBy=${String(t.paid_by || '-').padEnd(12)} ` +
        `paid_for=[${t.paid_for || ''}] ${YELLOW(role)}${shareStr}`
      );
    }
  } else {
    console.log(`  ${DIM('No relevant transactions found.')}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 4. OVERALL TOTALS (income/expense/net)
// ═══════════════════════════════════════════════════════════
console.log('\n' + SEP);
console.log(BOLD('══════ OVERALL TOTALS (Financial Summary Cards) ══════'));
console.log(SEP);

const totals = db.prepare(`
  SELECT
    type,
    COUNT(*) as count,
    SUM(amount) as total
  FROM transactions
  GROUP BY type
`).all();

let income = 0, expense = 0, transfers = 0;
for (const row of totals) {
  if (row.type === 'income') income = row.total;
  if (row.type === 'expense') expense = row.total;
  if (row.type === 'transfer') transfers = row.total;
  console.log(`  ${String(row.type).padEnd(10)} ${String(row.count).padStart(4)} txns   ${fmt(row.total)}`);
}

console.log(`\n  Net flow (income - expense): ${sign(income - expense)}`);

// ═══════════════════════════════════════════════════════════
// 5. SPLIT INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════
console.log('\n' + SEP);
console.log(BOLD('══════ SPLIT INTEGRITY CHECKS ══════'));
console.log(SEP);

// Check for transactions with paid_for containing names not in the known set
const knownNames = new Set(['Me', 'Family', 'Sister', 'Wife', '']);
const allTxnsWithSplit = db.prepare(`SELECT id, date, title, paid_for FROM transactions WHERE paid_for != '' AND paid_for IS NOT NULL`).all();
let issues = 0;

for (const t of allTxnsWithSplit) {
  const parts = t.paid_for.split(',').map(s => s.trim());
  for (const part of parts) {
    if (!knownNames.has(part)) {
      console.log(RED(`  ⚠ Unknown name in paid_for: "${part}" (txn #${t.id} "${t.title}")`));
      issues++;
    }
  }
}

// Check for split transactions where paid_by is a person (should probably be an account)
const personPaidSplit = db.prepare(`
  SELECT id, date, title, amount, paid_by, paid_for
  FROM transactions
  WHERE paid_for LIKE '%,%'
    AND paid_by IN ('Family', 'Sister', 'Wife')
`).all();
if (personPaidSplit.length > 0) {
  console.log(YELLOW(`\n  Split transactions where a PERSON (not account) is the payer:`));
  for (const t of personPaidSplit) {
    console.log(YELLOW(`    #${t.id} "${t.title}" — paid_by=${t.paid_by}, paid_for=${t.paid_for}`));
    issues++;
  }
}

// Check for income/transfer txns with paid_for set (shouldn't affect splits)
const nonExpenseSplit = db.prepare(`
  SELECT id, date, title, type, paid_for
  FROM transactions
  WHERE type != 'expense' AND paid_for != '' AND paid_for IS NOT NULL
`).all();
if (nonExpenseSplit.length > 0) {
  console.log(YELLOW(`\n  Non-expense transactions with paid_for set (ignored by balance calc):`));
  for (const t of nonExpenseSplit) {
    console.log(YELLOW(`    #${t.id} "${t.title}" type=${t.type} paid_for=${t.paid_for}`));
  }
}

if (issues === 0 && nonExpenseSplit.length === 0) {
  console.log(GREEN('  ✓ All split data looks clean.'));
}

console.log('\n' + SEP + '\n');
db.close();
