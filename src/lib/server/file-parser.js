import XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';

/**
 * Parses a file buffer and returns its Markdown representation
 * @param {Buffer} buffer 
 * @param {string} filename 
 * @returns {Promise<string>}
 */
export async function parseFile(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(buffer);
  } else if (ext === 'csv') {
    return parseCsv(buffer);
  } else if (ext === 'pdf') {
    return await parsePdf(buffer);
  } else if (ext === 'md' || ext === 'txt') {
    return buffer.toString('utf-8');
  } else {
    // Fallback for other files: try reading as plain text
    try {
      return buffer.toString('utf-8');
    } catch (err) {
      throw new Error(`Unsupported file type: .${ext}`);
    }
  }
}

function isCellEmpty(cell) {
  if (cell === null || cell === undefined) return true;
  const str = String(cell)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width spaces & byte-order marks
    .replace(/&nbsp;/gi, '')
    .replace(/&#160;/g, '')
    .trim();
  return str === '';
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let markdown = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Filter empty rows (rows where all cells are empty)
    const filteredRows = rows.filter(row => 
      row && row.some(cell => !isCellEmpty(cell))
    );
    
    markdown += `## Sheet: ${sheetName}\n\n`;
    if (filteredRows.length === 0) {
      markdown += '*Sheet is empty*\n\n';
      return;
    }
    
    // Construct GFM table
    const headers = filteredRows[0];
    markdown += '| ' + headers.map(h => escapeTableVal(h)).join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    for (let i = 1; i < filteredRows.length; i++) {
      const row = filteredRows[i];
      // Pad row to match headers length
      const paddedRow = Array.from({ length: headers.length }, (_, k) => row[k] ?? '');
      markdown += '| ' + paddedRow.map(v => escapeTableVal(v)).join(' | ') + ' |\n';
    }
    markdown += '\n';
  });
  
  return markdown;
}

function parseCsv(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Filter empty rows (rows where all cells are empty)
  const filteredRows = rows.filter(row => 
    row && row.some(cell => !isCellEmpty(cell))
  );
  
  let markdown = '';
  if (filteredRows.length === 0) {
    return '*CSV is empty*\n';
  }
  
  const headers = filteredRows[0];
  markdown += '| ' + headers.map(h => escapeTableVal(h)).join(' | ') + ' |\n';
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  
  for (let i = 1; i < filteredRows.length; i++) {
    const row = filteredRows[i];
    const paddedRow = Array.from({ length: headers.length }, (_, k) => row[k] ?? '');
    markdown += '| ' + paddedRow.map(v => escapeTableVal(v)).join(' | ') + ' |\n';
  }
  
  return markdown;
}

async function parsePdf(buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (err) {
    throw new Error('Failed to parse PDF document: ' + err.message);
  }
}

function escapeTableVal(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}
