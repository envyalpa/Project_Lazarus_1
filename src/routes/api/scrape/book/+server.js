import { json } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/engine-config.js';
import db from '$lib/server/db.js';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rlm;/g, '')
    .replace(/&lrm;/g, '')
    .replace(/\u200f/g, '') // strip RTL mark
    .replace(/\u200e/g, '') // strip LTR mark
    .trim();
}

function extractSeriesFromTitle(raw) {
  if (!raw) return { cleanTitle: raw, series_name: null, volume_number: null, total_volumes: null };

  let series_name = null;
  let volume_number = null;
  let total_volumes = null;
  let cleanTitle = raw;

  // (Book X of [the] "Series Name")
  const bookOf = raw.match(/\(?\s*(?:Book|Volume)\s*(\d+)\s*of\s+(?:the\s+)?["“]?([^"”\)\]]+)["”]?\s*\)?/i);
  if (bookOf) {
    volume_number = parseInt(bookOf[1], 10);
    series_name = bookOf[2].trim();
    cleanTitle = raw.replace(bookOf[0], '').replace(/[,\s]+$/, '').trim();
    return { cleanTitle, series_name, volume_number, total_volumes };
  }

  // (Series Name, #X of Y) or (Series Name, #X)
  const seriesHash = raw.match(/\(\s*["“]?([^"”\(\)]+?)["”]?\s*[,–—-]\s*#\s*(\d+)\s*(?:of\s*(\d+))?\s*\)/i);
  if (seriesHash) {
    series_name = seriesHash[1].trim();
    volume_number = parseInt(seriesHash[2], 10);
    if (seriesHash[3]) total_volumes = parseInt(seriesHash[3], 10);
    cleanTitle = raw.replace(seriesHash[0], '').replace(/[,\s]+$/, '').trim();
    return { cleanTitle, series_name, volume_number, total_volumes };
  }

  // (Series Name, Book X)
  const seriesBook = raw.match(/\(\s*["“]?([^"”\(\)]+?)["”]?\s*[,]\s*(?:Book|Volume)\s*(\d+)\s*\)/i);
  if (seriesBook) {
    series_name = seriesBook[1].trim();
    volume_number = parseInt(seriesBook[2], 10);
    cleanTitle = raw.replace(seriesBook[0], '').replace(/[,\s]+$/, '').trim();
    return { cleanTitle, series_name, volume_number, total_volumes };
  }

  // (#X of Y) or (#X) — just volume info
  const hashOnly = raw.match(/\(?\s*#\s*(\d+)\s*(?:of\s*(\d+))?\s*\)?/i);
  if (hashOnly) {
    volume_number = parseInt(hashOnly[1], 10);
    if (hashOnly[2]) total_volumes = parseInt(hashOnly[2], 10);
    cleanTitle = raw.replace(hashOnly[0], '').replace(/[,\s]+$/, '').trim();
    return { cleanTitle, series_name, volume_number, total_volumes };
  }

  return { cleanTitle: raw, series_name: null, volume_number: null, total_volumes: null };
}

function cleanTitle(title) {
  if (!title) return '';
  
  // Split pipe separators (format / marketing tags)
  let primary = title.split('|')[0].trim();
  
  // Look for colon or dash separators and check if subtitle contains marketing fluff
  const separators = [':', ' - ', ' – ', ' — '];
  for (const sep of separators) {
    if (primary.includes(sep)) {
      const parts = primary.split(sep);
      const mainTitle = parts[0].trim();
      const subtitle = parts.slice(1).join(sep).trim();
      
      const fluffRegex = /\b(?:bestseller|bestselling|author of|from the author|now a major motion picture|starring|edition|hardcover|paperback|audiobook|kindle|gift book|gift edition|collectors|collector's|special edition|discover|follow.?up|phenomenon|acclaimed|the follow-up|the global|the highly anticipated|praise for)\b/i;
      
      if (fluffRegex.test(subtitle)) {
        primary = mainTitle;
        break;
      }
    }
  }
  
  // Strip trailing format descriptors in parentheses/brackets
  primary = primary.replace(/\s*[\[\(](?:Hardcover|Paperback|Kindle|Audiobook|Special Edition|Collector's Edition|Gift Edition|A Novel)[\]\)]/gi, '').trim();
  
  return primary;
}

function parseAmazonHTML(html) {
  // 1. Title
  let rawTitle = '';
  const titleMatch = html.match(/id="productTitle"[^>]*>\s*([^<]+)\s*<\/span>/i) ||
                     html.match(/id="btAsinTitle"[^>]*>\s*([^<]+)\s*<\/span>/i);
  if (titleMatch) {
    rawTitle = decodeHtmlEntities(titleMatch[1]);
  }

  // Extract series info from title patterns
  const seriesFromTitle = extractSeriesFromTitle(rawTitle);
  let title = seriesFromTitle.cleanTitle;
  let series_name = seriesFromTitle.series_name;
  let series_book_number = seriesFromTitle.volume_number;
  let series_total_books = seriesFromTitle.total_volumes;

  // Also check Amazon HTML for series info (may override title-based extraction)
  const seriesTitleMatch = html.match(/<span[^>]*(?:id="series-title"|class="series-title")[^>]*>\s*([^<]+)\s*<\/span>/i) ||
                           html.match(/<div[^>]*(?:id="rpi-series"|class="rpi-section")[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
  if (seriesTitleMatch && !series_name) {
    series_name = decodeHtmlEntities(seriesTitleMatch[1]).trim();
  }

  // Check detail bullets for "Series:" or "Book Series:" entries
  const bulletSection = html.match(/id="detailBullets_feature_div"([\s\S]*?)<\/div>/i);
  if (bulletSection && !series_name) {
    const seriesBullet = bulletSection[1].match(/<li>[\s\S]*?(?:Series|Book Series)[:\s]+([^<]+?)<\/li>/i);
    if (seriesBullet) {
      series_name = decodeHtmlEntities(seriesBullet[1]).trim();
    }
  }

  // 2. Authors
  const authors = [];
  const bylineMatch = html.match(/id="bylineInfo"[^>]*>([\s\S]*?)<\/div>/i);
  if (bylineMatch) {
    const bylineHtml = bylineMatch[1];
    const authorSpanRegex = /<span class="author[^"]*"[^>]*>[\s\S]*?<a[^>]+>\s*([^<]+)\s*<\/a>/gi;
    let match;
    while ((match = authorSpanRegex.exec(bylineHtml)) !== null) {
      const name = decodeHtmlEntities(match[1]);
      if (name && !authors.includes(name)) {
        authors.push(name);
      }
    }
    
    if (authors.length === 0) {
      const authorLinkRegex = /<a[^>]+href="\/[^"]*(?:author|search|field-author)[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/gi;
      let baMatch;
      while ((baMatch = authorLinkRegex.exec(bylineHtml)) !== null) {
        const name = decodeHtmlEntities(baMatch[1]);
        if (name && !authors.includes(name) && !/books|visit/i.test(name)) {
          authors.push(name);
        }
      }
    }
  }

  if (authors.length === 0) {
    const contributorRegex = /class="[^"]*contributorNameID[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/gi;
    let match;
    while ((match = contributorRegex.exec(html)) !== null) {
      const name = decodeHtmlEntities(match[1]);
      if (name && !authors.includes(name)) {
        authors.push(name);
      }
    }
  }

  // 3. Cover Image
  let coverUrl = '';
  const imgTagMatch = html.match(/<img[^>]+(?:id|data-a-image-name)="landingImage"[^>]*>/i) ||
                       html.match(/<img[^>]+(?:id|data-a-image-name)="imgBlkFront"[^>]*>/i) ||
                       html.match(/<img[^>]+(?:id|data-a-image-name)="ebooksImgBlk"[^>]*>/i);
  if (imgTagMatch) {
    const tag = imgTagMatch[0];
    const srcMatch = tag.match(/src="([^"]+)"/i);
    const oldHiresMatch = tag.match(/data-old-hires="([^"]+)"/i);
    coverUrl = oldHiresMatch ? oldHiresMatch[1] : (srcMatch ? srcMatch[1] : '');
  }

  if (!coverUrl) {
    const largeMatch = html.match(/"large":"([^"]+)"/i);
    if (largeMatch) {
      coverUrl = largeMatch[1];
    }
  }

  // Fallback to dynamic image json
  if (!coverUrl) {
    const dynamicImageMatch = html.match(/data-a-dynamic-image="([^"]+)"/i);
    if (dynamicImageMatch) {
      try {
        const images = JSON.parse(dynamicImageMatch[1].replace(/&quot;/g, '"'));
        const urls = Object.keys(images);
        if (urls.length > 0) {
          let bestUrl = urls[0];
          let maxArea = 0;
          for (const u of urls) {
            const dim = images[u];
            if (Array.isArray(dim) && dim[0] * dim[1] > maxArea) {
              maxArea = dim[0] * dim[1];
              bestUrl = u;
            }
          }
          coverUrl = bestUrl;
        }
      } catch {}
    }
  }

  // 4. Synopsis / Description
  let synopsis = '';
  const descMatch = html.match(/data-a-expander-name="book_description_expander"[^>]*>([\s\S]*?)<\/div>/i) ||
                    html.match(/id="bookDescription_feature_div"[^>]*>([\s\S]*?)<\/div>/i);
  if (descMatch) {
    synopsis = decodeHtmlEntities(descMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  }

  // 5. Categories / Genres
  const categories = [];
  const detailBullets = html.match(/id="detailBullets_feature_div"([\s\S]*?)<\/div>/i);
  if (detailBullets) {
    const bulletHtml = detailBullets[1];
    const liRegex = /<li>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(bulletHtml)) !== null) {
      const text = decodeHtmlEntities(liMatch[1].replace(/<[^>]*>/g, ''));
      if (text.includes('Best Sellers Rank')) {
        const rankRegex = /#\d+\s+in\s+([^(\n]+?)(?:\s*\(|$)/gi;
        let rMatch;
        while ((rMatch = rankRegex.exec(text)) !== null) {
          const category = rMatch[1].trim();
          if (category && !categories.includes(category) && !/books/i.test(category)) {
            categories.push(category);
          }
        }
      }
    }
  }

  if (categories.length === 0) {
    const prodTableMatch = html.match(/class="prodDetTable"([\s\S]*?)<\/table>/i);
    if (prodTableMatch) {
      const rankRegex = /#\d+\s+in\s+([^(\n]+?)(?:\s*\(|$)/gi;
      let rMatch;
      while ((rMatch = rankRegex.exec(prodTableMatch[1].replace(/<[^>]*>/g, ''))) !== null) {
        const category = rMatch[1].trim();
        if (category && !categories.includes(category) && !/books/i.test(category)) {
          categories.push(category);
        }
      }
    }
  }

  if (categories.length === 0) {
    const bcMatch = html.match(/id="wayfinding-breadcrumbs_container"([\s\S]*?)<\/div>/i);
    if (bcMatch) {
      const bcHtml = bcMatch[1];
      const linkRegex = /<a[^>]*>\s*([^<]+)\s*<\/a>/gi;
      let lMatch;
      while ((lMatch = linkRegex.exec(bcHtml)) !== null) {
        const cat = decodeHtmlEntities(lMatch[1]);
        if (cat && !categories.includes(cat) && !/books/i.test(cat)) {
          categories.push(cat);
        }
      }
    }
  }

  // Apply cleanTitle, then detect bare parenthetical series names
  title = cleanTitle(title);
  const bareSeries = title.match(/\(\s*([A-Z][^)]{2,40}?)\s*\)\s*$/i);
  if (bareSeries && !series_name) {
    const candidate = bareSeries[1].trim();
    const nonSeries = /^(?:hardcover|paperback|kindle|audiobook|special edition|collectors? edition|gift edition|a novel|book|the book|series)$/i;
    if (!nonSeries.test(candidate) && candidate.length > 3) {
      series_name = candidate;
      title = title.replace(bareSeries[0], '').replace(/[,\s]+$/, '').trim();
    }
  }

  return {
    title,
    author: authors.join(', '),
    cover_url: coverUrl,
    synopsis: synopsis,
    categories: categories,
    source: 'Amazon',
    series_name,
    series_book_number,
    series_total_books
  };
}


function getGoogleCovers(imageLinks) {
  if (!imageLinks) return [];
  const covers = [];
  const order = ['extraLarge', 'large', 'medium', 'small', 'thumbnail'];
  for (const key of order) {
    if (imageLinks[key]) covers.push({ url: imageLinks[key], source: 'Google Books' });
  }
  return covers;
}

function getOpenLibraryCovers(coverI) {
  if (!coverI) return [];
  return [
    { url: `https://covers.openlibrary.org/b/id/${coverI}-L.jpg`, source: 'OpenLibrary' },
    { url: `https://covers.openlibrary.org/b/id/${coverI}-M.jpg`, source: 'OpenLibrary' },
    { url: `https://covers.openlibrary.org/b/id/${coverI}-S.jpg`, source: 'OpenLibrary' }
  ];
}

function getISBNCovers(isbn) {
  return [
    { url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`, source: 'OpenLibrary' },
    { url: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`, source: 'OpenLibrary' },
    { url: `https://covers.openlibrary.org/b/isbn/${isbn}-S.jpg`, source: 'OpenLibrary' }
  ];
}

async function searchGoogleBooks(query, maxResults = 5) {
  try {
    const cfg = loadConfig();
    const apiKey = cfg.googleBooksApiKey || cfg.googleApiKey;
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}${keyParam}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const body = await res.json();
    return (body.items || []).map(item => {
      const v = item.volumeInfo || {};
      const coverUrl = v.imageLinks?.extraLarge || v.imageLinks?.large || v.imageLinks?.thumbnail || '';
      const si = v.seriesInfo?.bookSeriesInfo;
      const gbTitle = cleanTitle(v.title || '');
      return {
        title: gbTitle,
        author: (v.authors || []).join(', '),
        cover_url: coverUrl,
        synopsis: (v.description || '').replace(/<[^>]*>/g, '').trim(),
        categories: v.categories || [],
        source: 'Google Books',
        covers: getGoogleCovers(v.imageLinks),
        series_name: si?.seriesDisplayName || null,
        series_book_number: si?.volumeNumber ? parseInt(si.volumeNumber, 10) : null,
        series_total_books: null
      };
    }).filter(r => r.title);
  } catch { return []; }
}

async function searchOpenLibrary(query, maxResults = 5) {
  try {
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}`;
    const res = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const body = await res.json();
    const docs = (body.docs || []).filter(d => d.title);
    if (docs.length === 0) return [];

    const results = await Promise.all(docs.map(async (doc) => {
      let synopsis = '';
      if (doc.key) {
        try {
          const workRes = await fetch(`https://openlibrary.org${doc.key}.json`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          if (workRes.ok) {
            const work = await workRes.json();
            if (work.description) {
              synopsis = typeof work.description === 'string' ? work.description : work.description.value || '';
            }
          }
        } catch {}
      }
      const coverI = doc.cover_i;
      const seriesFromTitle = extractSeriesFromTitle(doc.title || '');
      const olTitle = cleanTitle(seriesFromTitle.cleanTitle || '');
      return {
        title: olTitle,
        author: (doc.author_name || []).join(', '),
        cover_url: coverI ? `https://covers.openlibrary.org/b/id/${coverI}-L.jpg` : '',
        synopsis,
        categories: (doc.subject || []).slice(0, 5),
        source: 'OpenLibrary',
        covers: getOpenLibraryCovers(coverI),
        series_name: seriesFromTitle.series_name,
        series_book_number: seriesFromTitle.volume_number,
        series_total_books: seriesFromTitle.total_volumes
      };
    }));
    return results;
  } catch { return []; }
}

async function searchBooks(query, maxResults = 5) {
  const google = await searchGoogleBooks(query, maxResults);
  if (google.length > 0) return google;
  return await searchOpenLibrary(query, maxResults);
}

async function searchByISBN(isbn) {
  const google = await searchGoogleBooks(`isbn:${isbn}`, 1);
  if (google.length > 0) return google[0];

  try {
    const url = `https://openlibrary.org/isbn/${isbn}.json`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();

    let synopsis = '';
    if (data.works?.[0]?.key) {
      try {
        const workRes = await fetch(`https://openlibrary.org${data.works[0].key}.json`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        if (workRes.ok) {
          const work = await workRes.json();
          if (work.description) {
            synopsis = typeof work.description === 'string' ? work.description : work.description.value || '';
          }
        }
      } catch {}
    }

    const seriesFromTitle = extractSeriesFromTitle(data.title || '');
    const isbnTitle = cleanTitle(seriesFromTitle.cleanTitle || '');
    return {
      title: isbnTitle,
      author: '',
      cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      synopsis,
      categories: (data.subjects || []).slice(0, 5),
      source: 'OpenLibrary',
      covers: getISBNCovers(isbn),
      series_name: seriesFromTitle.series_name,
      series_book_number: seriesFromTitle.volume_number,
      series_total_books: seriesFromTitle.total_volumes
    };
  } catch { return null; }
}

function resolveGenres(categories) {
  const genre_ids = [];
  const newGenres = [];
  for (const name of categories) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const existing = db.prepare('SELECT * FROM genres WHERE LOWER(name) = LOWER(?)').get(trimmed);
    if (existing) {
      genre_ids.push(existing.id);
    } else {
      const info = db.prepare('INSERT INTO genres (name) VALUES (?)').run(trimmed);
      const g = { id: info.lastInsertRowid, name: trimmed };
      genre_ids.push(g.id);
      newGenres.push(g);
    }
  }
  return { genre_ids, new_genres: newGenres };
}

export async function POST({ request }) {
  const body = await request.json();

  if (body.action === 'search-by-name' && body.name?.trim()) {
    const results = await searchBooks(body.name.trim());
    return json({ results });
  }

  const { url } = body;
  if (!url) return json({ error: 'URL is required' }, { status: 400 });

  try { new URL(url); } catch {
    return json({ error: 'Invalid URL' }, { status: 400 });
  }

  const isbnMatch = url.match(/(?:isbn|ISBN)[=/:]?\s*(\d{10,13})/) || url.match(/amazon\.\w+.*?\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  const openLibMatch = url.match(/openlibrary\.org\/(?:books|works)\/([^\s/?#]+)/);
  const goodReadsMatch = url.match(/goodreads\.com\/book\/show\/(\d+)/);
  const amazonMatch = url.match(/amazon\.\w+/i) || url.match(/amzn\.\w+/i);

  try {
    if (amazonMatch) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const html = await res.text();
          if (!html.includes('validateCaptcha')) {
            const result = parseAmazonHTML(html);
            if (result && result.title) {
              // Secondary lookup via Google Books for accurate genres
              try {
                const q = `${result.title} ${result.author}`;
                const gbResults = await searchGoogleBooks(q.trim(), 1);
                if (gbResults.length > 0) {
                  const gbCats = gbResults[0].categories || [];
                  if (gbCats.length > 0) {
                    result.categories = gbCats.slice(0, 3);
                  }
                  if (!result.cover_url) result.cover_url = gbResults[0].cover_url;
                }
              } catch {}
              return json({ ...result, ...resolveGenres(result.categories || []) });
            }
          }
        }
      } catch (err) {
        console.error('Amazon direct scrape failed, falling back:', err);
      }
    }

    if (isbnMatch) {
      const result = await searchByISBN(isbnMatch[1]);
      if (result) {
        return json({ ...result, ...resolveGenres(result.categories || []) });
      }
    }

    if (openLibMatch || goodReadsMatch) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const html = await res.text();
        const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || '';
        if (title) {
          const results = await searchBooks(title.replace(/[|].*$/, '').trim());
          if (results.length > 0) {
            return json({ ...results[0], ...resolveGenres(results[0].categories || []) });
          }
        }
      }
    }

    const results = await searchBooks(decodeURIComponent(new URL(url).pathname.replace(/[/]/g, ' ')));
    if (results.length > 0) {
      return json({ ...results[0], ...resolveGenres(results[0].categories || []) });
    }

    return json({ error: 'Could not find book details from this URL' }, { status: 404 });
  } catch (err) {
    return json({ error: err.message || 'Failed to fetch book details' }, { status: 502 });
  }
}
