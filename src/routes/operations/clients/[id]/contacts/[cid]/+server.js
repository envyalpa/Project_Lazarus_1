import { json } from "@sveltejs/kit";
import { getById, update, remove } from "$lib/server/contacts.js";

export async function GET({ params }) {
  const contact = getById(Number(params.cid));
  if (!contact) return json({ error: "Not found" }, { status: 404 });
  return json(contact);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const updated = update(Number(params.cid), data);
  if (!updated) return json({ error: "Not found" }, { status: 404 });
  return json(updated);
}

export async function DELETE({ params }) {
  const result = remove(Number(params.cid));
  if (!result) return json({ error: "Not found" }, { status: 404 });
  return json(result);
}
