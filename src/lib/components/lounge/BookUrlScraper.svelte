<script>
  import { Link, Search, LoaderCircle, Check, AlertCircle, X } from '@lucide/svelte';

  let { onscraped, initialUrl = '' } = $props();

  let url = $state(initialUrl);
  let loading = $state(false);
  let error = $state('');
  let scraped = $state(false);

  let searchName = $state('');
  let searchLoading = $state(false);
  let searchResults = $state([]);
  let searchError = $state('');
  let showResults = $state(false);

  async function handleFetch() {
    if (!url.trim()) return;
    loading = true; error = ''; scraped = false;
    try {
      const res = await fetch('/api/scrape/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Scrape failed'); }
      const data = await res.json();
      if (!data.title) throw new Error('Could not extract book details from this URL');
      scraped = true;
      onscraped?.(data);
    } catch (e) { error = e.message; }
    finally { loading = false; }
  }

  async function handleSearch() {
    if (!searchName.trim()) return;
    searchLoading = true; searchError = ''; searchResults = []; showResults = false;
    try {
      const res = await fetch('/api/scrape/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search-by-name', name: searchName.trim() })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Search failed'); }
      const data = await res.json();
      searchResults = data.results || [];
      showResults = searchResults.length > 0;
      if (searchResults.length === 0) searchError = 'No results found. Try a different name.';
    } catch (e) { searchError = e.message; }
    finally { searchLoading = false; }
  }

  function handleSelect(r) {
    searchName = r.title;
    showResults = false;
    onscraped?.(r);
  }

  function closeResults() { showResults = false; }
</script>

<div data-section="url-scraper" class="scraper-box">
  <div class="url-row">
    <input type="url" bind:value={url} placeholder="Paste a Google Books / Open Library / Goodreads / Amazon URL..." class="field-input url-input" disabled={loading} onkeydown={(e) => { if (e.key === 'Enter') handleFetch(); }} />
    <button type="button" class="fetch-btn" onclick={handleFetch} disabled={loading || !url.trim()}>
      {#if loading}<span class="spin"><LoaderCircle size={16} /></span><span>Fetching...</span>
      {:else if scraped}<Check size={16} /><span>Fetched</span>
      {:else}<Link size={16} /><span>Fetch</span>{/if}
    </button>
  </div>

  {#if error}
    <div class="scraper-error"><AlertCircle size={14} /><span>{error}</span></div>
  {/if}

  <div class="name-row">
    <input type="text" bind:value={searchName} placeholder="Or search by book name..." class="field-input url-input" disabled={searchLoading} onkeydown={(e) => { if (e.key === 'Enter') handleSearch(); }} onfocus={() => { if (searchResults.length > 0) showResults = true; }} />
    <button type="button" class="fetch-btn" onclick={handleSearch} disabled={searchLoading || !searchName.trim()}>
      {#if searchLoading}<span class="spin"><LoaderCircle size={16} /></span><span>Searching...</span>
      {:else}<Search size={16} /><span>Search</span>{/if}
    </button>
  </div>

  {#if searchError}
    <div class="scraper-error"><X size={14} /><span>{searchError}</span></div>
  {/if}

  {#if showResults && searchResults.length > 0}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="search-results" data-section="search-results" onclick={closeResults}>
      {#each searchResults as r (r.cover_url + r.title)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="result-item" role="button" tabindex="0"
          onclick={(e) => { e.stopPropagation(); handleSelect(r); }}
          onkeydown={(e) => { if (e.key === 'Enter') handleSelect(r); }}>
          <img src={r.cover_url} alt="" class="result-thumb" />
          <div class="result-info">
            <span class="result-title">{r.title}</span>
            {#if r.author}<span class="result-author">{r.author}</span>{/if}
            <span class="result-source">Google Books</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .scraper-box { display: flex; flex-direction: column; gap: 8px; }
  .url-row, .name-row { display: flex; gap: 6px; align-items: center; }
  .url-input { flex: 1; padding: 10px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-family: var(--font-body); font-size: var(--fs-body); outline: none; box-sizing: border-box; transition: border-color 0.2s; }
  .url-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15); }
  .fetch-btn { display: flex; align-items: center; gap: 5px; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--cyan); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; white-space: nowrap; flex-shrink: 0; min-width: 100px; justify-content: center; transition: all 0.2s; }
  .fetch-btn:hover:not(:disabled) { border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .fetch-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .scraper-error { display: flex; align-items: center; gap: 6px; color: var(--danger); font-family: var(--font-body); font-size: var(--fs-body); }
  .search-results { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); max-height: 200px; overflow-y: auto; }
  .result-item { display: flex; align-items: center; gap: 8px; padding: 6px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; background: var(--bg-card); flex: 0 0 calc(50% - 4px); box-sizing: border-box; }
  .result-item:hover { border-color: var(--cyan); background: rgba(0, 212, 255, 0.06); }
  .result-thumb { width: 30px; height: 45px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
  .result-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .result-title { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result-author { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result-source { font-family: var(--font-heading-1); font-size: var(--fs-body); color: var(--cyan-dim); text-transform: uppercase; letter-spacing: 0.5px; }
</style>
