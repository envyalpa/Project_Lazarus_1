import * as categories from '$lib/server/treasury/categories.js';

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  return { start: fmt(mon), end: fmt(sun) };
}

function getMonthRange(dateStr) {
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = parts[1] ? Number(parts[1]) : 1;
  const monthStart = y + '-' + String(m).padStart(2, '0') + '-01';
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
  return { start: monthStart, end: monthEnd };
}

function getYearRange(dateStr) {
  const y = dateStr.split('-')[0];
  return { start: y + '-01-01', end: y + '-12-31' };
}

export async function GET({ url }) {
  const range = url.searchParams.get('range');
  const date = url.searchParams.get('date');

  if (range) {
    const refDate = date || new Date().toISOString().slice(0, 10);
    let rangeObj;
    if (range === 'day') rangeObj = { start: refDate, end: refDate };
    else if (range === 'week') rangeObj = getWeekRange(refDate);
    else if (range === 'month') rangeObj = getMonthRange(refDate);
    else if (range === 'year') rangeObj = getYearRange(refDate);

    const result = categories.getAllWithSpending(rangeObj.start, rangeObj.end);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const all = categories.getAll();
  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  const data = await request.json();
  const c = categories.create(data);
  return new Response(JSON.stringify(c), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ request }) {
  const { id, ...data } = await request.json();
  const c = categories.update(Number(id), data);
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  const c = categories.remove(Number(id));
  if (!c) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(c), {
    headers: { 'Content-Type': 'application/json' }
  });
}
