export function parseCSV(csvText) {
  const rows = [];
  const lines = csvText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else cell += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(cell.trim()); cell = ''; }
        else cell += c;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

export function mapCSVToCriteria(csvRows) {
  if (csvRows.length < 2) return [];

  const headers = csvRows[0].map(h => (h || '').toLowerCase().trim());
  
  const stageIdx = headers.findIndex(h => h.includes('stage') || h.includes('process'));
  const painIdx = headers.findIndex(h => h.includes('pain') || h.includes('point') || h.includes('current process'));
  const testIdx = headers.findIndex(h => h.includes('test') || h.includes('verification') || h.includes('how to test') || h.includes('what to test'));
  const outcomeIdx = headers.findIndex(h => h.includes('outcome') || h.includes('expected'));
  const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('tester') || h.includes('test role'));
  const severityIdx = headers.findIndex(h => h.includes('severity') || h.includes('priority'));

  const getIdx = (foundIdx, defaultIdx) => (foundIdx !== -1 ? foundIdx : defaultIdx);

  const criteria = [];
  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    if (!row || row.length === 0) continue;
    if (row.every(cell => !cell)) continue; // skip entirely empty rows
    
    const stage = row[getIdx(stageIdx, 0)] || `Stage ${i}`;
    const pain_point = row[getIdx(painIdx, 1)] || '';
    const what_to_test = row[getIdx(testIdx, 2)] || '';
    const expected_outcome = row[getIdx(outcomeIdx, 3)] || '';
    const test_role = row[getIdx(roleIdx, 4)] || '';
    let severity = row[getIdx(severityIdx, 5)] || 'Important';
    
    // Normalize severity to match standard labels: Critical, Important, Good to Have
    severity = severity.trim();
    if (/crit/i.test(severity)) severity = 'Critical';
    else if (/good|have/i.test(severity)) severity = 'Good to Have';
    else severity = 'Important';

    if (!what_to_test && !expected_outcome) continue;

    criteria.push({
      criteria_id: i,
      stage,
      pain_point,
      what_to_test,
      expected_outcome,
      test_role,
      severity
    });
  }

  return criteria;
}
