import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const SELF_VPAS = ['envyalpa@oksbi', 'envyalpa-2@okaxis', 'envyalpa@okicici'];

function extractUPIName(desc) {
  const vpaMatch = desc.match(/\/([a-z][a-z0-9._-]+)@[a-z]+/i);
  if (vpaMatch) {
    const name = vpaMatch[1].replace(/[0-9._-]/g, ' ').trim().replace(/\s+/g, ' ');
    if (name.length > 1) return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return null;
}

function extractPOSName(desc) {
  const m = desc.match(/POS\/\d+\/([^\\]+)/);
  if (m) return m[1].trim();
  return null;
}

function cleanTitle(desc, direction) {
  if (desc.startsWith('CHRG/')) {
    const parts = desc.replace('CHRG/', '').replace(/\s*\/.*$/, '').trim();
    const label = parts.replace(/_/g, ' ').replace(/\//g, ' ').trim();
    return 'Bank Charge - ' + label;
  }

  if (desc.startsWith('POS/')) {
    const name = extractPOSName(desc);
    return name || 'POS Purchase';
  }

  if (desc.startsWith('BY CDM')) {
    const depositor = desc.includes('\\') ? desc.split('\\').pop() : '';
    if (depositor) return 'Cash Deposit - ' + depositor.trim();
    return 'Cash Deposit';
  }

  if (desc.startsWith('UPI REFUND')) {
    const refMatch = desc.match(/RRC\s+(\d+)/);
    const ref = refMatch ? ' #' + refMatch[1] : '';
    return 'UPI Refund' + ref;
  }

  if (desc.startsWith('UPI IN/') || desc.startsWith('UPI IN ')) {
    let name = extractUPIName(desc);
    if (name && SELF_VPAS.some(v => desc.includes(v))) return 'Self Transfer (UPI IN)';
    if (name) return 'UPI IN - ' + name;
    return 'UPI Receipt';
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
      if (nftDesc.includes('Q4 ACCOUNTING')) return 'Salary - Q4 Accounting';
      return 'NEFT - ' + nftDesc;
    }
    return 'NEFT Transfer';
  }

  if (desc.startsWith('SBINT')) {
    return 'Interest Credit';
  }

  if (desc.startsWith('UPI ')) {
    return 'UPI Transaction';
  }

  return desc.replace(/\s+\/UPI\d*\w*$/, '').trim();
}

function getVendor(desc) {
  if (desc.startsWith('CHRG/')) return 'Federal Bank';
  const vpaMatch = desc.match(/\/([a-z][a-z0-9._-]+)@[a-z]+/i);
  if (vpaMatch && !SELF_VPAS.some(v => desc.includes(v))) {
    return vpaMatch[1];
  }
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
  const posName = extractPOSName(desc);
  if (posName) return posName;
  return '';
}

export function parsePdf(filePath, password = '') {
  if (!existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  const scriptPath = fileURLToPath(new URL('../../../../lib/federal_parser.py', import.meta.url));
  let cmd = 'python -X utf8 "' + scriptPath + '" "' + filePath + '"';
  if (password) cmd += ' "' + password + '"';
  const output = execSync(cmd, {
    encoding: 'utf-8',
    timeout: 60000
  });

  const raw = JSON.parse(output);
  const rows = [];

  for (const t of raw) {
    const title = cleanTitle(t.description, t.direction);
    const type = t.direction === 'debit' ? 'expense' : 'income';
    const accountLabel = 'Federal Bank 8796';

    rows.push({
      index: rows.length,
      date: t.date,
      title,
      amount: t.amount,
      type,
      category: '',
      category_id: null,
      category_name: '',
      paid_by: t.direction === 'debit' ? accountLabel : '',
      paid_to: t.direction === 'credit' ? accountLabel : '',
      paid_for: t.direction === 'debit' ? 'Me' : '',
      notes: t.description,
      vendor: getVendor(t.description),
      duplicate: false,
      selected: true,
      balance: t.balance,
      dr_cr: t.dr_cr
    });
  }

  return rows;
}
