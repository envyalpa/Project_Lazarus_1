export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatCurrency(amount, currency = 'INR') {
  if (amount == null || isNaN(Number(amount))) return '—';
  const prefix = currency === 'INR' ? '₹' : '$';
  return prefix + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCurrency(str) {
  if (str == null || str === '') return NaN;
  const cleaned = String(str).replace(/[₹\s,]/g, '');
  return parseFloat(cleaned);
}
