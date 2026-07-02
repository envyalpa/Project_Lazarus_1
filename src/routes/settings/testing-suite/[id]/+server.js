import { json } from '@sveltejs/kit';
import { updateRun, deleteRun } from '$lib/server/testing-suite.js';

export async function PUT({ params, request }) {
  try {
    const id = Number(params.id);
    const { run_name, platform_name, client_id, project_id, url, username, password } = await request.json();
    
    if (!run_name || !platform_name) {
      return json({ error: 'Evaluation Name and Platform Name are required.' }, { status: 400 });
    }

    const success = updateRun(id, { run_name, platform_name, client_id, project_id, url, username, password });
    if (success) {
      return json({ success: true });
    } else {
      return json({ error: 'Failed to update evaluation.' }, { status: 400 });
    }
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const id = Number(params.id);
    const success = deleteRun(id);
    if (success) {
      return json({ success: true });
    } else {
      return json({ error: 'Failed to delete evaluation.' }, { status: 400 });
    }
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
