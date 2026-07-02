import { json } from '@sveltejs/kit';
import { updateResult } from '$lib/server/testing-suite.js';

export async function PUT({ request }) {
  try {
    const { id, status, notes_gap, screenshot_path } = await request.json();
    
    if (!id || !status) {
      return json({ error: 'Result ID and status are required.' }, { status: 400 });
    }

    const success = updateResult(Number(id), { status, notes_gap, screenshot_path });
    if (success) {
      return json({ success: true });
    } else {
      return json({ error: 'Failed to update test case result.' }, { status: 400 });
    }
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
