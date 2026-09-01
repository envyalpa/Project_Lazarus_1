import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';
import { searchImdb, IMDB_KINDS } from '$lib/server/imdb-search.js';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function decodeHtml(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&#\d+;/g, '');
}

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

function extractTmdbId(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!u.hostname.includes('themoviedb.org')) return null;
    const parts = u.pathname.replace(/\/+$/, '').split('/');
    const tvIndex = parts.indexOf('tv');
    if (tvIndex === -1 || !parts[tvIndex + 1]) return null;
    const idPart = parts[tvIndex + 1];
    const match = idPart.match(/^(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch { return null; }
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
  console.log(`[TMDB resolveGenres] input=${scrapedGenres.length}, resolved_ids=[${genre_ids.join(', ')}], new=${newGenres.length}`);
  return { genre_ids, new_genres: newGenres };
}

function parseTmdbShowPage(html) {
  const title = extractMeta(html, 'title');
  const synopsis = extractMeta(html, 'description');
  const cover = extractMeta(html, 'image');

  const genres = [];
  const genreMatches = html.matchAll(/<a\s+href="\/genre\/\d+[^"]*"[^>]*>([^<]+)<\/a>/gi);
  for (const m of genreMatches) {
    const name = decodeHtml(m[1]).trim();
    if (name && !genres.includes(name)) genres.push(name);
  }

  console.log(`[TMDB scrape] title=${title}, genres_found=${genres.length}, genres=[${genres.join(', ')}], html_length=${html.length}`);

  const seasonsFromLinks = [];
  for (const m of html.matchAll(/href="\/tv\/\d+-[^"]*\/season\/(\d+)"[^>]*>/gi)) {
    const num = parseInt(m[1]);
    if (num > 0 && !seasonsFromLinks.find(s => s.season_number === num)) {
      seasonsFromLinks.push({ season_number: num, total_episodes: 0 });
    }
  }

  return { title, synopsis, cover_url: cover || '', genres, seasons: seasonsFromLinks };
}

async function scrapeTmdbPage(url) {
  const enUrl = url.includes('?')
    ? url + '&language=en-US'
    : url + '?language=en-US';
  try {
    const res = await fetch(enUrl, {
      headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function scrapeTmdbSeasonsPage(showUrl) {
  const seasonsUrl = showUrl.replace(/\/+$/, '') + '/seasons';
  const html = await scrapeTmdbPage(seasonsUrl);
  if (!html) return [];

  const seasons = [];
  const seen = new Set();
  const blocks = html.split(/<div class="season_wrapper">/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const linkMatch = block.match(/href="\/tv\/[^"]*\/season\/(\d+)/);
    if (!linkMatch) continue;
    const num = parseInt(linkMatch[1]);
    if (num <= 0 || seen.has(num)) continue;
    seen.add(num);
    const epMatch = block.match(/(\d+)\s*Episodes?/i);
    const totalEpisodes = epMatch ? parseInt(epMatch[1]) : 0;
    seasons.push({ season_number: num, total_episodes: totalEpisodes });
  }

  if (seasons.length === 0) {
    for (const m of html.matchAll(/href="\/tv\/[^"]*\/season\/(\d+)/gi)) {
      const num = parseInt(m[1]);
      if (num > 0 && !seen.has(num)) {
        seen.add(num);
        const surrounding = html.substring(m.index, m.index + 800);
        const epMatch = surrounding.match(/(\d+)\s*Episodes?/i);
        const totalEpisodes = epMatch ? parseInt(epMatch[1]) : 0;
        seasons.push({ season_number: num, total_episodes: totalEpisodes });
      }
    }
  }

  return seasons;
}

async function buildCoversList(title, coverUrl) {
  const covers = [];
  const seen = new Set();
  if (title?.trim()) {
    const imdbResults = await searchImdb(title.trim(), { kinds: IMDB_KINDS.tv });
    for (const r of imdbResults) {
      if (!r.cover_url || seen.has(r.cover_url)) continue;
      seen.add(r.cover_url);
      covers.push({ url: r.cover_url, source: 'IMDb' });
    }
  }
  if (coverUrl && !seen.has(coverUrl)) {
    seen.add(coverUrl);
    covers.push({ url: coverUrl, source: 'URL' });
  }
  return { covers, defaultCoverUrl: covers[0]?.url || coverUrl || '' };
}

async function findTmdbShowByTitle(title) {
  const query = encodeURIComponent(title.trim());
  const html = await scrapeTmdbPage(`https://www.themoviedb.org/search/tv?query=${query}`);
  if (!html) return null;
  const m = html.match(/href="\/tv\/(\d+)-([^"]*)"/);
  if (!m) return null;
  const tmdbId = parseInt(m[1]);
  return { tmdb_id: tmdbId, url: `https://www.themoviedb.org/tv/${tmdbId}-${m[2]}` };
}

async function scrapeGenericUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = extractMeta(html, 'title');
    const synopsis = extractMeta(html, 'description');
    const cover = extractMeta(html, 'image');
    return { title, synopsis, cover_url: cover || '' };
  } catch { return null; }
}

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'search-by-name' && body.name?.trim()) {
    const query = encodeURIComponent(body.name.trim());
    const searchUrl = `https://www.themoviedb.org/search/tv?query=${query}`;
    const html = await scrapeTmdbPage(searchUrl);
    if (!html) return json({ results: [] });

    const results = [];
    const cardPattern = /<a[^>]*href="\/tv\/(\d+)-([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi;
    let m;
    while ((m = cardPattern.exec(html)) !== null) {
      const tmdbId = parseInt(m[1]);
      const slug = m[2];
      const img = m[3];
      const titleFromSlug = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const titleMatch = html.substring(m.index, m.index + 1000).match(/<span[^>]*class="[^"]*"[^>]*>([^<]+)<\/span>/);
      const title = titleMatch ? decodeHtml(titleMatch[1]).trim() : titleFromSlug;
      const coverUrl = img.startsWith('http') ? img : `https://image.tmdb.org${img}`;
      if (!results.find(r => r.tmdb_id === tmdbId)) {
        results.push({ title, tmdb_id: tmdbId, cover_url: coverUrl, source: 'TMDB', url: `https://www.themoviedb.org/tv/${tmdbId}-${slug}` });
      }
      if (results.length >= 8) break;
    }

    if (results.length === 0) {
      const linkPattern = /href="\/tv\/(\d+)-([^"]*)"[^>]*>/gi;
      while ((m = linkPattern.exec(html)) !== null) {
        const tmdbId = parseInt(m[1]);
        const slug = m[2];
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!results.find(r => r.tmdb_id === tmdbId)) {
          results.push({ title, tmdb_id: tmdbId, cover_url: '', source: 'TMDB', url: `https://www.themoviedb.org/tv/${tmdbId}-${slug}` });
        }
        if (results.length >= 8) break;
      }
    }

    const imdbResults = await searchImdb(body.name.trim(), { kinds: IMDB_KINDS.tv });
    const merged = [...imdbResults];
    const seenIds = new Set(merged.map(r => r.imdb_id || r.tmdb_id));
    for (const r of results) {
      const key = r.tmdb_id || r.imdb_id;
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      merged.push(r);
      if (merged.length >= 12) break;
    }

    return json({ results: merged });
  }

  if (body.action === 'sync-seasons' && body.title?.trim()) {
    return json({ seasons: [] });
  }

  if (body.action === 'resolve-result' && (body.url || body.tmdb_id || body.imdb_id)) {
    const imdbId = body.imdb_id || (typeof body.url === 'string' && body.url.match(/title\/(tt\d+)/)?.[1]) || null;
    if (imdbId && body.title?.trim()) {
      const found = await findTmdbShowByTitle(body.title);
      if (found) {
        const html = await scrapeTmdbPage(found.url);
        if (html) {
          const parsed = parseTmdbShowPage(html);
          const seasons = await scrapeTmdbSeasonsPage(found.url);
          const built = await buildCoversList(parsed.title || body.title, body.cover_url || parsed.cover_url);
          const genreResult = resolveGenres(parsed.genres);
          return json({
            title: parsed.title || body.title,
            synopsis: parsed.synopsis || body.synopsis || '',
            cover_url: built.defaultCoverUrl,
            ...genreResult,
            covers: built.covers,
            seasons
          });
        }
      }
      return json({
        title: body.title,
        synopsis: body.synopsis || '',
        cover_url: body.cover_url || '',
        ...resolveGenres([]),
        covers: body.cover_url ? [{ url: body.cover_url, source: 'IMDb' }] : [],
        seasons: []
      });
    }
    let resolveUrl = body.url;
    if (!resolveUrl && body.tmdb_id) {
      resolveUrl = `https://www.themoviedb.org/tv/${body.tmdb_id}`;
    }
    const html = await scrapeTmdbPage(resolveUrl);
    if (!html) return json({ error: 'Could not fetch TMDB page' }, { status: 404 });
    const parsed = parseTmdbShowPage(html);
    const seasons = await scrapeTmdbSeasonsPage(resolveUrl);
    const built = await buildCoversList(parsed.title, parsed.cover_url);
    const genreResult = resolveGenres(parsed.genres);
    return json({
      title: parsed.title,
      synopsis: parsed.synopsis,
      cover_url: built.defaultCoverUrl,
      ...genreResult,
      covers: built.covers,
      seasons
    });
  }

  const { url } = body;
  if (!url) return json({ error: 'URL is required' }, { status: 400 });

  try { new URL(url); } catch {
    return json({ error: 'Invalid URL' }, { status: 400 });
  }

  const tmdbId = extractTmdbId(url);
  if (tmdbId) {
    const html = await scrapeTmdbPage(url);
    if (!html) return json({ error: 'Could not fetch TMDB page' }, { status: 404 });
    const parsed = parseTmdbShowPage(html);
    const seasons = await scrapeTmdbSeasonsPage(url);
    const built = await buildCoversList(parsed.title, parsed.cover_url);
    const genreResult = resolveGenres(parsed.genres);
    return json({
      title: parsed.title,
      synopsis: parsed.synopsis,
      cover_url: built.defaultCoverUrl,
      ...genreResult,
      covers: built.covers,
      seasons
    });
  }

  const scraped = await scrapeGenericUrl(url);
  if (!scraped?.title) {
    return json({ error: 'Could not extract TV show details from this URL' }, { status: 404 });
  }

  const built = await buildCoversList(scraped.title, scraped.cover_url);

  return json({
    title: scraped.title,
    synopsis: scraped.synopsis,
    cover_url: built.defaultCoverUrl,
    ...resolveGenres([]),
    covers: built.covers,
    seasons: []
  });
}
