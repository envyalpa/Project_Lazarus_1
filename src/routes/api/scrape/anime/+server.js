import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';
import { searchImdb, IMDB_KINDS } from '$lib/server/imdb-search.js';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const browserHeaders = {
  'User-Agent': userAgent,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta\\s+property=["']og:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+name=["']og:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+property=["']twitter:${name}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']*)["']`, 'i')
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtml(m[1]);
  }
  return null;
}

function extractTitle(html) {
  const og = extractMeta(html, 'title');
  if (og) return og;
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (m) return decodeHtml(m[1]).trim();
  return '';
}

function extractDescription(html) {
  const og = extractMeta(html, 'description');
  if (og) return og;
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (m) return decodeHtml(m[1]);
  return '';
}

function extractImage(html) {
  const og = extractMeta(html, 'image');
  if (og) return og;
  return '';
}

function extractGenres(html) {
  const genres = [];
  const patterns = [
    ...html.matchAll(/<meta\s+property=["']article:tag["']\s+content=["']([^"']*)["']/gi),
    ...html.matchAll(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/gi),
    ...html.matchAll(/<meta\s+property=["']og:video:tag["']\s+content=["']([^"']*)["']/gi)
  ];
  for (const m of patterns) {
    const vals = m[1].split(',').map(v => v.trim()).filter(Boolean);
    for (const v of vals) {
      if (!genres.includes(v)) genres.push(v);
    }
  }
  return genres;
}

function decodeHtml(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
}

function extractCrunchyrollSlug(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.replace(/\/+$/, '').split('/');
    if (parts.length >= 2 && parts[parts.length - 2] === 'series') return parts[parts.length - 1];
    return parts[parts.length - 1] || null;
  } catch { return null; }
}

function stripHtmlTags(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

async function searchAniList(searchTerm) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { romaji english }
        description
        coverImage { extraLarge }
        genres
        episodes
      }
    }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { search: searchTerm } })
  });
  if (!res.ok) return null;
  const body = await res.json();
  if (!body.data?.Media) return null;
  const m = body.data.Media;
  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || '',
    synopsis: m.description ? stripHtmlTags(m.description) : '',
    cover_url: m.coverImage?.extraLarge || '',
    genres: m.genres || [],
    episodes: m.episodes || 0
  };
}

async function searchAniListMulti(searchTerm) {
  const query = `query ($s: String) { Page(page:1, perPage:5) { media(search:$s, type:ANIME) { title { romaji english } description coverImage { extraLarge } genres } } }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { s: searchTerm } })
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.data?.Page?.media || []).map(m => ({
    title: m.title?.english || m.title?.romaji || '',
    synopsis: m.description ? stripHtmlTags(m.description) : '',
    cover_url: m.coverImage?.extraLarge || '',
    genres: m.genres || [],
    source: 'AniList'
  }));
}

async function searchJikan(searchTerm) {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=5`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.data || []).map(a => ({
    title: a.title || '',
    synopsis: (a.synopsis || '').replace(/<[^>]*>/g, '').trim(),
    cover_url: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '',
    genres: (a.genres || []).map(g => g.name),
    source: 'MAL'
  })).filter(a => a.cover_url);
}

async function searchKitsu(searchTerm) {
  const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTerm)}&page[limit]=5`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.api+json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.data || []).map(a => ({
    title: a.attributes?.canonicalTitle || '',
    synopsis: (a.attributes?.synopsis || '').replace(/<[^>]*>/g, '').trim(),
    cover_url: a.attributes?.posterImage?.original || a.attributes?.posterImage?.large || '',
    genres: [],
    source: 'Kitsu'
  })).filter(a => a.cover_url);
}

async function searchByNameMulti(searchTerm) {
  const [imdbResults, aniResults, jikanResults, kitsuResults] = await Promise.all([
    searchImdb(searchTerm, { kinds: IMDB_KINDS.anime }),
    searchAniListMulti(searchTerm),
    searchJikan(searchTerm),
    searchKitsu(searchTerm)
  ]);
  const sources = [imdbResults, aniResults, jikanResults, kitsuResults];
  const seen = new Set();
  const merged = [];
  let i = 0;
  while (merged.length < 12 && sources.some(s => i < s.length)) {
    for (const src of sources) {
      if (i < src.length) {
        const r = src[i];
        if (r.cover_url && !seen.has(r.cover_url)) {
          seen.add(r.cover_url);
          merged.push(r);
        }
      }
    }
    i++;
  }
  return merged;
}

async function resolveViaAniList(url) {
  const slug = extractCrunchyrollSlug(url);
  if (!slug) return null;
  const searchTerm = slug.replace(/[-_]/g, ' ');
  return await searchAniList(searchTerm);
}

async function fetchAniListMedia(mediaId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english }
        episodes
        format
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              episodes
              format
            }
          }
        }
      }
    }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { id: mediaId } })
  });
  if (!res.ok) return null;
  const body = await res.json();
  if (!body.data?.Media) return null;
  const m = body.data.Media;
  return {
    id: m.id,
    title: m.title?.english || m.title?.romaji || '',
    episodes: m.episodes || 0,
    format: m.format || '',
    relations: (m.relations?.edges || []).map(e => ({
      relationType: e.relationType,
      id: e.node.id,
      title: e.node.title?.english || e.node.title?.romaji || '',
      episodes: e.node.episodes || 0,
      format: e.node.format || ''
    }))
  };
}

async function discoverSeasons(mediaId) {
  const cache = new Map();
  async function fetchCached(id) {
    if (cache.has(id)) return cache.get(id);
    const media = await fetchAniListMedia(id);
    cache.set(id, media);
    return media;
  }
  async function findChainStart(id, visited = new Set()) {
    if (visited.has(id)) return id;
    visited.add(id);
    const media = await fetchCached(id);
    if (!media) return id;
    const prequel = media.relations.find(r => r.relationType === 'PREQUEL');
    if (prequel) return findChainStart(prequel.id, visited);
    return id;
  }
  async function walkForward(id, visited = new Set(), depth = 0) {
    if (depth > 10 || visited.has(id)) return [];
    visited.add(id);
    const media = await fetchCached(id);
    if (!media) return [];
    let result = [];
    const sequel = media.relations.find(r => r.relationType === 'SEQUEL');
    if (sequel) {
      result = await walkForward(sequel.id, visited, depth + 1);
    }
    const isValidSeason = media.format === 'TV' || media.format === 'TV_SHORT';
    if (isValidSeason) {
      result.unshift({ total_episodes: media.episodes });
    }
    return result;
  }
  const startId = await findChainStart(mediaId);
  const chain = await walkForward(startId);
  return chain.map((s, i) => ({ season_number: i + 1, total_episodes: s.total_episodes }));
}

async function discoverSeasonsByTitle(title) {
  if (!title?.trim()) return [];
  try {
    const query = `query ($s: String) { Media(search: $s, type: ANIME) { id } }`;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { s: title.trim() } })
    });
    if (!res.ok) return [];
    const body = await res.json();
    const id = body.data?.Media?.id;
    if (!id) return [];
    return await discoverSeasons(id);
  } catch { return []; }
}

function resolveGenres(scrapedGenres) {
  const genre_ids = [];
  const newGenres = [];
  for (const name of scrapedGenres) {
    const existing = db.prepare('SELECT * FROM genres WHERE LOWER(name) = LOWER(?)').get(name);
    if (existing) {
      genre_ids.push(existing.id);
    } else {
      const info = db.prepare('INSERT INTO genres (name) VALUES (?)').run(name);
      const g = { id: info.lastInsertRowid, name };
      genre_ids.push(g.id);
      newGenres.push(g);
    }
  }
  return { genre_ids, new_genres: newGenres };
}

async function buildCoversList(scrapedTitle, scrapedCoverUrl) {
  const covers = [];
  const seen = new Set();
  if (scrapedTitle?.trim()) {
    const [imdbResults, aniResults, jikanResults, kitsuResults] = await Promise.all([
      searchImdb(scrapedTitle.trim(), { kinds: IMDB_KINDS.anime }),
      searchAniListMulti(scrapedTitle.trim()),
      searchJikan(scrapedTitle.trim()),
      searchKitsu(scrapedTitle.trim())
    ]);
    for (const r of [...imdbResults, ...aniResults, ...jikanResults, ...kitsuResults]) {
      if (!r.cover_url) continue;
      if (seen.has(r.cover_url)) continue;
      seen.add(r.cover_url);
      covers.push({ url: r.cover_url, source: r.source });
    }
  }
  if (scrapedCoverUrl && !seen.has(scrapedCoverUrl)) {
    seen.add(scrapedCoverUrl);
    covers.push({ url: scrapedCoverUrl, source: 'URL' });
  }
  return { covers, defaultCoverUrl: covers[0]?.url || scrapedCoverUrl || '' };
}

async function resolveResult({ title, cover_url, genres, synopsis }) {
  const built = await buildCoversList(title, cover_url);
  const seasons = await discoverSeasonsByTitle(title);
  return { title, synopsis, cover_url: built.defaultCoverUrl, ...resolveGenres(genres), covers: built.covers, seasons };
}

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'search-by-name' && body.name?.trim()) {
    const results = await searchByNameMulti(body.name.trim());
    return json({ results });
  }

  if (body.action === 'sync-seasons' && body.title?.trim()) {
    const seasons = await discoverSeasonsByTitle(body.title.trim());
    return json({ seasons });
  }

  if (body.action === 'resolve-result' && body.title?.trim()) {
    const resolved = await resolveResult(body);
    return json(resolved);
  }

  const { url } = body;
  if (!url) return json({ error: 'URL is required' }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return json({ error: 'Invalid URL' }, { status: 400 });
  }

  const isCrunchyroll = /crunchyroll/i.test(url);

  try {
    const res = await fetch(url, {
      headers: browserHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      if (isCrunchyroll) {
        const al = await resolveViaAniList(url);
        if (al) {
          const built = await buildCoversList(al.title, al.cover_url);
          const seasons = al.id ? await discoverSeasons(al.id) : [];
          return json({ ...al, cover_url: built.defaultCoverUrl, ...resolveGenres(al.genres), covers: built.covers, seasons });
        }
      }
      if (res.status === 403) {
        return json({ error: 'This site blocks automated requests. Try a MyAnimeList or AniList URL instead.' }, { status: 502 });
      }
      return json({ error: `Server returned ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const title = extractTitle(html);
    const synopsis = extractDescription(html);
    const cover_url = extractImage(html);
    const scrapedGenres = extractGenres(html);
    const built = await buildCoversList(title, cover_url);
    const seasons = await discoverSeasonsByTitle(title);

    return json({ title, cover_url: built.defaultCoverUrl, synopsis, ...resolveGenres(scrapedGenres), covers: built.covers, seasons });
  } catch (err) {
    if (isCrunchyroll) {
      const al = await resolveViaAniList(url);
      if (al) {
        const built = await buildCoversList(al.title, al.cover_url);
        const seasons = al.id ? await discoverSeasons(al.id) : [];
        return json({ ...al, cover_url: built.defaultCoverUrl, ...resolveGenres(al.genres), covers: built.covers, seasons });
      }
    }
    return json({ error: err.message || 'Failed to fetch URL' }, { status: 502 });
  }
}
