import { json } from '@sveltejs/kit';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import db from '$lib/server/db.js';
import { create as createAccount } from '$lib/server/treasury/accounts.js';
import { create as createPerson } from '$lib/server/treasury/people.js';
import { getAll as getCategories } from '$lib/server/treasury/categories.js';
import { batchInsert as batchTitleVendors } from '$lib/server/treasury/title-vendors.js';
import { getAll as getImportLogs, create as logImport, remove as removeLog } from '$lib/server/treasury/import-log.js';
import { parsePdf as parseGpayPdf } from '$lib/server/treasury/import-gpay.js';
import { parsePdf as parseFederalPdf } from '$lib/server/treasury/import-federal.js';

function parseDate(str) {
  if (!str) return null;
  const trimmed = str.trim();
  const ddmmyyyy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
  const yyyymmdd = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/;
  let m;
  if ((m = ddmmyyyy.exec(trimmed))) {
    const [_, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if ((m = yyyymmdd.exec(trimmed))) {
    const [_, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parseAmount(str) {
  if (str == null) return null;
  let cleaned = String(str).replace(/[₹\s]/g, '');
  cleaned = cleaned.replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normalizeTitle(t) {
  return t.trim().replace(/\s+/g, ' ');
}

function titleSimilarity(a, b) {
  const words = (s) => s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  const wa = words(a);
  const wb = words(b);
  if (!wa.length || !wb.length) return 0;
  const sa = new Set(wa);
  const sb = new Set(wb);
  let common = 0;
  for (const w of sa) {
    if (sb.has(w)) common++;
  }
  return (2 * common) / (sa.size + sb.size);
}

const nameAliases = [
  { aliases: ['celine', 'mom', 'family'], targets: ['celine', 'mom', 'family'] },
  { aliases: ['sola', 'solapaul1994', 'sola paulson', 'sister'], targets: ['sola', 'sister'] },
  { aliases: ['arnold', 'arnoldpeter333', 'arnold peter'], targets: ['arnold'] },
  { aliases: ['merlin', 'ringmerlinmoon'], targets: ['merlin'] },
  { aliases: ['envyalpa', 'allen'], targets: ['me', 'allen'] },
  { aliases: ['elwin1358'], targets: ['elwin'] },
  { aliases: ['celinepaulson'], targets: ['celine', 'mom', 'family'] },
  { aliases: ['vishnutvm94'], targets: ['vishnu'] },
  { aliases: ['snehapadmanabhann'], targets: ['sneha'] },
];

function matchAccount(dbPaidBy, dbPaidTo, srcPaidBy, srcPaidTo) {
  const src = (srcPaidBy || srcPaidTo || '').toLowerCase();
  const db = (dbPaidBy || dbPaidTo || '').toLowerCase();
  if (!src || !db) return false;
  if (src.includes('federal') && db.includes('federal')) return true;
  if (src.includes('icici') && db.includes('icici')) return true;
  if ((src.includes('sbi') || src.includes('state bank')) && (db.includes('sbi') || db.includes('state bank'))) return true;
  if (src.includes('car loan') && db.includes('car loan')) return true;
  return src === db;
}

function personAliasMatch(title, dbTitle) {
  const t = title.toLowerCase();
  const dt = dbTitle.toLowerCase();
  for (const group of nameAliases) {
    const inSrc = group.aliases.some(a => t.includes(a));
    const inDb = group.targets.some(a => dt.includes(a));
    if (inSrc && inDb) return true;
  }
  return false;
}

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'parse-pdf') {
    const { filename, content, bankType: hint, password } = body;
    if (!content) return json({ error: 'No file content' }, { status: 400 });
    const tmpPath = join(tmpdir(), 'import-' + Date.now() + '.pdf');
    writeFileSync(tmpPath, Buffer.from(content, 'base64'));
    try {
      let rows;
      let bankType = hint || '';

      if (hint === 'federal') {
        rows = parseFederalPdf(tmpPath, password || '');
        bankType = 'federal';
      } else if (hint === 'gpay') {
        rows = parseGpayPdf(tmpPath, password || '');
        bankType = 'gpay';
      } else {
        try {
          rows = parseFederalPdf(tmpPath, password || '');
          if (rows && rows.length > 0) {
            bankType = 'federal';
          }
        } catch (e) {
          const msg = e.message || '';
          if (/decrypt/i.test(msg) || /encrypt/i.test(msg) || /FileNotDecrypted/i.test(msg)) {
            throw e;
          }
        }
        if (!bankType) {
          rows = parseGpayPdf(tmpPath, password || '');
          bankType = 'gpay';
        }
      }

      return json({ rows, filename, bankType });
    } catch (e) {
      const msg = e.message || '';
      if (/decrypt/i.test(msg) || /encrypt/i.test(msg) || /FileNotDecrypted/i.test(msg)) {
        return json({ error: 'ENCRYPTED', message: 'This PDF requires a password to decrypt.' });
      }
      return json({ error: msg }, { status: 500 });
    } finally {
      try { unlinkSync(tmpPath); } catch {}
    }
  }

  if (body.action === 'check-duplicates') {
    const rows = body.rows || [];
    const categories = getCategories();
    const catMap = {};
    for (const c of categories) catMap[c.name.toLowerCase()] = { id: c.id, name: c.name };

    const dupCheckStmt = db.prepare('SELECT id FROM transactions WHERE date = ? AND amount = ? AND LOWER(TRIM(title)) = LOWER(?)');
    const fuzzyByAmountStmt = db.prepare('SELECT id, title, amount, paid_by, paid_to, date FROM transactions WHERE ABS(amount - ?) < 1');

    const catAliases = {
      'medicine': 'Medical',
      'house care': 'Home',
      'personal care': 'Grooming',
      'hobbies': 'Fun',
      'misc': 'Unknown',
      'misc - s': 'Unknown',
      'car care': 'Car',
      'car fuel': 'Fuel',
      'pet care': 'Haru',
      'family - transfer': 'Transfer',
      'credit card transfer': 'Credit Card',
      'credit card payment': 'Credit Card',
      'car loan transfers': 'Car Loan',
      'bank transfers': 'Transfer',
      'account roundoff': 'Unknown',
      'wedding purchases': 'Wedding',
      'tickets': 'Fun',
      'travel': 'Transport',
      'construction': 'Home',
      'skin treatment': 'Grooming',
      'savings': 'Transfer',
      'family': 'Transfer'
    };

    function matchCategory(catName) {
      if (!catName) return null;
      const key = catName.toLowerCase();
      if (catMap[key]) return catMap[key];
      const alias = catAliases[key];
      if (alias && catMap[alias.toLowerCase()]) return catMap[alias.toLowerCase()];
      for (const [dbKey, val] of Object.entries(catMap)) {
        if (dbKey.includes(key) || key.includes(dbKey)) return val;
      }
      const words = key.split(/[\s&,/]+/).filter(Boolean);
      for (const w of words) {
        if (w.length < 3) continue;
        for (const [dbKey, val] of Object.entries(catMap)) {
          if (dbKey.includes(w)) return val;
        }
      }
      return null;
    }

    const results = rows.map((row, i) => {
      const date = parseDate(row.date);
      const amount = parseAmount(row.amount);
      const title = normalizeTitle(row.title || '');
      const type = (row.type || '').toLowerCase();
      const catName = (row.category || '').trim();

      let duplicate = false;
      let matchedDb = null;
      let mergeDbId = null;

      if (date && amount && title) {
        const exact = dupCheckStmt.get(date, amount, title);
        if (exact) {
          duplicate = true;
          mergeDbId = exact.id;
          matchedDb = db.prepare('SELECT id, title, amount, paid_by, paid_to, date FROM transactions WHERE id = ?').get(exact.id);
        } else {
          const candidates = fuzzyByAmountStmt.all(amount);
          let bestScore = 0;
          let bestMatch = null;
          const srcDate = new Date(date + 'T00:00:00');
          for (const c of candidates) {
            const diff = Math.abs(c.amount - amount);
            const dbDate = new Date(c.date + 'T00:00:00');
            const dayDiff = Math.abs((srcDate - dbDate) / 86400000);

            let score = 0;
            // Amount (primary)
            score += diff === 0 ? 30 : 20;
            // Date proximity (secondary)
            if (dayDiff === 0) score += 30;
            else if (dayDiff <= 1) score += 20;
            else if (dayDiff <= 3) score += 10;
            else continue;
            // Account match (tertiary)
            if (matchAccount(c.paid_by, c.paid_to, row.paid_by || '', row.paid_to || '')) score += 20;
            // Title similarity + person alias (quaternary)
            const sim = titleSimilarity(title, c.title);
            if (sim > 0.5) score += 10;
            else if (sim > 0) score += sim * 8;
            if (personAliasMatch(title, c.title)) score += 10;

            if (score > bestScore) { bestScore = score; bestMatch = c; }
          }
          if (bestMatch && bestScore >= 50) {
            duplicate = true;
            matchedDb = bestMatch;
            mergeDbId = bestMatch.id;
          }
        }
      }

      const matched = matchCategory(catName);
      const category_id = matched ? matched.id : null;
      const category_name = matched ? matched.name : null;

      const result = {
        index: i,
        date,
        title,
        amount,
        type: ['expense', 'income', 'transfer'].includes(type) ? type : 'expense',
        _sourceFile: row._sourceFile || '',
        category_id,
        category_name,
        paid_by: (row.paid_by || '').trim(),
        paid_to: (row.paid_to || '').trim(),
        paid_for: (row.paid_for || '').trim(),
        notes: row.notes || '',
        duplicate
      };
      if (matchedDb) {
        result.matched_db = matchedDb;
        result.merge_db_id = mergeDbId;
      }
      return result;
    });

    return json({ rows: results });
  }

  if (body.action === 'confirm') {
    const rows = body.rows || [];
    const newAccounts = body.newAccounts || 0;
    const newPeople = body.newPeople || 0;
    const filename = body.filename || 'unknown.csv';
    if (!rows.length) return json({ success: false, error: 'No rows to import' });

    const txStmt = db.prepare(`INSERT INTO transactions (date, title, amount, type, category_id, paid_by, paid_to, paid_for, notes)
      VALUES (@date, @title, @amount, @type, @category_id, @paid_by, @paid_to, @paid_for, @notes)`);
    const mergeStmt = db.prepare(`UPDATE transactions SET title = @title, amount = @amount, paid_by = @paid_by, paid_to = @paid_to WHERE id = @id`);

    const titleVendors = [];
    const parseTitle = (t) => {
      const cleaned = normalizeTitle(t);
      const parts = cleaned.split(' - ');
      if (parts.length >= 2) {
        const a = parts[0].trim();
        const b = parts.slice(1).join(' - ').trim();
        return { vendor: a, item: b, canonical: cleaned };
      }
      return { vendor: cleaned, item: '', canonical: cleaned };
    };

    let newCount = 0;
    let mergeCount = 0;

    try {
      const doImport = db.transaction(() => {
        for (const row of rows) {
          if (row.merge_db_id) {
            mergeStmt.run({
              id: row.merge_db_id,
              title: row.title,
              amount: row.amount,
              paid_by: row.paid_by || '',
              paid_to: row.paid_to || ''
            });
            mergeCount++;
          } else {
            txStmt.run({
              date: row.date,
              title: row.title,
              amount: row.amount,
              type: row.type || 'expense',
              category_id: row.category_id || null,
              paid_by: row.paid_by || '',
              paid_to: row.paid_to || '',
              paid_for: row.paid_for || '',
              notes: row.notes || ''
            });
            titleVendors.push(parseTitle(row.title));
          }
        }
      });

      doImport();
      batchTitleVendors(titleVendors);
      logImport({ filename, row_count: rows.length, new_accounts: newAccounts, new_people: newPeople, merge_count: mergeCount });

      return json({ success: true, count: rows.length, newCount, mergeCount });
    } catch (e) {
      return json({ success: false, error: e.message });
    }
  }

  return json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return json(getImportLogs());
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const entry = removeLog(Number(id));
  if (!entry) return json({ error: 'Not found' }, { status: 404 });
  return json({ success: true });
}
