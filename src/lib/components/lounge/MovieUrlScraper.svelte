<script>
  import { Link, LoaderCircle, Check, AlertCircle } from '@lucide/svelte';
  import MovieNameSearch from './MovieNameSearch.svelte';

  let { onscraped, initialUrl = '', renderResultsExternal = false, onsearchresults, onsearchloading, onsearcherror } = $props();

  let url = $state(initialUrl);
  let loading = $state(false);
  let error = $state('');
  let scraped = $state(false);

  async function handleFetch() {
    if (!url.trim()) return;
    loading = true;
    error = '';
    scraped = false;
    try {
      const res = await fetch('/api/scrape/movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Scrape failed');
      }
      const data = await res.json();
      if (!data.title && !data.cover_url) {
        throw new Error('Could not extract movie details from this URL');
      }
      scraped = true;
      onscraped?.(data);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div data-section="url-scraper" class="scraper-box">
  <div class="url-row">
    <input
      type="url"
      bind:value={url}
      placeholder="Paste a movie URL (TMDB, Letterboxd)..."
      class="field-input url-input"
      disabled={loading}
      onkeydown={(e) => { if (e.key === 'Enter') handleFetch(); }}
    />
    <button type="button" class="fetch-btn" onclick={handleFetch} disabled={loading || !url.trim()}>
      {#if loading}
        <span class="spin"><LoaderCircle size={16} /></span>
        <span>Fetching...</span>
      {:else if scraped}
        <Check size={16} />
        <span>Fetched</span>
      {:else}
        <Link size={16} />
        <span>Fetch</span>
      {/if}
    </button>
  </div>

  {#if error}
    <div class="scraper-error">
      <AlertCircle size={14} />
      <span>{error}</span>
    </div>
  {/if}

  <MovieNameSearch {onscraped} {renderResultsExternal} {onsearchresults} {onsearchloading} {onsearcherror} />
</div>

<style>
  .scraper-box {
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
  }

  .url-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .url-input {
    flex: 1;
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .url-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
  }

  .fetch-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--cyan);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .fetch-btn:hover:not(:disabled) {
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  .fetch-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .scraper-error {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--danger);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }
</style>
