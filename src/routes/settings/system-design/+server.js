import { json } from '@sveltejs/kit';
import { loadFontConfig, saveFontConfig } from '$lib/server/fonts.js';

export async function GET() {
  return json({ fontConfig: loadFontConfig() });
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    saveFontConfig(body);
    return json({ success: true, fontConfig: loadFontConfig() });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
