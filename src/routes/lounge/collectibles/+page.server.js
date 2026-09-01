import { getCollections, getItems } from '$lib/server/collectibles.js';

export function load({ depends }) {
  depends('collectibles:collections');
  const collections = getCollections().map(c => {
    const items = getItems(c.id);
    const collected = items.filter(i => i.status === 'collected').length;
    return { ...c, total: items.length, collected };
  });
  return { collections };
}
