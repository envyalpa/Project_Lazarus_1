const SUGGESTION_URL = 'https://v2.sg.media-imdb.com/suggestion/x/';

export const IMDB_KINDS = {
  anime: ['tvSeries', 'tvMiniSeries'],
  movie: ['feature', 'movie', 'tvMovie'],
  tv: ['tvSeries', 'tvMiniSeries']
};

export async function searchImdb(searchTerm, { kinds = null } = {}) {
  if (!searchTerm?.trim()) return [];
  const slug = searchTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!slug) return [];
  try {
    const res = await fetch(SUGGESTION_URL + slug + '.json', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const body = await res.json();
    const results = [];
    for (const item of body.d || []) {
      if (!/^tt\d+$/.test(item.id || '')) continue;
      if (!item.i?.imageUrl) continue;
      if (kinds && kinds.length > 0 && !kinds.includes(item.qid)) continue;
      results.push({
        title: item.l || '',
        imdb_id: item.id,
        synopsis: '',
        cover_url: item.i.imageUrl,
        genres: [],
        source: 'IMDb',
        url: `https://www.imdb.com/title/${item.id}/`
      });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
}

export async function imdbCovers(searchTerm, kinds) {
  const results = await searchImdb(searchTerm, { kinds });
  return results.map(r => ({ url: r.cover_url, source: 'IMDb' }));
}
