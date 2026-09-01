import { error } from '@sveltejs/kit';
import { getCollectionBySlug, getItems } from '$lib/server/collectibles.js';

export function load({ depends }) {
  depends('collectibles:monster-cans');
  const collection = getCollectionBySlug('monster-cans');
  if (!collection) throw error(404, 'Collection not found');
  return {
    collection,
    items: getItems(collection.id)
  };
}
