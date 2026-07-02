import { json } from '@sveltejs/kit';

export function listHandlers(store) {
  return {
    GET: async () => json(store.getAll()),
    POST: async ({ request }) => {
      const data = await request.json();
      return json(store.create(data), { status: 201 });
    }
  };
}

export function detailHandlers(store, opts = {}) {
  const toId = opts.numericId ? (v) => Number(v) : (v) => v;
  const idParam = opts.idParam || 'id';
  const errMsg = opts.errorMsg || 'Not found';
  return {
    GET: async ({ params }) => {
      const item = store.getById(toId(params[idParam]));
      if (!item) return json({ error: errMsg }, { status: 404 });
      return json(item);
    },
    PUT: async ({ params, request }) => {
      const data = await request.json();
      const updated = store.update(toId(params[idParam]), data);
      if (!updated) return json({ error: errMsg }, { status: 404 });
      return json(updated);
    },
    DELETE: async ({ params }) => {
      const result = store.remove(toId(params[idParam]));
      if (!result) return json({ error: errMsg }, { status: 404 });
      return json(result);
    }
  };
}
