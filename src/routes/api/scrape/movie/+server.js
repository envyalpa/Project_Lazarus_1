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
    const movieIndex = parts.indexOf('movie');
    if (movieIndex === -1 || !parts[movieIndex + 1]) return null;
    const idPart = parts[movieIndex + 1];
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
  return { genre_ids, new_genres: newGenres };
}

function parseTmdbMoviePage(html) {
  const title = extractMeta(html, 'title');
  const synopsis = extractMeta(html, 'description');
  const cover = extractMeta(html, 'image');

  const genres = [];
  const genreMatches = html.matchAll(/<a\s+href="\/genre\/\d+[^"]*"[^>]*>([^<]+)<\/a>/gi);
  for (const m of genreMatches) {
    const name = decodeHtml(m[1]).trim();
    if (name && !genres.includes(name)) genres.push(name);
  }

  let year = null;
  const yearMatch = html.match(/(\d{4})-01-\d{2}/);
  if (yearMatch) year = parseInt(yearMatch[1]);
  if (!year) {
    const dateMatch = html.match(/Release Date[^<]*<[^>]*>(\d{4})/i);
    if (dateMatch) year = parseInt(dateMatch[1]);
  }

  return { title, synopsis, cover_url: cover || '', genres, year };
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

async function buildCoversList(title, coverUrl, source = 'URL') {
  const covers = [];
  const seen = new Set();
  if (title?.trim()) {
    const imdbResults = await searchImdb(title.trim(), { kinds: IMDB_KINDS.movie });
    for (const r of imdbResults) {
      if (!r.cover_url || seen.has(r.cover_url)) continue;
      seen.add(r.cover_url);
      covers.push({ url: r.cover_url, source: 'IMDb' });
    }
  }
  if (coverUrl && !seen.has(coverUrl)) {
    seen.add(coverUrl);
    covers.push({ url: coverUrl, source });
  }
  return { covers, defaultCoverUrl: covers[0]?.url || coverUrl || '' };
}

async function findTmdbMovieByTitle(title) {
  const query = encodeURIComponent(title.trim());
  const html = await scrapeTmdbPage(`https://www.themoviedb.org/search/movie?query=${query}`);
  if (!html) return null;
  const m = html.match(/href="\/movie\/(\d+)-([^"]*)"/);
  if (!m) return null;
  const tmdbId = parseInt(m[1]);
  return { tmdb_id: tmdbId, url: `https://www.themoviedb.org/movie/${tmdbId}-${m[2]}` };
}

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'search-by-name' && body.name?.trim()) {
    const query = encodeURIComponent(body.name.trim());
    const searchUrl = `https://www.themoviedb.org/search/movie?query=${query}`;
    const html = await scrapeTmdbPage(searchUrl);
    if (!html) return json({ results: [] });

    const results = [];
    const cardPattern = /<a[^>]*href="\/movie\/(\d+)-([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi;
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
        results.push({ title, tmdb_id: tmdbId, cover_url: coverUrl, source: 'TMDB', url: `https://www.themoviedb.org/movie/${tmdbId}-${slug}` });
      }
      if (results.length >= 8) break;
    }

    if (results.length === 0) {
      const linkPattern = /href="\/movie\/(\d+)-([^"]*)"[^>]*>/gi;
      while ((m = linkPattern.exec(html)) !== null) {
        const tmdbId = parseInt(m[1]);
        const slug = m[2];
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!results.find(r => r.tmdb_id === tmdbId)) {
          results.push({ title, tmdb_id: tmdbId, cover_url: '', source: 'TMDB', url: `https://www.themoviedb.org/movie/${tmdbId}-${slug}` });
        }
        if (results.length >= 8) break;
      }
    }

    const imdbResults = await searchImdb(body.name.trim(), { kinds: IMDB_KINDS.movie });
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

  if (body.action === 'resolve-result' && (body.url || body.tmdb_id || body.imdb_id)) {
    const imdbId = body.imdb_id || (typeof body.url === 'string' && body.url.match(/title\/(tt\d+)/)?.[1]) || null;
    if (imdbId && body.title?.trim()) {
      const found = await findTmdbMovieByTitle(body.title);
      if (found) {
        const html = await scrapeTmdbPage(found.url);
        if (html) {
          const parsed = parseTmdbMoviePage(html);
          const built = await buildCoversList(parsed.title || body.title, body.cover_url || parsed.cover_url, 'TMDB');
          const genreResult = resolveGenres(parsed.genres);
          return json({
            title: parsed.title || body.title,
            synopsis: parsed.synopsis || body.synopsis || '',
            cover_url: built.defaultCoverUrl,
            year: parsed.year,
            ...genreResult,
            covers: built.covers
          });
        }
      }
      return json({
        title: body.title,
        synopsis: body.synopsis || '',
        cover_url: body.cover_url || '',
        year: null,
        ...resolveGenres([]),
        covers: body.cover_url ? [{ url: body.cover_url, source: 'IMDb' }] : []
      });
    }
    let resolveUrl = body.url;
    if (!resolveUrl && body.tmdb_id) {
      resolveUrl = `https://www.themoviedb.org/movie/${body.tmdb_id}`;
    }
    const html = await scrapeTmdbPage(resolveUrl);
    if (!html) return json({ error: 'Could not fetch TMDB page' }, { status: 404 });
    const parsed = parseTmdbMoviePage(html);
    const built = await buildCoversList(parsed.title, parsed.cover_url, 'TMDB');
    const genreResult = resolveGenres(parsed.genres);
    return json({
      title: parsed.title,
      synopsis: parsed.synopsis,
      cover_url: built.defaultCoverUrl,
      year: parsed.year,
      ...genreResult,
      covers: built.covers
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
    const parsed = parseTmdbMoviePage(html);
    const built = await buildCoversList(parsed.title, parsed.cover_url, 'TMDB');
    const genreResult = resolveGenres(parsed.genres);
    return json({
      title: parsed.title,
      synopsis: parsed.synopsis,
      cover_url: built.defaultCoverUrl,
      year: parsed.year,
      ...genreResult,
      covers: built.covers
    });
  }

  const scraped = await scrapeGenericUrl(url);
  if (!scraped?.title) {
    return json({ error: 'Could not extract movie details from this URL' }, { status: 404 });
  }

  const built = await buildCoversList(scraped.title, scraped.cover_url, 'URL');

  return json({
    title: scraped.title,
    synopsis: scraped.synopsis,
    cover_url: built.defaultCoverUrl,
    ...resolveGenres([]),
    covers: built.covers
  });
}
