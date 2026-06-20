import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

const SELF_VPAS = ['envyalpa@oksbi', 'envyalpa-2@okaxis', 'envyalpa@okicici'];

const nameAliases = [
  { aliases: ['celine', 'mom', 'family'], targets: ['celine', 'mom', 'family'], split: 'Family' },
  { aliases: ['sola', 'solapaul1994', 'sola paulson', 'sister'], targets: ['sola', 'sister'], split: 'Sister' },
  { aliases: ['arnold', 'arnoldpeter333', 'arnold peter'], targets: ['arnold'], split: 'Family' },
  { aliases: ['merlin', 'ringmerlinmoon'], targets: ['merlin'], split: 'Wife' },
  { aliases: ['envyalpa', 'allen'], targets: ['me', 'allen'], split: 'Me' },
  { aliases: ['elwin1358'], targets: ['elwin'], split: 'Family' },
  { aliases: ['celinepaulson'], targets: ['celine', 'mom', 'family'], split: 'Family' },
  { aliases: ['vishnutvm94'], targets: ['vishnu'], split: 'Family' },
  { aliases: ['snehapadmanabhann'], targets: ['sneha'], split: 'Family' },
];

const catAliases = {
  'medicine': 'Medical', 'house care': 'Home', 'personal care': 'Grooming',
  'hobbies': 'Fun', 'tickets': 'Fun', 'misc': 'Unknown', 'misc - s': 'Unknown',
  'car care': 'Car', 'car fuel': 'Fuel', 'pet care': 'Haru',
  'family - transfer': 'Transfer', 'credit card transfer': 'Credit Card',
  'credit card payment': 'Credit Card', 'car loan transfers': 'Car Loan',
  'bank transfers': 'Transfer', 'account roundoff': 'Unknown',
  'wedding purchases': 'Wedding', 'travel': 'Transport',
  'construction': 'Home', 'skin treatment': 'Grooming',
  'savings': 'Transfer', 'family': 'Transfer',
};

const gpayAccountMap = {
  'Federal Bank 8796': 'Federal Bank Debit',
  'ICICI Bank 0454': 'ICICI Debit',
  'State Bank of India 2690': 'SBI Debit',
};

const gpayPersonMap = {
  'Celine Paulson': 'Family',
  'Sola Paulson': 'Sister',
};

let db;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { bank: 'auto', confirm: false, confirmFuzzy: false, password: '', path: '', supportingEntries: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) result.path = args[++i];
    else if (args[i] === '--password' && args[i + 1]) result.password = args[++i];
    else if (args[i] === '--bank' && args[i + 1]) result.bank = args[++i];
    else if (args[i] === '--confirm') result.confirm = true;
    else if (args[i] === '--confirm-fuzzy') result.confirmFuzzy = true;
    else if (args[i] === '--supporting' && args[i + 1]) {
      const start = ++i;
      const parts = [];
      while (i < args.length && !args[i].startsWith('--')) parts.push(args[i++]);
      i--;
      result.supportingEntries = parts.join('\n');
    }
    else if (args[i] === '--supporting-file' && args[i + 1]) {
      const filePath = args[++i];
      if (existsSync(filePath)) {
        result.supportingEntries = readFileSync(filePath, 'utf-8');
      } else {
        log(`⚠  Supporting file not found: ${filePath}`);
      }
    }
  }
  return result;
}

function log(...msg) { console.error(...msg); }

function cleanTitle(desc) {
  if (desc.startsWith('CHRG/')) {
    const parts = desc.replace('CHRG/', '').replace(/\s*\/.*$/, '').trim();
    return 'Bank Charge - ' + parts.replace(/_/g, ' ').replace(/\//g, ' ').trim();
  }
  if (desc.startsWith('POS/')) {
    const m = desc.match(/POS\/\d+\/([^\\]+)/);
    return m ? m[1].trim() : 'POS Purchase';
  }
  if (desc.startsWith('BY CDM')) {
    const depositor = desc.includes('\\') ? desc.split('\\').pop() : '';
    return depositor ? 'Cash Deposit - ' + depositor.trim() : 'Cash Deposit';
  }
  if (desc.startsWith('UPI REFUND')) {
    const refMatch = desc.match(/RRC\s+(\d+)/);
    return 'UPI Refund' + (refMatch ? ' #' + refMatch[1] : '');
  }
  if (desc.startsWith('UPI IN/') || desc.startsWith('UPI IN ')) {
    let name = extractUPIName(desc);
    if (name && SELF_VPAS.some(v => desc.includes(v))) return 'Self Transfer (UPI IN)';
    return name ? 'UPI IN - ' + name : 'UPI Receipt';
  }
  if (desc.startsWith('UPIOUT/') || desc.startsWith('UPIOUT ')) {
    let name = extractUPIName(desc);
    if (name && SELF_VPAS.some(v => desc.includes(v))) return 'Self Transfer (UPI OUT)';
    if (desc.includes('paytmqr')) return 'UPI Payment';
    if (desc.includes('bharatpe')) return 'UPI Payment - BharatPe';
    if (desc.includes('swiggy')) return 'Swiggy';
    if (desc.includes('spotify')) return 'Spotify';
    if (desc.includes('appleservices') || desc.includes('apple')) return 'Apple Services';
    if (desc.includes('microsoft') || desc.includes('bdautopay')) return 'Microsoft';
    if (desc.includes('amzn') || desc.includes('amazon')) return 'Amazon';
    if (desc.includes('vyapar')) return 'UPI Payment - Vyapar';
    if (desc.includes('liberty') || desc.includes('videocon')) return 'Liberty Videocon';
    if (desc.includes('hpyacq')) return 'Happy Acquire';
    if (desc.includes('terratone')) return 'Terra Tone';
    if (desc.includes('shajirosmine')) return 'Shaji Rosmine';
    if (desc.includes('remashviji')) return 'Remash Viji';
    if (desc.includes('alphaentpr') || desc.includes('alpha')) return 'Alpha Enterprises';
    if (name) return 'UPI Payment - ' + name;
    return 'UPI Payment';
  }
  if (desc.startsWith('NFT/') || desc.startsWith('NFT ')) {
    const m = desc.match(/NFT\/(.+?)\s*\//);
    if (m) {
      const nftDesc = m[1].trim();
      return nftDesc.includes('Q4 ACCOUNTING') ? 'Salary - Q4 Accounting' : 'NEFT - ' + nftDesc;
    }
    return 'NEFT Transfer';
  }
  if (desc.startsWith('SBINT')) return 'Interest Credit';
  if (desc.startsWith('UPI ')) return 'UPI Transaction';
  return desc.replace(/\s+\/UPI\d*\w*$/, '').trim();
}

function extractUPIName(desc) {
  const vpaMatch = desc.match(/\/([a-z][a-z0-9._-]+)@[a-z]+/i);
  if (vpaMatch) {
    const name = vpaMatch[1].replace(/[0-9._-]/g, ' ').trim().replace(/\s+/g, ' ');
    if (name.length > 1) return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return null;
}

function getVendor(desc) {
  if (desc.startsWith('CHRG/')) return 'Federal Bank';
  const vpaMatch = desc.match(/\/([a-z][a-z0-9._-]+)@[a-z]+/i);
  if (vpaMatch && !SELF_VPAS.some(v => desc.includes(v))) return vpaMatch[1];
  if (desc.includes('paytmqr')) return 'Paytm';
  if (desc.includes('swiggy')) return 'Swiggy';
  if (desc.includes('bharatpe')) return 'BharatPe';
  if (desc.includes('spotify')) return 'Spotify';
  if (desc.includes('microsoft')) return 'Microsoft';
  if (desc.includes('amzn')) return 'Amazon';
  if (desc.includes('appleservices')) return 'Apple';
  if (desc.includes('vyapar')) return 'Vyapar';
  if (desc.includes('liberty')) return 'Liberty Videocon';
  if (desc.includes('hpyacq')) return 'HPay Acquire';
  if (desc.includes('alphaentpr')) return 'Alpha Enterprises';
  if (desc.includes('terratone')) return 'Terra Tone';
  const posName = desc.match(/POS\/\d+\/([^\\]+)/);
  return posName ? posName[1].trim() : '';
}

function parseFederal(filePath, password) {
  const scriptPath = join(PROJECT_ROOT, 'lib', 'federal_parser.py');
  let cmd = `python -X utf8 "${scriptPath}" "${filePath}"`;
  if (password) cmd += ` "${password}"`;
  const output = execSync(cmd, { encoding: 'utf-8', timeout: 60000 });
  const raw = JSON.parse(output);
  const rows = [];
  const accountLabel = 'Federal Bank Debit';
  for (const t of raw) {
    const title = cleanTitle(t.description);
    const type = t.direction === 'debit' ? 'expense' : 'income';
      const date = parseDate(t.date);
      if (!date) continue;
      rows.push({
      index: rows.length, date, title, amount: t.amount, type,
      category: '', category_id: null, paid_by: type === 'expense' ? accountLabel : '',
      paid_to: type === 'income' ? accountLabel : '',
      paid_for: type === 'expense' ? 'Me' : '', notes: t.description,
      vendor: getVendor(t.description), balance: t.balance, dr_cr: t.dr_cr,
      original_title: t.description,
    });
  }
  return rows;
}

function parseGpay(filePath, password) {
  const scriptPath = join(PROJECT_ROOT, 'lib', 'gpay_parser.py');
  let cmd = `python -X utf8 "${scriptPath}" "${filePath}"`;
  if (password) cmd += ` "${password}"`;
  const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  const raw = JSON.parse(output);
  const rows = [];
  for (const t of raw) {
    const date = parseDate(t.date);
    if (!date) continue;
    const amount = parseAmount(t.amount);
    if (amount == null) continue;
    let title = '', type = 'expense', paid_by = '', paid_to = '';
    if (t.action.startsWith('Paid to ')) {
      type = 'expense'; title = t.action.slice(8).trim();
      paid_by = extractGpayAccount(t.account);
    } else if (t.action.startsWith('Received from ')) {
      type = 'income'; title = t.action.slice(14).trim();
      paid_to = extractGpayAccount(t.account);
      paid_by = extractGpayPerson(title);
    } else if (t.action.startsWith('Self transfer ')) {
      type = 'transfer'; title = t.action;
      paid_by = extractGpayAccount(t.account);
      const destKey = t.action.slice(15).trim();
      paid_to = gpayAccountMap[destKey] || destKey;
    }
    rows.push({
      index: rows.length, date, title, amount, type,
      category: '', category_id: null, paid_by, paid_to,
      paid_for: type === 'expense' ? 'Me' : '', notes: '',
      original_title: t.action,
    });
  }
  return rows;
}

function extractGpayAccount(raw) {
  if (!raw) return '';
  for (const [key, name] of Object.entries(gpayAccountMap)) {
    if (raw.includes(key)) return name;
  }
  return raw.replace(/^Paid (by|to) /, '').trim();
}

function extractGpayPerson(title) {
  for (const [key, name] of Object.entries(gpayPersonMap)) {
    if (title.includes(key)) return name;
  }
  return title;
}

function parseDate(str) {
  if (!str) return null;
  const trimmed = str.trim();
  let m = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return trimmed.split(/[\/-]/).map(s => s.padStart(2,'0')).join('-');
  const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  const parts = trimmed.split(/[\/\-.,\s]+/).filter(Boolean);
  if (parts.length >= 3) {
    let y, mo, dy;
    for (const v of parts) {
      const lower = v.toLowerCase();
      if (months[lower] !== undefined) mo = months[lower];
      else if (v.length === 4 && /^\d{4}$/.test(v)) y = parseInt(v);
      else if (/^\d{1,2}$/.test(v)) { const n = parseInt(v); if (n <= 31) dy = n; }
    }
    if (y !== undefined && mo !== undefined && dy !== undefined)
      return `${y}-${String(mo+1).padStart(2,'0')}-${String(dy).padStart(2,'0')}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseAmount(str) {
  if (str == null) return null;
  let cleaned = String(str).replace(/[₹\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normalizeTitle(t) {
  return t.trim().replace(/\s+/g, ' ');
}

function titleSimilarity(a, b) {
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const wa = words(a), wb = words(b);
  if (!wa.length || !wb.length) return 0;
  const sa = new Set(wa), sb = new Set(wb);
  let common = 0;
  for (const w of sa) if (sb.has(w)) common++;
  return (2 * common) / (sa.size + sb.size);
}

function detectPaidFor(title) {
  const lower = title.toLowerCase();
  const found = [];
  for (const group of nameAliases) {
    if (group.split === 'Me') continue;
    if (group.aliases.some(a => lower.includes(a))) {
      if (!found.includes(group.split)) found.push(group.split);
    }
  }
  if (found.length === 0) return 'Me';
  return 'Me,' + found.join(',');
}

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
  const t = title.toLowerCase(), dt = dbTitle.toLowerCase();
  for (const group of nameAliases) {
    const inSrc = group.aliases.some(a => t.includes(a));
    const inDb = group.targets.some(a => dt.includes(a));
    if (inSrc && inDb) return true;
  }
  return false;
}

function loadTitleCleanup() {
  const rows = db.prepare('SELECT source, cleaned, category_id, confirmed FROM title_cleanup').all();
  const map = {};
  for (const r of rows) map[r.source] = r;
  return map;
}

function loadCategories() {
  const rows = db.prepare('SELECT id, name, icon, color FROM categories').all();
  const map = {};
  for (const c of rows) map[c.name.toLowerCase()] = c;
  return map;
}

function matchCategory(catName, catMap) {
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

function checkDuplicates(rows) {
  const catMap = loadCategories();
  const dupCheckStmt = db.prepare('SELECT id FROM transactions WHERE date = ? AND amount = ? AND LOWER(TRIM(title)) = LOWER(?)');
  const fuzzyByAmountStmt = db.prepare('SELECT id, title, amount, paid_by, paid_to, date FROM transactions WHERE ABS(amount - ?) < 1');

  return rows.map((row, i) => {
    const title = normalizeTitle(row.title || '');
    let duplicate = false, matchedDb = null, mergeDbId = null;

    const normDate = parseDate(row.date);
    if (normDate && row.amount && title) {
      const exact = dupCheckStmt.get(normDate, row.amount, title);
      if (exact) {
        duplicate = true; mergeDbId = exact.id;
        matchedDb = db.prepare('SELECT id, title, amount, paid_by, paid_to, date FROM transactions WHERE id = ?').get(exact.id);
      } else {
        const candidates = fuzzyByAmountStmt.all(row.amount);
        let bestScore = 0, bestMatch = null;
        const srcDate = new Date(row.date + 'T00:00:00');
        for (const c of candidates) {
          const diff = Math.abs(c.amount - row.amount);
          const dbDate = new Date(c.date + 'T00:00:00');
          const dayDiff = Math.abs((srcDate - dbDate) / 86400000);
          let score = 0;
          score += diff === 0 ? 30 : 20;
          if (dayDiff === 0) score += 30;
          else if (dayDiff <= 1) score += 20;
          else if (dayDiff <= 3) score += 10;
          else continue;
          if (matchAccount(c.paid_by, c.paid_to, row.paid_by || '', row.paid_to || '')) score += 20;
          const sim = titleSimilarity(title, c.title);
          if (sim > 0.5) score += 10;
          else if (sim > 0) score += sim * 8;
          if (personAliasMatch(title, c.title)) score += 10;
          if (score > bestScore) { bestScore = score; bestMatch = c; }
        }
        if (bestMatch && bestScore >= 50) {
          duplicate = true; matchedDb = bestMatch; mergeDbId = bestMatch.id;
        }
      }
    }
    const matched = matchCategory(row.category || '', catMap);
    return { ...row, title, category_id: matched ? matched.id : null, category_name: matched ? matched.name : null, duplicate, matchedDb, mergeDbId };
  });
}

function applyTitleCleanup(rows, cleanupMap) {
  return rows.map(row => {
    const entry = cleanupMap[row.original_title || row.title];
    if (entry && entry.confirmed) {
      return { ...row, title: entry.cleaned, category_id: entry.category_id || row.category_id };
    }
    return row;
  });
}

function parseSupportingEntries(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim());
    const entry = {};
    headers.forEach((h, idx) => { if (idx < vals.length) entry[h] = vals[idx]; });
    entries.push(entry);
  }
  return entries;
}

function matchSupportingEntries(rows, supportingEntries) {
  if (!supportingEntries.length) return rows;
  return rows.map(row => {
    let matched = null;
    for (const e of supportingEntries) {
      const eDate = e.date || '';
      const dateMatch = eDate && (eDate === row.date || Math.abs(new Date(eDate) - new Date(row.date)) / 86400000 <= 1);
      const titleOverlap = e.title ? titleSimilarity(e.title, row.title) >= 0.5 : false;
      if (dateMatch && titleOverlap) { matched = e; break; }
      const amountMatch = e.amount && Math.abs(parseFloat(e.amount) - row.amount) < 1;
      if (dateMatch && amountMatch) { matched = e; break; }
    }
    if (!matched) return row;
    const updated = { ...row };
    if (matched.title) updated.title = matched.title;
    if (matched.amount) updated.amount = parseFloat(matched.amount);
    if (matched.type) updated.type = matched.type;
    if (matched.category) updated.category = matched.category;
    if (matched.paid_by) updated.paid_by = matched.paid_by;
    if (matched.paid_to) updated.paid_to = matched.paid_to;
    if (matched.paid_for) updated.paid_for = matched.paid_for;
    updated._enrichedBySupport = true;
    return updated;
  });
}

function askQuestion(query) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(query, answer => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

async function resolveFuzzyDuplicates(rows, autoAccept) {
  const fuzzy = rows.filter(r => r.duplicate && !r.mergeDbId);
  if (!fuzzy.length) return { resolved: rows, merged: [], skipped: [] };
  const fuzzyDetails = fuzzy.map(r => ({
    index: r.index, date: r.date, title: r.title, amount: r.amount,
    matched: { id: r.matchedDb?.id, title: r.matchedDb?.title, amount: r.matchedDb?.amount, date: r.matchedDb?.date, score: null }
  }));
  log(`\n⚠  ${fuzzy.length} fuzzy duplicate(s) detected:`);
  for (const f of fuzzyDetails) {
    log(`  [${f.index}] ${f.date} | ${f.title} | ₹${f.amount}`);
    log(`       ↳ Matches DB row #${f.matched.id}: "${f.matched.title}" (${f.matched.date}, ₹${f.matched.amount})`);
  }
  for (const row of fuzzy) {
    if (autoAccept) {
      row._action = 'keep'; continue;
    }
    const ans = await askQuestion(`  Keep as new entry (k) / Merge into existing (m) / Skip (s)? [k/m/s] `);
    if (ans === 'm') row._action = 'merge';
    else if (ans === 's') row._action = 'skip';
    else row._action = 'keep';
  }
  const kept = [], merged = [], skipped = [];
  for (const r of rows) {
    if (r._action === 'merge') merged.push(r);
    else if (r._action === 'skip') skipped.push(r);
    else kept.push(r);
  }
  return { resolved: kept, merged, skipped };
}

function detectAccounts(rows, bankType) {
  if (bankType === 'federal') return 'Federal Bank Debit';
  if (bankType === 'gpay') return extractGpayAccount('Federal Bank 8796');
  const paidByAccounts = [...new Set(rows.filter(r => r.paid_by).map(r => r.paid_by))];
  if (paidByAccounts.length === 1) return paidByAccounts[0];
  for (const a of paidByAccounts) if (a.toLowerCase().includes('federal')) return a;
  for (const a of paidByAccounts) if (a.toLowerCase().includes('icici')) return a;
  for (const a of paidByAccounts) if (a.toLowerCase().includes('sbi')) return a;
  return paidByAccounts[0] || 'Unknown';
}

function insertRows(rows, filename) {
  const txStmt = db.prepare(`INSERT INTO transactions (date, title, amount, type, category_id, paid_by, paid_to, paid_for, notes)
    VALUES (@date, @title, @amount, @type, @category_id, @paid_by, @paid_to, @paid_for, @notes)`);
  const mergeStmt = db.prepare(`UPDATE transactions SET title = @title, amount = @amount, paid_by = @paid_by, paid_to = @paid_to WHERE id = @id`);
  const titleVendorsStmt = db.prepare('SELECT COUNT(*) as c FROM title_vendors WHERE canonical = ?');
  const tvInsert = db.prepare('INSERT INTO title_vendors (vendor, item, canonical, count) VALUES (@vendor, @item, @canonical, 1)');
  const tvIncrement = db.prepare('UPDATE title_vendors SET count = count + 1 WHERE canonical = ?');
  const cleanupUpsert = db.prepare(`INSERT INTO title_cleanup (source, cleaned, category_id, confirmed)
    VALUES (@source, @cleaned, @category_id, 1) ON CONFLICT(source) DO UPDATE SET cleaned = @cleaned, category_id = @category_id, confirmed = 1`);
  const logStmt = db.prepare(`INSERT INTO import_log (filename, row_count, new_accounts, new_people, merge_count) VALUES (?, ?, ?, ?, ?)`);

  let newCount = 0, mergeCount = 0;
  const parseTitle = (t) => {
    const cleaned = normalizeTitle(t);
    const parts = cleaned.split(' - ');
    if (parts.length >= 2) return { vendor: parts[0].trim(), item: parts.slice(1).join(' - ').trim(), canonical: cleaned };
    return { vendor: cleaned, item: '', canonical: cleaned };
  };

  const doInsert = db.transaction(() => {
    for (const row of rows) {
      if (row.mergeDbId) {
        mergeStmt.run({ id: row.mergeDbId, title: row.title, amount: row.amount, paid_by: row.paid_by || '', paid_to: row.paid_to || '' });
        mergeCount++;
      } else {
        txStmt.run({
          date: row.date, title: row.title, amount: row.amount, type: row.type || 'expense',
          category_id: row.category_id || null, paid_by: row.paid_by || '', paid_to: row.paid_to || '',
          paid_for: row.paid_for || 'Me', notes: row.notes || ''
        });
        const tv = parseTitle(row.title);
        const existing = titleVendorsStmt.get(tv.canonical);
        if (existing?.c > 0) tvIncrement.run(tv.canonical);
        else tvInsert.run(tv);
        if (row.original_title) {
          cleanupUpsert.run({ source: row.original_title, cleaned: row.title, category_id: row.category_id });
        }
        newCount++;
      }
    }
    logStmt.run(filename || 'statement', rows.length, 0, 0, mergeCount);
  });
  doInsert();
  return { newCount, mergeCount };
}

async function main() {
  const args = parseArgs();
  if (!args.path) {
    log('Usage: node scripts/ingest-statement.js --path <file> [--password <pw>] [--bank auto|federal|gpay] [--confirm] [--confirm-fuzzy]');
    process.exit(1);
  }

  log(`\n🔍 Ingesting statement: ${args.path}`);
  log(`   Bank type: ${args.bank}   Confirm: ${args.confirm ? 'yes' : 'no'}`);

  if (!existsSync(args.path)) {
    log(`❌ File not found: ${args.path}`);
    process.exit(1);
  }

  try {
    db = new Database(join(DATA_DIR, 'lazarus.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    log(`✓ Connected to ${join(DATA_DIR, 'lazarus.db')}`);
  } catch (e) {
    log(`❌ DB connection failed: ${e.message}`);
    process.exit(1);
  }

  let rows, bankType = args.bank;
  try {
    if (bankType === 'gpay') {
      rows = parseGpay(args.path, args.password || '');
      bankType = 'gpay';
    } else {
      try {
        rows = parseFederal(args.path, args.password || '');
        bankType = 'federal';
      } catch (e) {
        const msg = e.message || '';
        if (/decrypt/i.test(msg) || /encrypt/i.test(msg)) {
          log(`❌ PDF requires password. Provide via --password`);
          process.exit(1);
        }
        if (bankType === 'auto') {
          rows = parseGpay(args.path, args.password || '');
          bankType = 'gpay';
        } else { throw e; }
      }
    }
    log(`✓ Parsed ${rows.length} rows (${bankType})`);
  } catch (e) {
    log(`❌ Parse failed: ${e.message}`);
    process.exit(1);
  }

  rows = rows.filter(r => r.title && r.title.trim());
  log(`✓ ${rows.length} rows after filtering blanks`);

  const cleanupMap = loadTitleCleanup();
  rows = applyTitleCleanup(rows, cleanupMap);

  const supportingEntries = args.supportingEntries ? parseSupportingEntries(args.supportingEntries) : [];
  if (supportingEntries.length) {
    rows = matchSupportingEntries(rows, supportingEntries);
    log(`✓ ${supportingEntries.length} supporting entries applied`);
  }

  const catMap = loadCategories();
  rows = checkDuplicates(rows);

  for (const row of rows) {
    if ((row.paid_for === 'Me' || !row.paid_for) && row.type === 'expense') {
      row.paid_for = detectPaidFor(row.original_title || row.title);
    } else if (row.type !== 'expense') {
      row.paid_for = '';
    }
    if (!row.category_id) {
      const matched = matchCategory(row.category || row.title, catMap);
      if (matched) row.category_id = matched.id;
    }
  }

  const exactDuplicates = rows.filter(r => r.duplicate && r.mergeDbId);
  const exactDupCount = exactDuplicates.length;
  const nonDups = rows.filter(r => !r.duplicate || (r.duplicate && !r.mergeDbId));

  const { resolved: finalRows, merged: mergedRows, skipped: skippedRows } = await resolveFuzzyDuplicates(nonDups, args.confirmFuzzy);

  const account = detectAccounts(rows, bankType);

  log(`\n📋 Summary:`);
  log(`   Bank Account: ${account}`);
  log(`   Total parsed: ${rows.length}`);
  log(`   Exact dup (auto-skipped): ${exactDupCount}`);
  log(`   Fuzzy dup (merged): ${mergedRows.length}`);
  log(`   Fuzzy dup (skipped): ${skippedRows.length}`);
  log(`   Ready to insert: ${finalRows.filter(r => !r.mergeDbId).length} new + ${finalRows.filter(r => r.mergeDbId).length} merge`);
  log(`\n📄 Preview (first ${Math.min(5, finalRows.length)} rows):`);
  for (const r of finalRows.slice(0, 5)) {
    log(`   ${r.date} | ₹${r.amount} | ${r.title} | ${r.paid_for} | ${r.category_name || '?'}`);
  }

  if (!args.confirm) {
    const answer = await askQuestion(`\n❓ Insert ${finalRows.filter(r => !r.mergeDbId).length} new + merge ${finalRows.filter(r => r.mergeDbId).length} rows? (yes/no) `);
    if (answer !== 'yes') {
      log('⏹  Cancelled by user.');
      process.exit(0);
    }
  }

  const result = insertRows(finalRows, args.path.split(/[/\\]/).pop());
  log(`\n✅ Import complete!`);
  log(`   Inserted: ${result.newCount} new`);
  log(`   Merged: ${result.mergeCount}`);

  const importLog = db.prepare('SELECT last_insert_rowid() as id').get();
  log(`   Import log ID: #${importLog.id}`);

  const output = {
    success: true,
    account,
    bankType,
    totalFound: rows.length,
    inserted: result.newCount,
    merged: result.mergeCount,
    skippedExact: exactDupCount,
    skippedFuzzy: skippedRows.length,
    importLogId: importLog.id,
    filename: args.path.split(/[/\\]/).pop(),
  };
  console.log(JSON.stringify(output, null, 2));

  db.close();
}

main().catch(e => {
  log(`❌ Fatal: ${e.message}`);
  process.exit(1);
});
