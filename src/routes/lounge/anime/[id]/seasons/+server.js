import { json } from '@sveltejs/kit';
import { getByAnime, create, update, remove, incrementWatched, decrementWatched } from '$lib/server/anime-seasons.js';

export async function GET({ params }) {
  return json(getByAnime(params.id));
}

export async function POST({ params, request }) {
  const data = await request.json();
  const { action } = data;

  if (action === 'create') {
    return json(create({ ...data, anime_id: parseInt(params.id) }), { status: 201 });
  }
  if (action === 'update') {
    return json(update(data.id, data));
  }
  if (action === 'delete') {
    return json(remove(data.id));
  }
  if (action === 'increment') {
    return json(incrementWatched(data.id));
  }
  if (action === 'decrement') {
    return json(decrementWatched(data.id));
  }

  return json({ error: 'Unknown action' }, { status: 400 });
}
