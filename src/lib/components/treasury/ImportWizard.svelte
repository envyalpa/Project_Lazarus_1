<script>
  import { Upload, Search, SearchCheck, CheckCheck, AlertTriangle, CircleCheck, ArrowLeft, EyeOff, Trash2, Merge, PlusCircle, SkipForward } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import BatchFileProgress from './BatchFileProgress.svelte';
  import ReconcileStep from './ReconcileStep.svelte';

  let { data, ondone } = $props();

  let step = $state(0);
  let rawRows = $state([]);
  let parsedRows = $state([]);
  let fileContent = $state('');
  let isDragging = $state(false);
  let loading = $state(false);
  let error = $state('');
  let result = $state(null);
  let entityMap = $state({});
  let filename = $state('');
  let checked = $state(false);
  let pdfContent = $state('');
  let showPdfPrompt = $state(false);
  let pdfPassword = $state('');
  let showPwd = $state(false);
  let bankType = $state('');
  let duplicatesFound = $state(false);
  let duplicateRows = $state([]);
  let uniqueRows = $state([]);
  let mergeActions = $state({});
  let checkTab = $state('duplicates');
  let catMapConfig = $state({});
  let detectedHeaders = $state([]);
  let useDebitCredit = $state(false);
  let titleCleanupMap = $state({});
  let importRules = $state(data?.rules || null);
  const paidForOpts = ['Me', 'Wife', 'Sister', 'Family'];

  let multiFiles = $state([]);
  let fileResults = $state({});
  let isMultiFile = $state(false);
  let allParsedTemp = $state([]);
  let showReconcile = $state(false);
  let baseSourceFile = $state('');
  let showBaseSelector = $state(false);
  let resumeAvailable = $state(null);
  let reconcileState = $state(null);
  let reconcileCurrentIndex = $state(0);
  let reconcileTotal = $state(0);

  const SAVE_KEY = 'lazarus-import-wizard';
  const RECONCILE_SAVE_KEY = 'lazarus-reconcile-state';

  const steps = ['Upload', 'Check', 'Reconcile', 'Select', 'Clean', 'Map', 'Preview', 'Confirm'];

  function saveState() {
    if (!checked && step < 2) return;
    const state = {
      version: 1, timestamp: Date.now(), step, parsedRows, checked,
      duplicatesFound, mergeActions, checkTab, baseSourceFile,
      isMultiFile, filename, useDebitCredit, detectedHeaders,
      titleCleanupMap, entityMap, catMapConfig, importRules,
      reconcileState
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function restoreState(saved) {
    step = saved.step;
    parsedRows = saved.parsedRows;
    checked = saved.checked;
    duplicatesFound = saved.duplicatesFound;
    mergeActions = saved.mergeActions || {};
    checkTab = saved.checkTab || 'duplicates';
    baseSourceFile = saved.baseSourceFile || '';
    isMultiFile = saved.isMultiFile || false;
    filename = saved.filename || '';
    useDebitCredit = saved.useDebitCredit || false;
    detectedHeaders = saved.detectedHeaders || [];
    titleCleanupMap = saved.titleCleanupMap || {};
    entityMap = saved.entityMap || {};
    catMapConfig = saved.catMapConfig || {};
    importRules = saved.importRules || data?.rules || null;
    reconcileState = saved.reconcileState || null;
    resumeAvailable = null;
  }

  function clearSavedState() {
    localStorage.removeItem(SAVE_KEY);
  }

  $effect(() => {
    if (step >= 1 && step <= 6 && checked) {
      const timer = setTimeout(() => saveState(), 500);
      return () => clearTimeout(timer);
    }
  });

  $effect(() => {
    if (step > 0 && parsedRows.length > 0) return;
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === 1 && parsed.step >= 1 && parsed.step <= 6 && parsed.parsedRows?.length) {
          resumeAvailable = parsed;
        }
      } catch { localStorage.removeItem(SAVE_KEY); }
    }
  });

  function parseCSVRow(line) {
    const vals = [];
    let cur = '';
    let q = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { vals.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    vals.push(cur.trim());
    return vals;
  }

  function extractNameFromUrl(val) {
    if (!val) return '';
    const trimmed = val.trim();
    const m = trimmed.match(/^(.+?)\s+\(https?:\/\/.+\)$/);
    return m ? m[1].trim() : trimmed;
  }

  function sourceLabel(name) {
    const lower = (name || '').toLowerCase();
    if (lower.includes('notion')) return 'Notion';
    if (lower.includes('sheet')) return 'Sheets';
    if (lower.endsWith('.csv')) return 'CSV';
    if (lower.includes('gpay')) return 'GPay';
    return 'Bank';
  }

  function normalizeAmount(v) {
    if (v == null || v === '') return null;
    let s = String(v).replace(/[₹\s]/g, '');
    if (s.includes('.')) {
      const parts = s.split('.');
      parts[0] = parts[0].replace(/,/g, '');
      s = parts.join('.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { inQuote = !inQuote; }
      if (c === '\n' && !inQuote) { lines.push(current); current = ''; continue; }
      if (c === '\r') continue;
      current += c;
    }
    if (current) lines.push(current);
    if (!lines.length) return [];
    const headerVals = parseCSVRow(lines[0]);
    const headers = headerVals.map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = parseCSVRow(lines[i]);
      const row = {};
      for (let k = 0; k < headers.length; k++) row[headers[k]] = vals[k] || '';
      rows.push(row);
    }
    return rows;
  }

  let pendingPdfFile = $state(null);
  let pendingPdfContent = $state('');

  function parseFileAsCsv(file, text) {
    const raw = parseCSV(text);
    if (!raw.length) return [];
    const headers = Object.keys(raw[0]);
    const hdrLower = headers.map(h => h.toLowerCase().trim());
    const findCol = (...names) => { for (const n of names) { const idx = hdrLower.indexOf(n.toLowerCase()); if (idx >= 0) return headers[idx]; } return null; };
    const titleCol = findCol('Income/Expense','Expense','Title','Particulars','Description','Narration','Transaction','Transaction Description','Details','Name','Transaction Details','Memo','Item','Product','Service','Bill','Head','Ledger');
    const amountCol = findCol('Amount','Transaction Amount','Value','Sum','INR','Rupees','Charges','Paid','Debit','Withdrawal','Withdrawn','Dr');
    const catCol = findCol('Category','Categories','Category1','Group','Spend Category','Merchant Category','Subcategory','Ledger Group','Division','Type2');
    const paidByCol = findCol('Paid By','Paid from','Payer','Debit Account','paid_by','From','Source','Card/Source');
    const paidToCol = findCol('Paid To','Paid to','Beneficiary','Payee','Credit Account','Merchant','Vendor','Pay To','Payee Name','Party','Counterparty','paid_to','To','Destination');
    const paidForCol = findCol('Paid For','Paid for','Split','Split with','paid_for','For');
    const dateCol = findCol('Date','Transaction Date','Posting Date','Value Date','Transaction Date','Datetime','Day');
    const typeCol = findCol('Type','type','Transaction Type','Tran Type');
    const notesCol = findCol('Notes','Note','Remarks','Memo','Comment');
    const creditCol = findCol('Credit','Deposit','Cr','Income');
    const debitCol = findCol('Debit','Withdrawal','Withdrawn','Dr','Expense');
    const hasDebitCredit = !!debitCol && !!creditCol;
    const firstRow = raw[0];
    const mapped = {};
    if (titleCol) mapped['Title'] = titleCol;
    if (amountCol) mapped['Amount'] = amountCol;
    if (catCol) mapped['Category'] = catCol;
    if (paidByCol) mapped['Paid By'] = paidByCol;
    if (paidToCol) mapped['Paid To'] = paidToCol;
    if (paidForCol) mapped['Paid For'] = paidForCol;
    if (dateCol) mapped['Date'] = dateCol;
    if (typeCol) mapped['Type'] = typeCol;
    if (notesCol) mapped['Notes'] = notesCol;
    if (creditCol) mapped['Credit'] = creditCol;
    if (debitCol) mapped['Debit'] = debitCol;
    detectedHeaders = Object.entries(mapped).map(([label, col]) => [label, col, (firstRow[col] || '(empty)').substring(0, 40)]);
    useDebitCredit = hasDebitCredit;
    return raw.map((r, i) => ({
      index: i, date: dateCol ? (r[dateCol] || '') : '',
      title: titleCol ? extractNameFromUrl(r[titleCol]) : '',
      amount: (() => {
        if (hasDebitCredit) {
          const debitVal = r[debitCol];
          const creditVal = r[creditCol];
          if (debitVal && creditVal) return debitVal;
          if (debitVal) return debitVal;
          if (creditVal) return creditVal;
        }
        return amountCol ? (r[amountCol] || '') : '';
      })(),
      type: (() => {
        const dt = (typeCol ? (r[typeCol] || '') : '').toLowerCase();
        if (dt) return dt;
        if (hasDebitCredit && r[creditCol]) return 'income';
        return 'expense';
      })(),
      category: catCol ? extractNameFromUrl(r[catCol] || '') : '',
      paid_by: paidByCol ? extractNameFromUrl(r[paidByCol] || '') : '',
      paid_to: paidToCol ? extractNameFromUrl(r[paidToCol] || '') : '',
      paid_for: paidForCol ? extractNameFromUrl(r[paidForCol] || '') : '',
      notes: notesCol ? extractNameFromUrl(r[notesCol] || '') : '',
      duplicate: false, selected: true
    }));
  }

  async function handleFiles(files) {
    error = '';
    multiFiles = [...files];
    isMultiFile = files.length > 1;
    fileResults = {};
    allParsedTemp = [];
    loading = true;
    filename = files.length === 1 ? files[0].name : files.length + ' files';

    for (const file of files) {
      fileResults[file.name] = { status: 'parsing' };
      fileResults = { ...fileResults };
      try {
        let rows = [];
        if (file.name.toLowerCase().endsWith('.pdf')) {
          const reader = new FileReader();
          const content = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          const res = await fetch('/settings/treasury/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'parse-pdf', filename: file.name, content, password: '', bankType: bankType || undefined })
          });
          const json = await res.json();
          if (json.error === 'ENCRYPTED') {
            pendingPdfFile = file;
            pendingPdfContent = content;
            showPdfPrompt = true;
            loading = false;
            return;
          }
          if (json.error) throw new Error(json.error);
          rows = json.rows;
        } else {
          const text = await file.text();
          rows = parseFileAsCsv(file, text);
        }
        allParsedTemp.push(...rows.map(r => ({ ...r, _sourceFile: file.name })));
        fileResults[file.name] = { status: 'done', count: rows.length };
      } catch (e) {
        fileResults[file.name] = { status: 'error', error: e.message };
      }
      fileResults = { ...fileResults };
    }
    finishBatch();
  }

  async function retryPdfFile() {
    loading = true; error = '';
    const file = pendingPdfFile;
    try {
      const res = await fetch('/settings/treasury/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-pdf', filename: file.name, content: pendingPdfContent, password: pdfPassword || '', bankType: bankType || undefined })
      });
      const json = await res.json();
      if (json.error === 'ENCRYPTED') { error = 'Incorrect password'; loading = false; return; }
      if (json.error) { error = json.error; loading = false; return; }
      showPdfPrompt = false;
      const rows = json.rows.map(r => ({ ...r, _sourceFile: file.name }));
      allParsedTemp.push(...rows);
      fileResults[file.name] = { status: 'done', count: rows.length };
      pendingPdfFile = null;
      pendingPdfContent = '';
      pdfPassword = '';
      fileResults = { ...fileResults };
      // Resume processing remaining files in batch
      for (const f of multiFiles) {
        if (f.name === file.name) continue;
        if (fileResults[f.name]?.status === 'done' || fileResults[f.name]?.status === 'error') continue;
        fileResults[f.name] = { status: 'parsing' };
        fileResults = { ...fileResults };
        try {
          let rows = [];
          if (f.name.toLowerCase().endsWith('.pdf')) {
            const reader = new FileReader();
            const content = await new Promise((resolve, reject) => {
              reader.onload = (e) => resolve(e.target.result.split(',')[1]);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(f);
            });
            const res = await fetch('/settings/treasury/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'parse-pdf', filename: f.name, content, password: '', bankType: bankType || undefined })
            });
            const json2 = await res.json();
            if (json2.error) throw new Error(json2.error);
            rows = json2.rows;
          } else {
            const text = await f.text();
            rows = parseFileAsCsv(f, text);
          }
          allParsedTemp.push(...rows.map(r => ({ ...r, _sourceFile: f.name })));
          fileResults[f.name] = { status: 'done', count: rows.length };
        } catch (e2) {
          fileResults[f.name] = { status: 'error', error: e2.message };
        }
        fileResults = { ...fileResults };
      }
      finishBatch();
    } catch (e) { error = 'Failed: ' + e.message; }
    loading = false;
  }

  async function processPdfWithPassword() {
    await retryPdfFile();
  }

  function cancelPdfPrompt() {
    showPdfPrompt = false;
    if (pendingPdfFile) {
      fileResults[pendingPdfFile.name] = { status: 'error', error: 'Cancelled' };
      fileResults = { ...fileResults };
      pendingPdfFile = null;
      pendingPdfContent = '';
    }
    pdfPassword = '';
    finishBatch();
  }

  function finishBatch() {
    if (allParsedTemp.length > 0) {
      allParsedTemp = allParsedTemp.filter(r => r.title && r.title.trim());
      parsedRows = allParsedTemp.map((r, i) => ({ ...r, index: i }));
      useDebitCredit = false;
      checked = false;
    }
    loading = false;
    if (parsedRows.length > 0) {
      if (isMultiFile) {
        showBaseSelector = true;
      } else {
        step = 1;
      }
    }
  }

  function confirmBaseSource() {
    if (!baseSourceFile) return;
    showBaseSelector = false;
    step = 1;
  }

  function parseDateForMatch(d) {
    if (!d) return null;
    const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const numMatch = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (numMatch) {
      return new Date(parseInt(numMatch[3]), parseInt(numMatch[2]) - 1, parseInt(numMatch[1]));
    }
    const isoMatch = d.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    const parts = d.split(/[\/\-.,\s]+/).filter(Boolean);
    if (parts.length >= 3) {
      let y, m, day;
      for (const v of parts) {
        const lower = v.toLowerCase();
        if (months[lower] !== undefined) m = months[lower];
        else if (v.length === 4 && /^\d{4}$/.test(v)) y = parseInt(v);
        else if (/^\d{1,2}$/.test(v)) { const n = parseInt(v); if (n <= 31) day = n; }
      }
      if (y !== undefined && m !== undefined && day !== undefined) return new Date(y, m, day);
    }
    const d2 = new Date(d);
    return isNaN(d2.getTime()) ? null : d2;
  }

  function getDateStr(d) {
    const dt = parseDateForMatch(d);
    if (!dt) return '';
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }

  function wordOverlap(a, b) {
    const words = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    const wa = words(a), wb = words(b);
    if (!wa.length || !wb.length) return 0;
    const sa = new Set(wa), sb = new Set(wb);
    let common = 0;
    for (const w of sa) { if (sb.has(w)) common++; }
    return (2 * common) / (sa.size + sb.size);
  }

  function checkEquivalence(titleA, titleB, equivalences) {
    if (!equivalences) return false;
    const lowA = (titleA || '').toLowerCase().trim();
    const lowB = (titleB || '').toLowerCase().trim();
    for (const pair of equivalences) {
      const [e1, e2] = pair.map(s => s.toLowerCase().trim());
      if ((lowA === e1 && lowB === e2) || (lowA === e2 && lowB === e1)) return true;
    }
    return false;
  }

  function matchPersonNames(titleA, titleB, personMap) {
    if (!personMap) return false;
    const lowA = (titleA || '').toLowerCase();
    const lowB = (titleB || '').toLowerCase();
    for (const [canonical, variants] of Object.entries(personMap)) {
      const names = [canonical, ...variants];
      if (names.some(n => lowA.includes(n)) && names.some(n => lowB.includes(n))) return true;
    }
    return false;
  }

  function scoreMatchPair(sup, base) {
    const cfg = importRules?.scoring || {};
    const eqPts = cfg.titleEquivalenceMatch || 40;
    const personPts = cfg.personNameMatch || 20;
    const wordPts = cfg.titleWordOverlap || 15;
    const catPts = cfg.categoryMatch || 10;

    const supAmt = normalizeAmount(sup.amount);
    const baseAmt = normalizeAmount(base.amount);
    if (supAmt == null || baseAmt == null || supAmt === 0 || baseAmt === 0) return 0;

    const amountMatch = importRules?.matching?.amount !== 'exact' || supAmt === baseAmt;
    if (!amountMatch) return 0;

    const supDate = getDateStr(sup.date);
    const baseDate = getDateStr(base.date);
    if (!supDate || !baseDate) return 0;

    const dateMatch = importRules?.matching?.date !== 'exact' || supDate === baseDate;
    if (!dateMatch) return 0;

    let score = 0;
    if (supAmt === baseAmt) {
      if (supDate === baseDate) {
        score += (cfg.exactAmount || 50) + (cfg.exactDate || 30);
      } else {
        score += Math.round((cfg.exactAmount || 50) * 0.5);
      }
    }

    const sTitle = sup.title || '';
    const bTitle = base.title || '';

    score += wordOverlap(sTitle, bTitle) * wordPts;

    if (checkEquivalence(sTitle, bTitle, importRules?.titleEquivalences)) score += eqPts;
    if (matchPersonNames(sTitle, bTitle, importRules?.personNames)) score += personPts;

    const supCat = (sup.category || '').toLowerCase().trim();
    const baseCat = (base.category || '').toLowerCase().trim();
    if (supCat && baseCat && (supCat === baseCat || supCat.includes(baseCat) || baseCat.includes(supCat))) {
      score += catPts;
    }

    return score;
  }

  function hasReconcileGroups(rows) {
    if (!baseSourceFile || !isMultiFile) return false;
    const supportingRows = rows.filter(r => r._sourceFile !== baseSourceFile);
    if (supportingRows.length === 0) return false;
    const baseRows = rows.filter(r => r._sourceFile === baseSourceFile);
    const threshold = importRules?.matching?.threshold || 65;

    for (const sup of supportingRows) {
      for (const base of baseRows) {
        if (scoreMatchPair(sup, base) >= threshold) return true;
      }
    }
    return false;
  }

  function proceedFromCheck() {
    if (hasReconcileGroups(parsedRows)) {
      step = 2;
    } else {
      step = 3;
    }
  }

  function onReconcileDone(reconciled) {
    parsedRows = reconciled;
    step = 3;
  }

  async function checkDuplicates() {
    loading = true; error = '';
    try {
      const res = await fetch('/settings/treasury/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-duplicates', rows: parsedRows })
      });
      const json = await res.json();
      if (json.rows) {
        const sourceMap = {};
        for (const r of parsedRows) sourceMap[r.index] = r._sourceFile;
        parsedRows = json.rows;
        for (const r of parsedRows) r._sourceFile = sourceMap[r.index] || '';
        for (const r of parsedRows) {
          if (r.duplicate) r.selected = false;
        }
        checked = true;
        duplicatesFound = parsedRows.some(r => r.duplicate);
        duplicateRows = parsedRows.filter(r => r.duplicate);
        uniqueRows = parsedRows.filter(r => !r.duplicate);
        mergeActions = {};
        for (const r of duplicateRows) mergeActions[r.index] = 'skip';
        checkTab = 'duplicates';
      } else { error = 'Server returned unexpected response'; }
    } catch (e) { error = 'Failed to check duplicates: ' + e.message; }
    loading = false;
  }

  function toggleSelect(idx) {
    const r = parsedRows[idx];
    if (r.duplicate) return;
    r.selected = !r.selected;
  }

  function selectAll(sel) {
    for (const r of parsedRows) {
      if (!r.duplicate) r.selected = sel;
    }
  }

  function looksLikeDateOrYear(s) {
    return /^\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{2}-\d{2}-\d{4}$/.test(s) || /^\d{4}\/\d{2}\/\d{2}$/.test(s);
  }

  function parseTitleForVendor(title) {
    if (!title) return { vendor: '', item: '' };
    const trimmed = title.trim();
    if (looksLikeDateOrYear(trimmed)) return { vendor: '', item: trimmed };
    const parts = trimmed.split(' - ');
    const first = parts[0].trim();
    if (parts.length >= 2 && looksLikeDateOrYear(first)) {
      return { vendor: parts.slice(1).join(' - ').trim(), item: first };
    }
    return parts.length >= 2 ? { vendor: first, item: parts.slice(1).join(' - ').trim() } : { vendor: trimmed, item: '' };
  }

  function normalizeCase(str) {
    const letters = str.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 2) return str;
    const upper = letters.replace(/[a-z]/g, '').length;
    if (upper / letters.length > 0.6) {
      return str.split(/\s+/).map(w => {
        if (w.length <= 1) return w.toUpperCase();
        const special = ['McDonald', 'iPhone', 'iPad', 'iPod', 'MacBook', 'McDonalds'];
        for (const s of special) {
          if (w.toLowerCase() === s.toLowerCase()) return s;
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }
    return str;
  }

  function cleanTitle(title) {
    if (!title) return '';
    const trimmed = title.trim();
    if (looksLikeDateOrYear(trimmed)) return trimmed;
    const normalized = normalizeCase(trimmed);
    const parts = normalized.split(' - ');
    if (parts.length >= 2) {
      const known = ['swiggy','instamart','blinkit','zomato','uber','kfc','amazon','meesho','lulu','supreme','karshaka','airtel','asianet','spotify','crunchyroll','udemy','pvr','subway','taco','terratone','minnal','gowri','aashirvad','bookmyshow','irctc','mohanan','tumbldry','allen','solly','apollo','milano','federal','icici','sbi','family','sister','wife','wifey','mom','sola','arnold','merlin','normandy','mydesignation','microsoft','google','godaddy'];
      const a = parts[0].trim().toLowerCase();
      const b = parts.slice(1).join(' - ').trim().toLowerCase();
      if (known.includes(b) && !known.includes(a)) {
        return parts.slice(1).join(' - ').trim() + ' - ' + parts[0].trim();
      }
    }
    return normalized;
  }

  let selectedRows = $derived(parsedRows.filter(r => r.selected));

  let titleCategoryMap = $state({});
  let confirmedSet = $state(new Set());

  let unconfirmedGroups = $derived(titleGroups.filter(g => !confirmedSet.has(g.key)));
  let confirmedGroups = $derived(titleGroups.filter(g => confirmedSet.has(g.key)));

  let titleGroups = $derived.by(() => {
    const map = {};
    for (const r of selectedRows) {
      const key = (r.title || '').toLowerCase();
      if (!map[key]) {
        const originals = new Set();
        map[key] = { key, originals, original: r.title, cleaned: cleanTitle(r.title), count: 0, sampleCategory: null };
      }
      map[key].originals.add(r.title);
      map[key].count++;
      if (!map[key].sampleCategory && (r.category_id || r.category_name)) {
        map[key].sampleCategory = r.category_id || r.category_name;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  });

  $effect(() => {
    if (step === 4) {
      const m = {};
      const cm = {};
      const saved = data.titleCleanup || {};
      for (const g of titleGroups) {
        const savedEntry = saved[g.original] || saved[g.original.toLowerCase()];
        const val = savedEntry?.cleaned || g.cleaned;
        const cat = savedEntry?.category_id || g.sampleCategory || '';
        for (const orig of g.originals) {
          m[orig] = val;
          cm[orig] = cat;
        }
      }
      titleCleanupMap = m;
      titleCategoryMap = cm;
      confirmedSet = new Set(
        titleGroups
          .filter(g => (saved[g.original]?.confirmed || saved[g.original.toLowerCase()]?.confirmed))
          .map(g => g.key)
      );
    }
  });

  function getUniqueNames() {
    const names = new Set();
    for (const r of selectedRows) {
      if (r.paid_by) names.add(r.paid_by);
      if (r.paid_to) names.add(r.paid_to);
    }
    return [...names].sort();
  }

  function handleMapSelect(name, field, value) {
    const ent = entityMap[name];
    if (!ent) return;
    if (value === '__new_account__') {
      ent.mapTo = '__new_account__';
      ent.createAs = 'account';
      ent.mappedTo = null;
    } else if (value === '__new_person__') {
      ent.mapTo = '__new_person__';
      ent.createAs = 'person';
      ent.mappedTo = null;
    } else if (value) {
      const [type, entityName] = value.split(':');
      ent.mapTo = value;
      ent.createAs = null;
      ent.mappedTo = entityName;
    } else {
      ent.mapTo = '';
      ent.createAs = null;
      ent.mappedTo = null;
    }
    entityMap = entityMap;
  }

  function initEntityMap() {
    const names = getUniqueNames();
    const entityAliases = {
      'Sola - Loan': { target: 'Sister', type: 'person' },
      'Family Loan': { target: 'Family', type: 'person' }
    };
    const map = {};
    for (const n of names) {
      const alias = entityAliases[n];
      let autoMapped = null;
      if (alias) {
        const existing = alias.type === 'person'
          ? data.people.find(p => p.name.toLowerCase() === alias.target.toLowerCase())
          : data.accounts.find(a => a.name.toLowerCase() === alias.target.toLowerCase());
        if (existing) {
          autoMapped = alias.type + ':' + existing.name;
        }
      } else {
        const existingAccount = data.accounts.find(a => a.name.toLowerCase() === n.toLowerCase());
        if (existingAccount) {
          autoMapped = 'account:' + existingAccount.name;
        } else {
          const existingPerson = data.people.find(p => p.name.toLowerCase() === n.toLowerCase());
          if (existingPerson) {
            autoMapped = 'person:' + existingPerson.name;
          }
        }
      }
      map[n] = {
        name: n,
        mapTo: autoMapped || '',
        mappedTo: autoMapped ? autoMapped.split(':')[1] : null,
        createAs: autoMapped ? null : 'person',
        icon: 'User',
        color: '--cyan'
      };
    }
    entityMap = map;
  }

  function resolveAlias(name) {
    if (!name) return name;
    const ent = entityMap[name];
    if (!ent) return name;
    if (ent.mapTo === '__new_account__' || ent.mapTo === '__new_person__') return name;
    return ent.mappedTo || '';
  }

  function initCatMap() {
    const unique = [...new Set(selectedRows.map(r => r.category_name).filter(Boolean))];
    const map = {};
    for (const cn of unique) {
      const match = data.categories.find(c => c.name.toLowerCase() === cn.toLowerCase());
      map[cn] = match ? match.id : '';
    }
    catMapConfig = map;
  }

  async function createAccountApi(e) {
    await fetch('/treasury/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: e.name, icon: e.icon, color: e.color, type: 'bank', is_asset: 1 }) });
  }

  async function createPersonApi(e) {
    await fetch('/treasury/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: e.name, icon: e.icon, color: e.color }) });
  }

  async function confirmImport() {
    loading = true; error = '';
    try {
      const entities = [];
      for (const [name, ent] of Object.entries(entityMap)) {
        if (ent.mapTo === '__new_account__' || ent.mapTo === '__new_person__') {
          entities.push({ name, type: ent.mapTo === '__new_account__' ? 'account' : 'person', icon: ent.icon, color: ent.color });
        }
      }
      let newAccounts = 0, newPeople = 0;
      for (const e of entities) {
        if (e.type === 'account') { await createAccountApi(e); newAccounts++; }
        else { await createPersonApi(e); newPeople++; }
      }
      const res = await fetch('/settings/treasury/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm', filename, newAccounts, newPeople,
          rows: selectedRows.map(r => {
            const row = {
              date: r.date, title: titleCleanupMap[r.title] || cleanTitle(r.title), amount: r.amount != null ? Number(r.amount) : null, type: r.type,
              category_id: titleCategoryMap[r.title] || catMapConfig[r.category_name] || r.category_id || null,
              paid_by: resolveAlias(r.paid_by), paid_to: resolveAlias(r.paid_to), paid_for: r.paid_for, notes: r.notes
            };
            if (r.merge_db_id && mergeActions[r.index] === 'merge') {
              row.merge_db_id = r.merge_db_id;
            }
            return row;
          })
        })
      });
      const json = await res.json();
      if (json.success) {
        // Save ALL title cleanup memory + category mappings
        const toSave = [];
        for (const g of titleGroups) {
          const userTitle = titleCleanupMap[g.original];
          const userCat = titleCategoryMap[g.original];
          toSave.push({ source: g.original, cleaned: userTitle || g.cleaned, category_id: userCat || null });
        }
        if (toSave.length > 0) {
          await fetch('/api/title-cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mappings: toSave })
          });
        }
        result = { count: json.count, newCount: json.newCount, mergeCount: json.mergeCount, newAccounts, newPeople };
        clearSavedState();
        step = 7;
        ondone?.();
      } else { error = json.error || 'Import failed'; }
    } catch (e) { error = 'Import failed: ' + e.message; }
    loading = false;
  }

  function paidForClass(paidFor, person) {
    if (!paidFor) return 'badge-toggle';
    const items = paidFor.split(',').map(s => s.trim().toLowerCase());
    return items.includes(person.toLowerCase()) ? 'badge-toggle active' : 'badge-toggle';
  }

  function fmtAmount(v) {
    if (v == null || v === '') return '—';
    let s = String(v).replace(/[₹\s]/g, '');
    s = s.replace(/,/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(d) {
    if (!d) return '—';
    const dt = parseDateForMatch(d);
    if (dt) {
      return String(dt.getDate()).padStart(2, '0') + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + dt.getFullYear();
    }
    return d;
  }

  function exportDupsCsv() {
    const esc = (s) => '"' + String(s || '').replace(/"/g, '""') + '"';
    const lines = ['Date Source,Date DB,Name Source,Name DB,Amount Source,Amount DB,Account Source,Account DB,Action'];
    for (const r of duplicateRows) {
      const action = mergeActions[r.index] === 'merge' ? 'Merge' : 'Skip';
      lines.push([
        esc(fmtDate(r.date)), esc(r.matched_db ? fmtDate(r.matched_db.date) : ''),
        esc(r.title), esc(r.matched_db ? r.matched_db.title : ''),
        esc(fmtAmount(r.amount)), esc(r.matched_db ? fmtAmount(r.matched_db.amount) : ''),
        esc(r.paid_by || r.paid_to || ''), esc(r.matched_db ? (r.matched_db.paid_by || r.matched_db.paid_to || '') : ''),
        esc(action)
      ].join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'duplicates_' + (filename || 'import') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div data-section="import-wizard" class="wizard">
  {#if result}
    <div class="result-box">
      <CircleCheck size={48} class="result-icon" />
      <h2 class="result-title">Import Complete</h2>
      <p class="result-info">{result.newCount} new + {result.mergeCount} merged = {result.count} total</p>
      {#if result.newAccounts > 0 || result.newPeople > 0}
        <p class="result-sub">({result.newAccounts} accounts + {result.newPeople} people created)</p>
      {/if}
      <div class="result-actions">
        <a href="/treasury/transactions" class="btn-primary"><CheckCheck size={16} /> View Transactions</a>
        <button onclick={() => { clearSavedState(); step = 0; result = null; parsedRows = []; }} class="btn-ghost">Import Another</button>
      </div>
    </div>
  {:else}
    {#if resumeAvailable}
      <div class="resume-banner" data-section="resume-banner">
        <span>You have an incomplete import from {new Date(resumeAvailable.timestamp).toLocaleDateString()} at {new Date(resumeAvailable.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span>
        <div class="resume-actions">
          <button class="btn-primary btn-small" onclick={() => restoreState(resumeAvailable)}>Resume Import</button>
          <button class="btn-ghost btn-small" onclick={() => { clearSavedState(); resumeAvailable = null; }}>Start Fresh</button>
        </div>
      </div>
    {/if}
    <div class="wizard-header">
      <div class="wizard-header-top">
        <button onclick={() => history.back()} class="back-btn"><ArrowLeft size={16} /> Back</button>
        <div class="wizard-header-right">
          {#if step >= 1 && step <= 6 && checked}
            <button class="btn-small btn-save" onclick={saveState} title="Save progress to continue later"><span class="save-dot"></span> Saved</button>
          {:else if step === 7}
          {:else if step >= 1 && !checked}
            <button class="btn-small btn-save btn-save-inactive" onclick={() => {}} title="Check for duplicates before saving">Save Progress</button>
          {/if}
        </div>
      </div>
      <div class="wizard-title-row">
        <h1 class="wizard-title">Import Transactions</h1>
      </div>
      <div class="stepper">
        <div class="stepper-row circles-row">
          {#each steps as s, i}
            <div class="step-peak">
              <div class="step-circle" class:active={i === step} class:done={i < step}>{i + 1}</div>
            </div>
            {#if i < steps.length - 1}
              <div class="step-path" class:done={i < step}></div>
            {/if}
          {/each}
        </div>
        <div class="stepper-row labels-row">
          {#each steps as s, i}
            <div class="step-label-wrap">
              <span class="step-label" class:active={i === step} class:done={i < step}>{s}</span>
            </div>
            {#if i < steps.length - 1}
              <div class="label-gap"></div>
            {/if}
          {/each}
        </div>
      </div>
    </div>

    {#if error}
      <div class="error-banner"><AlertTriangle size={18} /> {error} <button onclick={() => error = ''} class="dismiss">×</button></div>
    {/if}

    {#if loading}
      <div class="loading"><div class="spinner"></div><span>Processing...</span></div>
    {/if}

    {#if step === 0}
      {#if showPdfPrompt}
        <div class="pdf-prompt">
          <div class="pdf-prompt-header">
            <EyeOff size={24} class="pdf-lock-icon" />
            <span class="pdf-prompt-filename">{filename}</span>
          </div>
          <p class="pdf-prompt-desc">This PDF is encrypted. Enter the password to decrypt it.</p>
          <div class="pdf-password-row">
            <input type={showPwd ? 'text' : 'password'} class="pdf-password-input" placeholder="PDF password" value={pdfPassword}
              oninput={(e) => pdfPassword = e.target.value}
              onkeydown={(e) => { if (e.key === 'Enter') processPdfWithPassword(); }} />
            <button type="button" class="pwd-toggle" onclick={() => showPwd = !showPwd} title={showPwd ? 'Hide' : 'Show'}>
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
          <div class="bank-type-row">
            <span class="bank-type-label">Bank type:</span>
            <select class="bank-type-select" aria-label="Bank type" value={bankType} onchange={(e) => bankType = e.target.value}>
              <option value="">Auto-detect</option>
              <option value="federal">Federal Bank</option>
              <option value="gpay">Google Pay</option>
            </select>
          </div>
          {#if error}
            <div class="error-banner"><AlertTriangle size={18} /> {error} <button onclick={() => error = ''} class="dismiss">&times;</button></div>
          {/if}
          <div class="pdf-prompt-actions">
            <button class="btn-primary" onclick={processPdfWithPassword} disabled={loading}>
              {loading ? 'Decrypting...' : 'Decrypt & Parse'}
            </button>
            <button class="btn-ghost" onclick={cancelPdfPrompt}>Cancel</button>
          </div>
        </div>
      {:else}
        <div class="drop-zone" class:drag={isDragging}
          role="button" tabindex="0"
          onclick={() => document.getElementById('csv-input').click()}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('csv-input').click(); }}
          ondragover={(e) => { e.preventDefault(); isDragging = true; }}
          ondragleave={() => isDragging = false}
          ondrop={(e) => { e.preventDefault(); isDragging = false; const f = e.dataTransfer.files; if (f.length) handleFiles([...f]); }}>
          <input type="file" accept=".csv,.pdf" id="csv-input" style="display:none" multiple onchange={(e) => { const f = e.target.files; if (f.length) handleFiles([...f]); }} />
          <Upload size={40} class="drop-icon" />
          <p class="drop-text">Drop a CSV file here or <label for="csv-input" class="browse">browse</label></p>
          <p class="drop-hint">Supports CSV and PDF statements.</p>
          <div class="bank-type-row drop-bank-row">
            <span class="bank-type-label">Bank type:</span>
            <select class="bank-type-select" aria-label="Bank type" value={bankType} onchange={(e) => bankType = e.target.value}>
              <option value="">Auto-detect</option>
              <option value="federal">Federal Bank</option>
              <option value="gpay">Google Pay</option>
            </select>
          </div>
        </div>
        {#if isMultiFile && Object.keys(fileResults).length > 0}
          <BatchFileProgress files={multiFiles} results={fileResults} />
        {/if}
        {#if showBaseSelector}
          <div data-section="base-source-selector" class="base-selector">
            <h3 class="base-selector-title">Select Base Source</h3>
            <p class="base-selector-desc">The base source defines the master transaction list. Other sources will enrich matching base transactions. Date and Amount are taken from the base; Title, Category, and Notes prefer supporting sources.</p>
            <div class="base-selector-list">
              {#each multiFiles as file}
                {@const fr = fileResults[file.name]}
                {#if fr?.status === 'done'}
                  <div class="base-selector-option" class:active={baseSourceFile === file.name} role="button" tabindex="0"
                    onclick={() => baseSourceFile = file.name}
                    onkeydown={(e) => { if (e.key === 'Enter') baseSourceFile = file.name; }}>
                    <input type="radio" name="baseSource" value={file.name} checked={baseSourceFile === file.name}
                      onchange={() => baseSourceFile = file.name} />
                    <span class="base-selector-file">{sourceLabel(file.name)}</span>
                    <span class="base-selector-count">{fr.count} txns</span>
                    <span class="base-selector-name">{file.name}</span>
                  </div>
                {/if}
              {/each}
            </div>
            <div class="base-selector-actions">
              <button class="btn-primary" onclick={confirmBaseSource} disabled={!baseSourceFile}>Confirm Base Source</button>
            </div>
          </div>
        {/if}
      {/if}
    {/if}

    {#if step === 2}
      <ReconcileStep rows={parsedRows} onnext={onReconcileDone} baseSource={baseSourceFile} rules={importRules}
        savedState={reconcileState} onsave={(s) => { reconcileState = s; }}
        currentIndex={reconcileCurrentIndex} onIndexChange={(i) => { reconcileCurrentIndex = i; }}
        onTotalChange={(t) => { reconcileTotal = t; }}
        cats={data.categories ?? []} accounts={data.accounts ?? []} people={data.people ?? []} />
    {/if}

    {#if step === 1}
      <div class="step-body check-body">
        {#if detectedHeaders.length}
          <div class="header-map">
            <h3 class="header-map-title">Detected Columns</h3>
            <div class="header-map-tags">
            {#each detectedHeaders as [label, col, sample]}
              <span class="header-tag">{label} <span class="header-tag-col">({col})</span> <span class="header-tag-sample">"{sample}"</span></span>
            {/each}
            {#if useDebitCredit}
              <span class="header-tag header-tag-smart">Smart Debit/Credit</span>
            {/if}
            </div>
          </div>
        {/if}
        {#if !checked}
          <div class="check-center">
            <Search size={64} class="check-icon" />
            <h2 class="check-count">{parsedRows.length} Transactions Found</h2>
            <button class="btn-primary" onclick={checkDuplicates} disabled={loading}>
              {loading ? 'Checking...' : 'Check for Duplicates'}
            </button>
          </div>
        {:else if !duplicatesFound}
          <div class="check-center">
            <SearchCheck size={64} class="check-icon check-ok" />
            <h2 class="check-count">No Duplicates Found</h2>
            <p class="check-sub">Ready to Continue</p>
            <button class="btn-primary" onclick={proceedFromCheck}>Continue</button>
          </div>
        {:else}
          <div class="toolbar-row">
            <span class="count-badge">{duplicateRows.length} dup / {uniqueRows.length} unique</span>
            <div class="toolbar-actions">
              <button class="btn-small" onclick={() => exportDupsCsv()} title="Export as CSV for review"><span style="font-size: var(--fs-body)">â¬‡</span> Export CSV</button>
              {#if checkTab === 'duplicates'}
                <button class="btn-small" onclick={() => { for (const r of duplicateRows) { r.selected = false; mergeActions[r.index] = 'skip'; } proceedFromCheck(); }}>Skip All</button>
                <button class="btn-small" onclick={() => { for (const r of duplicateRows) { r.selected = true; mergeActions[r.index] = 'new'; r.duplicate = false; r.merge_db_id = null; } }}>Keep All</button>
                <button class="btn-small" onclick={() => { for (const r of duplicateRows) { r.selected = true; mergeActions[r.index] = 'merge'; } }}>Merge All</button>
              {/if}
            </div>
          </div>
          <div data-section="check-tabs" class="check-tabs">
            <button type="button" class="check-tab" class:active={checkTab === 'duplicates'} onclick={() => checkTab = 'duplicates'}>Duplicates ({duplicateRows.length})</button>
            <button type="button" class="check-tab" class:active={checkTab === 'unique'} onclick={() => checkTab = 'unique'}>Unique Entries ({uniqueRows.length})</button>
          </div>
          {#if checkTab === 'duplicates'}
            <div class="table-wrap">
              <table class="import-table comp-table">
                <thead>
                  <tr>
                    <th colspan="2">Date</th>
                    <th colspan="2">Name</th>
                    <th colspan="2">Amount</th>
                    <th colspan="2">Account</th>
                    <th rowspan="2">Actions</th>
                  </tr>
                  <tr class="comp-subhead">
                    <th>Source</th><th>DB</th>
                    <th>Source</th><th>DB</th>
                    <th>Source</th><th>DB</th>
                    <th>Source</th><th>DB</th>
                  </tr>
                </thead>
                <tbody>
                  {#each duplicateRows as r, i}
                    <tr>
                      <td class="cell-source">{fmtDate(r.date)}</td>
                      <td class="cell-db">{r.matched_db ? fmtDate(r.matched_db.date) : '—'}</td>
                      <td class="cell-source">{r.title}</td>
                      <td class="cell-db">{r.matched_db ? r.matched_db.title : '—'}</td>
                      <td class="cell-source cell-amount"><span class="currency-symbol">₹</span>{fmtAmount(r.amount)}</td>
                      <td class="cell-db cell-amount">{r.matched_db ? fmtAmount(r.matched_db.amount) : '—'}</td>
                      <td class="cell-source">{r.paid_by || r.paid_to || '—'}</td>
                      <td class="cell-db">{r.matched_db ? (r.matched_db.paid_by || r.matched_db.paid_to || '—') : '—'}</td>
                      <td class="cell-actions-inline">
                        <button type="button" class="action-btn action-merge" title="Merge with existing" class:action-active={mergeActions[r.index] === 'merge'} onclick={() => { mergeActions[r.index] = 'merge'; r.selected = true; }}><Merge size={14} /></button>
                        <button type="button" class="action-btn action-new" title="Import as new" class:action-active={mergeActions[r.index] === 'new'} onclick={() => { mergeActions[r.index] = 'new'; r.selected = true; r.duplicate = false; r.merge_db_id = null; }}><PlusCircle size={14} /></button>
                        <button type="button" class="action-btn action-skip" title="Skip" class:action-active={mergeActions[r.index] === 'skip'} onclick={() => { mergeActions[r.index] = 'skip'; r.selected = false; }}><SkipForward size={14} /></button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="table-wrap">
              <table class="import-table">
                <thead><tr><th>Date</th><th>Name</th><th>Amount</th><th>Account</th></tr></thead>
                <tbody>
                  {#each uniqueRows as r}
                    <tr>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.title}</td>
                      <td class="cell-amount"><span class="currency-symbol">₹</span>{fmtAmount(r.amount)}</td>
                      <td>{r.paid_by || r.paid_to || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          <button class="btn-primary" onclick={proceedFromCheck}>Continue</button>
        {/if}
      </div>
    {/if}

    {#if step === 3}
      <div class="step-body">
        <div class="toolbar-row">
          <span class="count-badge">{parsedRows.filter(r => r.selected).length} of {parsedRows.length} selected</span>
          <div class="toolbar-actions">
            <button class="btn-small" onclick={() => selectAll(true)}>Select All</button>
            <button class="btn-small" onclick={() => selectAll(false)}>Deselect All</button>
            <button class="btn-primary" onclick={() => step = 4}>Continue</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="import-table import-table-center">
            <thead><tr><th></th><th>Date</th><th>Title</th><th>Amount</th><th>Type</th><th>Category</th><th>Paid By</th><th>Paid To</th><th>Paid For</th></tr></thead>
            <tbody>
              {#each parsedRows as r, i}
                <tr class:duplicate={r.duplicate}>
                  <td><input type="checkbox" checked={r.selected} disabled={r.duplicate} onchange={() => toggleSelect(i)} /></td>
                  <td>{fmtDate(r.date)}</td><td>{r.title}</td><td class="cell-amount"><span class="currency-symbol">₹</span>{fmtAmount(r.amount)}</td>
                  <td><span class="badge-pill badge-{r.type}">{r.type}</span></td>
                  <td>{data.categories.find(c => c.id === r.category_id)?.name || r.category_name || '—'}</td>
                  <td><span class="badge-pill badge-payer">{r.paid_by}</span></td>
                  <td><span class="badge-pill badge-payee">{r.paid_to}</span></td>
                  <td>
                    {#each paidForOpts as p}
                      <span class={paidForClass(r.paid_for, p)}>{p}</span>
                    {/each}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <button class="btn-ghost back-btn-inline" onclick={() => step = 1}><ArrowLeft size={16} /> Back</button>
      </div>
    {/if}

    {#if step === 4}
      <div class="step-body">
        <div class="toolbar-row toolbar-row-center">
          <span class="info-text">Review and edit cleaned titles & assign categories. All-caps names are auto-capitalised.</span>
        </div>
        <div class="toolbar-row">
          <span class="count-badge">{unconfirmedGroups.length} unconfirmed / {confirmedGroups.length} confirmed</span>
          <button class="btn-primary" onclick={() => { step = 5; initEntityMap(); initCatMap(); }}>Continue</button>
        </div>
        <div class="table-wrap">
          {#if unconfirmedGroups.length > 0}
            <div class="section-header">Unconfirmed</div>
            <table class="import-table title-clean-table">
              <thead><tr><th>Name in Source</th><th class="col-center">Updated Name</th><th class="col-center">Category</th><th class="col-center">Actions</th></tr></thead>
              <tbody>
                {#each unconfirmedGroups as g}
                  <tr>
                    <td>
                      <span class="group-badge">{g.count}</span>
                      <span title={[...g.originals].join(', ')}>{g.original}</span>
                    </td>
                    <td class="col-center">
                      <input type="text" class="ce ce-text clean-input" value={titleCleanupMap[g.original] || ''}
                        oninput={(e) => { titleCleanupMap[g.original] = e.target.value; titleCleanupMap = titleCleanupMap; }} />
                    </td>
                    <td class="col-center">
                      <select class="map-select" value={titleCategoryMap[g.original] || ''} onchange={(e) => { titleCategoryMap[g.original] = e.target.value ? Number(e.target.value) : ''; titleCategoryMap = titleCategoryMap; }}>
                        <option value="">—</option>
                        {#each data.categories as c}
                          <option value={c.id}>{c.name}</option>
                        {/each}
                      </select>
                    </td>
                    <td class="col-center">
                      <button type="button" class="tick-btn" title="Confirm" onclick={() => { confirmedSet.add(g.key); confirmedSet = new Set(confirmedSet); }}>âœ“</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
          {#if confirmedGroups.length > 0}
            <div class="section-header">Confirmed</div>
            <table class="import-table title-clean-table">
              <thead><tr><th>Name in Source</th><th class="col-center">Updated Name</th><th class="col-center">Category</th><th class="col-center">Actions</th></tr></thead>
              <tbody>
                {#each confirmedGroups as g}
                  <tr>
                    <td>
                      <span class="group-badge">{g.count}</span>
                      <span title={[...g.originals].join(', ')}>{g.original}</span>
                    </td>
                    <td class="col-center">
                      <input type="text" class="ce ce-text clean-input" value={titleCleanupMap[g.original] || ''}
                        oninput={(e) => { titleCleanupMap[g.original] = e.target.value; titleCleanupMap = titleCleanupMap; }} />
                    </td>
                    <td class="col-center">
                      <select class="map-select" value={titleCategoryMap[g.original] || ''} onchange={(e) => { titleCategoryMap[g.original] = e.target.value ? Number(e.target.value) : ''; titleCategoryMap = titleCategoryMap; }}>
                        <option value="">—</option>
                        {#each data.categories as c}
                          <option value={c.id}>{c.name}</option>
                        {/each}
                      </select>
                    </td>
                    <td class="col-center">
                      <button type="button" class="tick-btn ticked" title="Unconfirm" onclick={() => { confirmedSet.delete(g.key); confirmedSet = new Set(confirmedSet); }}>âœ“</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
        <button class="btn-ghost back-btn-inline" onclick={() => step = 3}><ArrowLeft size={16} /> Back</button>
      </div>
    {/if}

    {#if step === 5}
      <div class="step-body">
        <div class="toolbar-row toolbar-row-center">
          <span class="info-text">Map categories, payers, and payees to existing entities or create new ones.</span>
        </div>

        <div class="map-section">
          <h3 class="map-section-title"><span>Categories</span></h3>
          {#each [...new Set(selectedRows.map(r => r.category_name).filter(Boolean))] as catName}
            <div class="map-row">
              <span class="map-row-label">{catName}</span>
              <select class="map-select" value={catMapConfig[catName] || ''} onchange={(e) => catMapConfig[catName] = e.target.value}>
                <option value="">— Uncategorized —</option>
                {#each data.categories as c}
                  <option value={c.id}>{c.name}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>

        <div class="map-section">
          <h3 class="map-section-title"><span>Paid By</span></h3>
          {#each [...new Set(selectedRows.map(r => r.paid_by).filter(Boolean))] as name}
            {@const ent = entityMap[name]}
            {#if ent}
              <div class="map-row">
                <span class="map-row-label">{name}</span>
                <span class="map-arrow">â†’</span>
                <select class="map-select" value={ent.mapTo || ''} onchange={(e) => handleMapSelect(name, 'paid_by', e.target.value)}>
                  <option value="">— Leave Blank —</option>
                  <optgroup label="Accounts">
                    {#each data.accounts as a}
                      <option value={'account:' + a.name}>{a.name}</option>
                    {/each}
                  </optgroup>
                  <optgroup label="People">
                    {#each data.people as p}
                      <option value={'person:' + p.name}>{p.name}</option>
                    {/each}
                  </optgroup>
                  <option disabled>â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€</option>
                  <option value="__new_account__">+ Create New Account</option>
                  <option value="__new_person__">+ Create New Person</option>
                </select>
              </div>
            {/if}
          {/each}
        </div>

        <div class="map-section">
          <h3 class="map-section-title"><span>Paid To</span></h3>
          {#each [...new Set(selectedRows.map(r => r.paid_to).filter(Boolean))] as name}
            {@const ent = entityMap[name]}
            {#if ent}
              <div class="map-row">
                <span class="map-row-label">{name}</span>
                <span class="map-arrow">â†’</span>
                <select class="map-select" value={ent.mapTo || ''} onchange={(e) => handleMapSelect(name, 'paid_to', e.target.value)}>
                  <option value="">— Leave Blank —</option>
                  <optgroup label="Accounts">
                    {#each data.accounts as a}
                      <option value={'account:' + a.name}>{a.name}</option>
                    {/each}
                  </optgroup>
                  <optgroup label="People">
                    {#each data.people as p}
                      <option value={'person:' + p.name}>{p.name}</option>
                    {/each}
                  </optgroup>
                  <option disabled>â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€</option>
                  <option value="__new_account__">+ Create New Account</option>
                  <option value="__new_person__">+ Create New Person</option>
                </select>
              </div>
            {/if}
          {/each}
        </div>

        <div class="toolbar-row">
          <span class="count-badge">{Object.keys(entityMap).length} unique names</span>
          <button class="btn-primary" onclick={() => step = 6} disabled={loading}>Continue</button>
        </div>
        <button class="btn-ghost back-btn-inline" onclick={() => step = 4}><ArrowLeft size={16} /> Back</button>
      </div>
    {/if}

    {#if step === 6}
      <div class="step-body">
        <div class="toolbar-row">
          <span class="count-badge">{selectedRows.length} rows to import</span>
          <button class="btn-primary" onclick={confirmImport} disabled={loading}>
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
        <div class="table-wrap">
          <table class="import-table">
            <thead><tr><th>Date</th><th>Title</th><th>Amount</th><th>Type</th><th>Category</th><th>Paid By</th><th>Paid To</th><th>Paid For</th></tr></thead>
            <tbody>
              {#each selectedRows as r}
                <tr>
                  <td>{fmtDate(r.date)}</td><td>{r.title ? (titleCleanupMap[r.title] || cleanTitle(r.title)) : '—'}</td><td class="cell-amount"><span class="currency-symbol">₹</span>{fmtAmount(r.amount)}</td>
                  <td><span class="badge-pill badge-{r.type}">{r.type}</span></td>
                  <td>{data.categories.find(c => c.id === (catMapConfig[r.category_name] || r.category_id))?.name || r.category_name || '—'}</td>
                  <td><span class="badge-pill badge-payer">{r.paid_by}</span></td>
                  <td><span class="badge-pill badge-payee">{r.paid_to}</span></td>
                  <td>
                    {#each paidForOpts as p}
                      <span class={paidForClass(r.paid_for, p)}>{p}</span>
                    {/each}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <button class="btn-ghost back-btn-inline" onclick={() => step = 5}><ArrowLeft size={16} /> Back</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .wizard { display: flex; flex-direction: column; gap: 16px; }
  .wizard-header { display: flex; flex-direction: column; gap: 8px; }
  .wizard-header-top { display: flex; align-items: center; justify-content: space-between; }
  .wizard-header-right { display: flex; align-items: center; gap: 8px; }
  .back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; align-self: flex-start; }
  .back-btn:hover { color: var(--cyan); }
  .wizard-title-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .wizard-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; text-align: center; }

  .btn-save { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; font-size: var(--fs-body); border-color: var(--cyan-dim); color: var(--cyan); cursor: pointer; }
  .btn-save:hover { border-color: var(--cyan); background: rgba(0,212,255,0.08); }
  .btn-save-inactive { opacity: 0.5; cursor: default; }
  .save-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block; }
  .resume-banner { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 12px 20px; background: rgba(0,212,255,0.06); border: 1px solid var(--cyan-dim); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); flex-wrap: wrap; }
  .resume-actions { display: flex; gap: 8px; }
  .resume-actions .btn-small { padding: 4px 14px; font-size: var(--fs-body); }

  .stepper { display: flex; flex-direction: column; gap: 4px; padding: 16px 0; width: 70%; margin: 0 auto; }
  .stepper-row { display: flex; align-items: center; width: 100%; }
  .step-peak { width: 32px; flex-shrink: 0; display: flex; justify-content: center; }
  .step-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; background: var(--bg-elevated); color: var(--text-muted); border: 2px solid var(--border); transition: all 0.25s; }
  .step-circle.active { background: var(--cyan); color: #000; border-color: var(--cyan); box-shadow: 0 0 10px var(--cyan-glow); }
  .step-circle.done { background: rgba(0,212,255,0.15); color: var(--cyan); border-color: var(--cyan); }
  .step-path { flex: 1; height: 2px; background: var(--border); transition: background 0.25s; }
  .step-path.done { background: var(--cyan); }
  .step-label-wrap { width: 32px; flex-shrink: 0; display: flex; justify-content: center; }
  .step-label { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .step-label.active { color: var(--cyan); }
  .step-label.done { color: var(--cyan-dim); }
  .label-gap { flex: 1; }

  .error-banner { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(239,68,68,0.1); border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); font-family: var(--font-body); font-size: var(--fs-body); }
  .error-banner .dismiss { margin-left: auto; background: none; border: none; color: var(--danger); font-size: var(--fs-heading-2); cursor: pointer; }
  .loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 24px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px; border: 2px dashed var(--border); border-radius: var(--radius); background: var(--bg-card); cursor: pointer; transition: all 0.2s; }
  .drop-zone:hover, .drop-zone.drag { border-color: var(--cyan); background: rgba(0,212,255,0.04); }
  .drop-icon { color: var(--cyan-dim); }
  .drop-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0; }
  .browse { color: var(--cyan); cursor: pointer; text-decoration: underline; }
  .drop-hint { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); margin: 0; }
  .drop-bank-row { margin-bottom: -20px; }
  .bank-type-row { display: flex; align-items: center; gap: 8px; }
  .bank-type-label { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); white-space: nowrap; }
  .bank-type-select { padding: 4px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  .bank-type-select:focus { border-color: var(--cyan); outline: none; }
  .step-body { display: flex; flex-direction: column; gap: 12px; }
  .check-body { flex: 1; }
  .check-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 40px 20px; flex: 1; }
  .check-icon { color: var(--cyan-dim); }
  .check-icon.check-ok { color: var(--success); }
  .check-count { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; }
  .check-sub { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
  .info-text { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
  .toolbar-row { display: flex; align-items: center; justify-content: space-between; }
  .toolbar-row-center { justify-content: center; }
  .toolbar-actions { display: flex; gap: 8px; }
  .count-badge { padding: 4px 12px; background: rgba(0,212,255,0.1); border: 1px solid var(--cyan-dim); border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); }
  .duplicate-actions-bar { display: flex; gap: 8px; justify-content: center; }
  .check-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
  .check-tab { padding: 10px 20px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px; }
  .check-tab:hover { color: var(--text); }
  .check-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
  .cell-actions-inline { display: flex; gap: 4px; justify-content: center; }
  .table-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; flex: 1; overflow-y: auto; background: var(--bg-surface); }
  .import-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .import-table th { background: var(--bg-card); padding: 10px 12px; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; text-align: left; white-space: nowrap; }
  .import-table td { padding: 10px 12px; color: var(--text); border-bottom: 1px solid var(--border); }
  .import-table tr:last-child td { border-bottom: none; }
  .import-table tr.duplicate td { opacity: 0.4; text-decoration: line-through; }
  .comp-table th, .comp-table td { text-align: center; padding: 8px 6px; font-size: var(--fs-body); }
  .comp-table .comp-subhead th { font-size: var(--fs-body); color: var(--text-dim); background: var(--bg-surface); padding: 4px 6px; }
  .comp-table .comp-subhead th:last-child { border-bottom: 1px solid var(--border); }
  .cell-source { color: var(--cyan); }
  .cell-db { color: var(--text-dim); }
  .action-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border-radius: var(--radius); cursor: pointer; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-dim); transition: all 0.15s; }
  .action-btn.action-merge.action-active { background: rgba(255,140,0,0.1); border-color: var(--amber); color: var(--amber); }
  .action-btn.action-skip.action-active { background: rgba(239,68,68,0.1); border-color: var(--danger); color: var(--danger); }
  .action-btn.action-new.action-active { background: rgba(34,197,94,0.1); border-color: var(--success); color: var(--success); }
  .action-btn:hover { border-color: var(--cyan-dim); }
  .import-table-center th, .import-table-center td { text-align: center; }
  .import-table-center th:first-child, .import-table-center td:first-child { text-align: center; }
  .group-badge { display: inline-block; padding: 1px 7px; border-radius: var(--radius); background: rgba(0,212,255,0.12); color: var(--cyan); font-size: var(--fs-caption); font-weight: 700; margin-right: 8px; line-height: 1.4; }
  .section-header { padding: 10px 14px; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); }
  .title-clean-table td { vertical-align: middle; }
  .col-center { text-align: center !important; }
  .col-center input, .col-center select { text-align: center; }
  .tick-btn { width: 32px; height: 32px; padding: 0; border-radius: 50%; border: 2px solid var(--border); background: var(--bg-elevated); color: var(--text-dim); font-size: var(--fs-body); font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; line-height: 1; }
  .tick-btn:hover { border-color: var(--success); color: var(--success); background: rgba(34,197,94,0.08); }
  .tick-btn.ticked { border-color: var(--success); color: #fff; background: var(--success); }
  .clean-input { width: 100%; box-sizing: border-box; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); }
  .clean-input:focus { border-color: var(--cyan); outline: none; background: var(--bg-card); }
  .cell-amount { font-weight: 600; text-align: right; }
  .cell-dim { color: var(--text-muted); font-size: var(--fs-body); }
  .badge-pill { display: inline-block; padding: 2px 10px; border-radius: var(--radius); font-size: var(--fs-caption); font-weight: 600; white-space: nowrap; text-transform: capitalize; }
  .badge-expense { background: rgba(239,68,68,0.12); color: var(--danger); }
  .badge-income { background: rgba(34,197,94,0.12); color: var(--success); }
  .badge-transfer { background: rgba(0,212,255,0.12); color: var(--cyan); }
  .badge-payer { background: rgba(255,140,0,0.12); color: var(--amber); }
  .badge-payee { background: rgba(0,136,255,0.12); color: var(--blue); }
  .badge-toggle { display: inline-block; padding: 2px 10px; border-radius: var(--radius); font-size: var(--fs-caption); font-weight: 600; margin: 0 2px; background: rgba(75,85,99,0.2); color: var(--text-muted); border: 1px solid transparent; }
  .badge-toggle.active { background: rgba(0,212,255,0.15); color: var(--cyan); border-color: var(--cyan-dim); }
  .btn-full { width: 100%; justify-content: center; }
  .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: var(--cyan); border: none; border-radius: var(--radius); color: #000; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; }
  .btn-primary:hover { box-shadow: 0 0 12px var(--cyan-glow); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-small { padding: 6px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  .btn-small:hover { border-color: var(--cyan-dim); color: var(--cyan); }
  .btn-ghost { padding: 8px 20px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  .btn-ghost:hover { color: var(--text); border-color: var(--cyan-dim); }
  .back-btn-inline { align-self: flex-start; margin-top: 4px; }
  .map-section { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }
  .map-section-title { margin: 0 0 4px 0; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
  .map-section-title::after { content: ''; flex: 1; height: 1px; background: var(--border-glow); }
  .map-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
  .map-row-label { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); min-width: 140px; font-weight: 600; }
  .map-arrow { color: var(--cyan-dim); font-size: var(--fs-heading-2); font-weight: 700; margin: 0 8px; flex-shrink: 0; }
  .map-select { flex: 1; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); }
  .map-select:focus { border-color: var(--cyan); outline: none; }
  .map-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .map-card { display: flex; flex-direction: column; gap: 8px; padding: 14px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); min-width: 200px; }
  .map-header { display: flex; align-items: center; gap: 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); }
  .map-badge { padding: 2px 10px; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; }
  .map-found { background: rgba(34,197,94,0.1); color: var(--success); border: 1px solid rgba(34,197,94,0.3); }
  .map-actions { display: flex; gap: 6px; }
  .map-radio { display: flex; align-items: center; gap: 4px; padding: 4px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
  .map-radio.active { border-color: var(--cyan); color: var(--cyan); background: rgba(0,212,255,0.08); }
  .map-radio input { accent-color: var(--cyan); }
  .header-map { display: flex; flex-direction: column; align-items: center; gap: 8px; width: fit-content; align-self: center; padding: 12px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); margin-bottom: 8px; }
  .header-map-title { margin: 0; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; }
  .header-map-tags { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; }
  .header-tag { display: inline-flex; align-items: center; gap: 2px; padding: 2px 8px; border-radius: 3px; background: rgba(0,212,255,0.08); color: var(--cyan); border: 1px solid rgba(0,212,255,0.15); }
  .header-tag-col { color: var(--text-muted); font-size: var(--fs-caption); }
  .header-tag-sample { color: var(--amber); font-size: var(--fs-caption); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .header-tag-smart { background: rgba(255,140,0,0.1); color: var(--amber); border-color: rgba(255,140,0,0.2); }
  .result-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; text-align: center; }
  .result-icon { color: var(--success); }
  .result-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; }
  .result-info { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0; }
  .result-sub { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
  .result-actions { display: flex; gap: 10px; margin-top: 8px; }

  .pdf-prompt { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 32px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }
  .pdf-prompt-header { display: flex; align-items: center; gap: 10px; }
  .pdf-lock-icon { color: var(--amber); }
  .pdf-prompt-filename { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); }
  .pdf-prompt-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }
  .pdf-password-row { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 400px; }
  .pdf-password-input { flex: 1; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); }
  .pdf-password-input:focus { border-color: var(--cyan); outline: none; box-shadow: 0 0 0 2px rgba(0,212,255,0.15); }
  .pwd-toggle { padding: 8px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; }
  .pwd-toggle:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .pdf-prompt-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .base-selector { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }
  .base-selector-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .base-selector-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; text-align: center; max-width: 500px; }
  .base-selector-list { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 400px; }
  .base-selector-option { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 2px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; background: var(--bg-surface); }
  .base-selector-option:hover { border-color: var(--cyan-dim); }
  .base-selector-option.active { border-color: var(--cyan); background: rgba(0,212,255,0.06); }
  .base-selector-file { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); padding: 2px 8px; border-radius: var(--radius); background: rgba(0,212,255,0.08); }
  .base-selector-count { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); }
  .base-selector-name { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-muted); margin-left: auto; }
  .base-selector-actions { display: flex; gap: 8px; }
</style>
