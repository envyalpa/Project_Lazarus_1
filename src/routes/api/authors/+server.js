import { json } from '@sveltejs/kit';
import { getAll as getAllAuthors, getByName, getById, upsert, update as updateAuthor, renameBooksAuthor, remove as removeAuthor } from '$lib/server/authors.js';
import { fetchWikipediaPage, fetchWikipediaImage, generateSummary } from '$lib/server/author-fetch.js';

export async function GET() {
  return json(getAllAuthors());
}

export async function POST({ request }) {
  const data = await request.json();

  if (data.action === 'auto-fetch') {
    return await handleAutoFetch(data);
  }

  if (data.action === 'delete') {
    const deleted = removeAuthor(data.id);
    return json(deleted, { status: deleted ? 200 : 404 });
  }

  try {
    if (data.id) {
      const existing = getById(data.id);
      if (existing) {
        const updated = await updateAuthor(data.id, data);
        return json(updated);
      }
    }

    const existing = getByName(data.name);
    if (existing) {
      const updated = await upsert(data);
      if (data.old_name && data.old_name !== data.name) {
        console.log('Author rename from:', data.old_name, 'to:', data.name);
        renameBooksAuthor(data.old_name, data.name);
      }
      return json(updated);
    }
    const created = await upsert(data);
    if (data.old_name && data.old_name !== data.name) {
      console.log('Author rename from:', data.old_name, 'to:', data.name);
      renameBooksAuthor(data.old_name, data.name);
    }
    return json(created, { status: 201 });
  } catch (err) {
    console.error('Author save error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}

async function handleAutoFetch({ name, wikiLink }) {
  if (!name) return json({ error: 'Author name required' }, { status: 400 });

  let pageTitle = name;
  if (wikiLink) {
    const titleMatch = wikiLink.match(/\/wiki\/(.+)/);
    if (titleMatch) pageTitle = decodeURIComponent(titleMatch[1]);
  }

  const [wikiText, imageUrl] = await Promise.all([
    fetchWikipediaPage(pageTitle),
    fetchWikipediaImage(pageTitle)
  ]);

  if (!wikiLink && wikiText) {
    const encoded = pageTitle.replace(/ /g, '_');
    wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(encoded)}`;
  }

  const summary = await generateSummary(name, wikiText);
  return json({ summary, image_url: imageUrl, wiki_link: wikiLink || '' });
}
