import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const accountMap = {
  'Federal Bank 8796': 'Federal Bank Debit',
  'ICICI Bank 0454': 'ICICI Debit',
  'State Bank of India 2690': 'SBI Debit'
};

const personMap = {
  'Celine Paulson': 'Family',
  'Sola Paulson': 'Sister'
};

function extractAccountName(raw) {
  if (!raw) return '';
  for (const [key, name] of Object.entries(accountMap)) {
    if (raw.includes(key)) return name;
  }
  return raw.replace(/^Paid (by|to) /, '').trim();
}

function extractPersonName(title) {
  for (const [key, name] of Object.entries(personMap)) {
    if (title.includes(key)) return name;
  }
  return title;
}

function parseDate(str) {
  if (!str) return null;
  const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  const trimmed = str.trim();
  const numMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (numMatch) {
    const dd = parseInt(numMatch[1]), mo = parseInt(numMatch[2]) - 1, y = parseInt(numMatch[3]);
    return y + '-' + String(mo + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  }
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    return trimmed.split(/[\/\-]/).map(s => s.padStart(2, '0')).join('-');
  }
  const parts = trimmed.split(/[\/\-.,\s]+/).filter(Boolean);
  if (parts.length >= 3) {
    let y, m, day;
    for (const v of parts) {
      const lower = v.toLowerCase();
      if (months[lower] !== undefined) m = months[lower];
      else if (v.length === 4 && /^\d{4}$/.test(v)) y = parseInt(v);
      else if (/^\d{1,2}$/.test(v)) { const n = parseInt(v); if (n <= 31) day = n; }
    }
    if (y !== undefined && m !== undefined && day !== undefined) {
      return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parseAmount(str) {
  if (!str) return null;
  const cleaned = str.replace(/[,₹\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parsePdf(filePath, password = '') {
  if (!existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  const scriptPath = fileURLToPath(new URL('../../../../lib/gpay_parser.py', import.meta.url));
  let cmd = 'python -X utf8 "' + scriptPath + '" "' + filePath + '"';
  if (password) cmd += ' "' + password + '"';
  const output = execSync(cmd, {
    encoding: 'utf-8',
    timeout: 30000
  });

  const raw = JSON.parse(output);
  const rows = [];

  for (const t of raw) {
    const date = parseDate(t.date);
    if (!date) continue;

    const amount = parseAmount(t.amount);
    if (amount == null) continue;

    let title = '';
    let type = 'expense';
    let paid_by = '';
    let paid_to = '';

    if (t.action.startsWith('Paid to ')) {
      type = 'expense';
      title = t.action.slice(8).trim();
      paid_by = extractAccountName(t.account);
    } else if (t.action.startsWith('Received from ')) {
      type = 'income';
      title = t.action.slice(14).trim();
      paid_to = extractAccountName(t.account);
      paid_by = extractPersonName(title);
    } else if (t.action.startsWith('Self transfer ')) {
      type = 'transfer';
      title = t.action;
      paid_by = extractAccountName(t.account);
      const destKey = t.action.slice(15).trim();
      paid_to = accountMap[destKey] || destKey;
    }

    rows.push({
      index: rows.length,
      date,
      title,
      amount,
      type,
      category: '',
      category_id: null,
      category_name: '',
      paid_by,
      paid_to,
      paid_for: type === 'expense' ? 'Me' : '',
      notes: '',
      duplicate: false,
      selected: true
    });
  }

  return rows;
}
