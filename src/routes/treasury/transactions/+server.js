import * as transactions from '$lib/server/treasury/transactions.js';

export async function GET({ url }) {
  const range = url.searchParams.get('range');
  const date = url.searchParams.get('date');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const type = url.searchParams.get('type');
  const category_id = url.searchParams.get('category_id');
  const paid_by = url.searchParams.get('paid_by');
  const paid_to = url.searchParams.get('paid_to');
  const q = url.searchParams.get('q');
  const entity = url.searchParams.get('entity');

  const hasFilter = range || startDate || type || category_id || paid_by || paid_to || q || entity;
  if (!hasFilter) {
    const all = transactions.getAll();
    return new Response(JSON.stringify(all), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = transactions.getFiltered({
    range, date, startDate, endDate,
    type, category_id, paid_by, paid_to, q, entity
  });
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  const data = await request.json();

  if (data.bulk_delete) {
    const result = transactions.removeMultiple(data.ids);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (data.bulk_update) {
    const result = transactions.updateMultiple(data.ids, { title: data.title });
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const txn = transactions.create(data);
  return new Response(JSON.stringify(txn), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
