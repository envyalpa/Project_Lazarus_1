import { getMonthlyReport, saveMonthlyReport, compileMonthlyReport, deleteMonthlyReport } from '$lib/server/monthly-reports-helper.js';

export function GET({ params, url }) {
  const clientId = Number(params.id);
  const month = Number(url.searchParams.get('month'));
  const year = Number(url.searchParams.get('year'));

  if (!clientId || !month || !year) {
    return Response.json({ error: 'Client ID, month, and year are required' }, { status: 400 });
  }

  try {
    const content = getMonthlyReport(clientId, month, year);
    return Response.json({ content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { month, year } = await request.json();
    if (!month || !year) {
      return Response.json({ error: 'Month and year are required' }, { status: 400 });
    }
    const content = await compileMonthlyReport(clientId, Number(month), Number(year));
    return Response.json({ success: true, content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { month, year, content } = await request.json();
    if (!month || !year) {
      return Response.json({ error: 'Month and year are required' }, { status: 400 });
    }
    saveMonthlyReport(clientId, Number(month), Number(year), content);
    return Response.json({ success: true, message: 'Monthly report saved successfully.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { month, year } = await request.json();
    if (!month || !year) {
      return Response.json({ error: 'Month and year are required' }, { status: 400 });
    }
    deleteMonthlyReport(clientId, Number(month), Number(year));
    return Response.json({ success: true, message: 'Monthly report deleted successfully.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
