import { getBrands, saveBrand, deleteBrand } from '$lib/server/brand-helper.js';

export function GET({ params }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const brands = getBrands(clientId);
    return Response.json(brands);
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
    const brandData = await request.json();
    saveBrand({ ...brandData, client_id: clientId });
    return Response.json({ success: true, message: 'Brand profile saved successfully.' });
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
    const { brandId } = await request.json();
    if (!brandId) {
      return Response.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    deleteBrand(Number(brandId));
    return Response.json({ success: true, message: 'Brand profile deleted successfully.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
