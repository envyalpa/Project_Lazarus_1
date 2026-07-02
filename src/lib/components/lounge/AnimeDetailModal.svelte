<script>
  import { ArrowLeft, X, RefreshCw, Film, Trash2, Save, Search, Plus, Layers, Pencil } from '@lucide/svelte';
  import { slide } from 'svelte/transition';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import AnimeDetailForm from '$lib/components/lounge/AnimeDetailForm.svelte';
  import AnimeSeasonsPanel from '$lib/components/lounge/AnimeSeasonsPanel.svelte';
  import AnimeUrlScraper from '$lib/components/lounge/AnimeUrlScraper.svelte';
  import SeasonForm from '$lib/components/lounge/SeasonForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  let { anime: initialAnime, genres = [], onclose } = $props();
  let anime = $state(initialAnime);
  let animeId = $derived(anime?.id);
  let seasons = $state([]);
  let seasonsLoading = $state(true);
  let localGenres = $state(genres);
  let showSeasonModal = $state(false);
  let editSeason = $state(null);
  let deleteItem = $state(null);
  let mode = $derived(anime ? 'edit' : 'create');
  
  let syncOpen = $state(false);
  let syncSeasons = $state([]);
  let syncLoading = $state(false);
  
  let saveFn = $state(null);
  let formDirty = $state(false);
  let scrapedData = $state(null);
  let scrapedSeasons = $state([]);
  let manualSeasons = $state([]);

  let searchResults = $state([]);
  let searchLoading = $state(false);
  let searchError = $state('');
  let rightColView = $derived(searchResults.length > 0 || searchLoading ? 'results' : 'seasons');

  function handleSearchLoading(v) { searchLoading = v; searchResults = []; searchError = ''; }
  function handleSearchResults(r) { searchResults = r; searchLoading = false; }
  function handleSearchError(e) { searchError = e; searchLoading = false; }

  async function handleSelectSearchResult(r) {
    searchLoading = true;
    searchError = '';
    try {
      const res = await fetch('/api/scrape/anime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-result',
          title: r.title, synopsis: r.synopsis, cover_url: r.cover_url, genres: r.genres
        })
      });
      if (!res.ok) throw new Error('Resolve failed');
      const data = await res.json();
      handleScraped(data);
      searchResults = [];
    } catch (e) {
      searchError = e.message;
    } finally { searchLoading = false; }
  }

  function handleCreateSeasonSave(data) {
    if (editSeason?._tempId) {
      manualSeasons = manualSeasons.map(s => s._tempId === editSeason._tempId ? { ...s, ...data } : s);
    } else {
      manualSeasons = [...manualSeasons, { ...data, _tempId: Date.now() }];
    }
    showSeasonModal = false;
    editSeason = null;
  }

  function handleScraped(data) {
    scrapedData = { ...data };
    scrapedSeasons = (data.seasons || []).map(s => ({ ...s, checked: true }));
    searchResults = [];
  }

  $effect(() => {
    if (animeId) {
      seasonsLoading = true;
      loadSeasons();
    }
  });

  async function loadSeasons() {
    seasonsLoading = true;
    const res = await fetch(`/lounge/anime/${animeId}/seasons`);
    if (res.ok) seasons = await res.json();
    seasonsLoading = false;
  }

  async function handleDeleteAnime() {
    const title = anime?.title;
    await fetch(`/lounge/anime/${animeId}`, { method: 'DELETE' });
    deleteItem = null; onclose?.();
    notify("Commander, anime deleted: " + (title || ''));
  }

  async function handleSaveSeason(data) {
    if (editSeason) {
      await fetch(`/lounge/anime/${animeId}/seasons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: editSeason.id, ...data }) });
      notify("Commander, season updated for " + (anime?.title || ''));
    } else {
      await fetch(`/lounge/anime/${animeId}/seasons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...data }) });
      notify("Commander, season added to " + (anime?.title || ''));
    }
    await loadSeasons(); showSeasonModal = false; editSeason = null;
  }

  async function handleIncrement(id) {
    await fetch(`/lounge/anime/${animeId}/seasons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'increment', id }) });
    await loadSeasons();
  }

  async function handleDecrement(id) {
    await fetch(`/lounge/anime/${animeId}/seasons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decrement', id }) });
    await loadSeasons();
  }

  async function handleDeleteSeason(season) {
    await fetch(`/lounge/anime/${animeId}/seasons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: season.id }) });
    notify("Commander, season removed from " + (anime?.title || ''));
    await loadSeasons();
  }

  async function handleSyncSeasons() {
    const title = anime?.title;
    if (!title) return;
    syncLoading = true;
    syncOpen = true;
    try {
      const res = await fetch('/api/scrape/anime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-seasons', title })
      });
      if (res.ok) {
        const data = await res.json();
        syncSeasons = (data.seasons || []).map(s => ({ ...s, checked: true }));
      } else {
        syncSeasons = [];
      }
    } catch {
      syncSeasons = [];
    }
    syncLoading = false;
  }

  async function handleAcceptSync() {
    const toCreate = syncSeasons.filter(s => s.checked);
    for (const s of toCreate) {
      await fetch(`/lounge/anime/${animeId}/seasons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', season_number: s.season_number, total_episodes: s.total_episodes, episodes_watched: 0 })
      });
    }
    notify("Commander, " + toCreate.length + " seasons synced to " + (anime?.title || ''));
    syncOpen = false;
    syncSeasons = [];
    await loadSeasons();
  }

  function handleFormSaved(savedAnime) {
    anime = savedAnime;
    if (mode === 'create') {
      onclose?.();
    }
  }
</script>

<div class="anime-modal-wrap">
<Modal open={true} full={mode !== 'create'} narrow={mode === 'create'} noHeader={true} noBodyScroll={true} onclose={onclose}>
  <div data-section="anime-detail-modal" class="detail-modal-body">
    {#if mode === 'create' || anime}
      <div class="detail-grid">
        {#snippet overviewHeaderLeft()}
          <button type="button" class="panel-header-btn" onclick={onclose} title="Back">
            <ArrowLeft size={16} /> <span class="back-label">Back</span>
          </button>
        {/snippet}
        {#snippet overviewHeaderRight()}
          {#if mode !== 'create'}
            <button type="button" class="panel-header-btn save-btn" 
              onclick={async () => { 
                if (formDirty && saveFn) await saveFn(); 
              }} 
              disabled={!formDirty} 
              title={formDirty ? 'Save changes' : 'All saved'}
              style="margin-left: 6px;"
            >
              <Save size={16} style={formDirty ? 'color:var(--amber)' : 'color:var(--success)'} />
              <span style="margin-left: 4px; color: {formDirty ? 'var(--amber)' : 'var(--success)'}">Save</span>
            </button>
          {/if}
          {#if mode !== 'create'}
            <button type="button" class="panel-header-btn del-btn" onclick={() => { deleteItem = anime; }} title="Delete">
              <Trash2 size={15} color="var(--danger)" /> <span style="margin-left: 4px; color: var(--danger)">Delete</span>
            </button>
          {/if}
        {/snippet}

        <div class="left-col">
          {#if mode === 'create'}
            <Panel title="Auto-Fetch" icon={Search}>
              <AnimeUrlScraper onscraped={handleScraped}
                renderResultsExternal={true}
                onsearchresults={handleSearchResults}
                onsearchloading={handleSearchLoading}
                onsearcherror={handleSearchError} />
            </Panel>
          {/if}
          <Panel title={mode === 'create' ? 'Add Anime' : 'Edit Anime'} icon={Film} stretch={true} class="form-panel" headerLeft={overviewHeaderLeft} headerRight={overviewHeaderRight}>
            <AnimeDetailForm {anime} genres={localGenres}
              scrapedData={scrapedData}
              scrapedSeasons={scrapedSeasons}
              manualSeasons={manualSeasons}
              ondirty={(d) => { formDirty = d; }}
              onsaveset={(fn) => { saveFn = fn; }}
              onsaved={handleFormSaved}
              oncancel={onclose} />
          </Panel>
          {#if mode === 'create'}
            <button type="button" class="create-save-btn" onclick={async () => { if (saveFn) await saveFn(); }} disabled={!formDirty}>
              <Plus size={20} /> Add Anime
            </button>
          {/if}
          {#if mode === 'edit'}
            <div transition:slide={{ duration: 250 }}>
              <Panel title="Auto-Fetch" icon={Search}>
                <AnimeUrlScraper onscraped={handleScraped} initialUrl={anime?.source_url || ''} />
              </Panel>
            </div>
          {/if}
        </div>

        <div class="right-col">
          {#if mode === 'create'}
            <Panel title={rightColView === 'results' ? 'Search Results' : 'Seasons'}
                   icon={rightColView === 'results' ? Search : Layers} stretch={true}>
              <div class="xray-container">
                <div class="xray-face" class:show={rightColView === 'seasons'}>
                  <div class="xray-scroll">
                    <div class="seasons-inner">
                    <div class="season-scroll">
                      {#if scrapedSeasons.length > 0}
                        {#each scrapedSeasons as season, i}
                          <label class="season-card">
                            <span class="sc-left">
                              <input type="checkbox" bind:checked={season.checked} />
                              <span class="sc-title">Season {season.season_number}</span>
                            </span>
                            <span class="sc-episodes">{season.total_episodes} ep{season.total_episodes !== 1 ? 's' : ''}</span>
                          </label>
                        {/each}
                      {/if}
                      {#if manualSeasons.length > 0}
                        {#each manualSeasons as s}
                          <div class="season-card">
                            <span class="sc-left">
                              <span class="sc-title">Season {s.season_number}</span>
                            </span>
                            <span class="sc-episodes">{s.total_episodes} ep{s.total_episodes !== 1 ? 's' : ''}</span>
                            <div class="season-card-actions">
                              <button type="button" class="sr-btn" onclick={() => { editSeason = s; showSeasonModal = true; }} title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button type="button" class="sr-btn sr-btn-del" onclick={() => { manualSeasons = manualSeasons.filter(x => x._tempId !== s._tempId); }} title="Remove">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        {/each}
                      {/if}
                      {#if scrapedSeasons.length === 0 && manualSeasons.length === 0}
                        <div class="season-empty">No seasons yet. Use Auto-Fetch or add manually.</div>
                      {/if}
                    </div>
                    <button type="button" class="season-add-btn" onclick={() => { editSeason = null; showSeasonModal = true; }}>
                      <Plus size={16} /> Add Season
                    </button>
                    </div>
                  </div>
                </div>
                <div class="xray-face" class:show={rightColView === 'results'}>
                  <div class="xray-scroll">
                    <div class="search-results-panel">
                    {#if searchLoading}
                      <div class="search-status"><span class="search-spinner"></span> Searching...</div>
                    {:else if searchError}
                      <div class="search-status search-error-status">
                        <X size={16} /> {searchError}
                      </div>
                    {:else if searchResults.length > 0}
                      <div class="search-results-grid">
                        {#each searchResults as r (r.cover_url + r.title)}
                          <button type="button" class="search-result-card" onclick={() => handleSelectSearchResult(r)}>
                            <img src={r.cover_url} alt="" class="sr-thumb" />
                            <div class="sr-info">
                              <span class="sr-title">{r.title}</span>
                              <span class="sr-source">{r.source}</span>
                            </div>
                          </button>
                        {/each}
                      </div>
                    {:else}
                      <div class="search-status">Search for an anime above to see results here.</div>
                    {/if}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          {:else}
            {#snippet seasonsHeaderRight()}
              <button type="button" class="panel-header-btn sync-btn" onclick={handleSyncSeasons} title="Sync seasons from AniList">
                <RefreshCw size={16} />
              </button>
              <button type="button" class="panel-header-btn close-btn" onclick={onclose} title="Close">
                <X size={18} />
              </button>
            {/snippet}
            <div class="seasons-panel-wrap">
              <AnimeSeasonsPanel {seasons} stretch={true}
                loading={seasonsLoading}
                headerRight={seasonsHeaderRight}
                onedit={(s) => { editSeason = s; showSeasonModal = true; }} ondelete={handleDeleteSeason}
                onincrement={handleIncrement} ondecrement={handleDecrement}
                onadd={() => { editSeason = null; showSeasonModal = true; }} />
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="loading">Loading anime data...</div>
    {/if}
  </div>
</Modal>

</div>
{#if showSeasonModal}
  <SeasonForm season={editSeason} onsave={mode === 'create' ? handleCreateSeasonSave : handleSaveSeason} oncancel={() => { showSeasonModal = false; editSeason = null; }} />
{/if}
{#if syncOpen}
  <Modal open={true} title="Sync Seasons from AniList" onclose={() => { syncOpen = false; syncSeasons = []; }}>
    <div data-section="sync-seasons-modal" class="sync-modal-body">
      {#if syncLoading}
        <div class="sync-status">Looking up seasons on AniList...</div>
      {:else if syncSeasons.length === 0}
        <div class="sync-status">No seasons found for this title.</div>
      {:else}
        <p class="sync-info">Detected seasons for <strong>{anime?.title}</strong>:</p>
        <div class="sync-season-list">
          {#each syncSeasons as season, i}
            <label class="sync-season-item">
              <input type="checkbox" bind:checked={season.checked} />
              <span>Season {season.season_number} — {season.total_episodes} ep{season.total_episodes !== 1 ? 's' : ''}</span>
            </label>
          {/each}
        </div>
      {/if}
    </div>
    <div class="sync-actions">
      <button type="button" class="btn btn-ghost" onclick={() => { syncOpen = false; syncSeasons = []; }}>Cancel</button>
      {#if !syncLoading && syncSeasons.length > 0}
        <button type="button" class="btn btn-primary" onclick={handleAcceptSync} disabled={syncSeasons.filter(s => s.checked).length === 0}>
          Accept Selected ({syncSeasons.filter(s => s.checked).length})
        </button>
      {/if}
    </div>
  </Modal>
{/if}
{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    <DeleteConfirm title="Delete Anime" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={handleDeleteAnime} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

<style>
  .detail-modal-body { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1; }
  .detail-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 10px; flex: 1; min-height: 0; }
  .detail-grid.single-col { grid-template-columns: 1fr; }
  .left-col { display: flex; flex-direction: column; gap: 10px; min-height: 0; min-width: 0; }
  .left-col > :global(.panel.stretch) { flex: 1; min-height: 0; }
  .right-col { display: flex; flex-direction: column; gap: 10px; min-height: 0; min-width: 0; }
  .right-col > :global(.panel.stretch) { flex: 1; min-height: 0; }
  .seasons-panel-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .seasons-panel-wrap :global(div[data-section="seasons-panel"]) { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  :global(.form-panel) { flex: 1; min-height: 0; }
  :global(.modal:has(.detail-modal-body) .modal-body) { padding: 10px; }
  .panel-header-btn {
    display: flex; align-items: center; gap: 4px;
    background: none; border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text-dim); cursor: pointer; padding: 0 8px;
    height: 30px; box-sizing: border-box;
    font-family: var(--font-body); font-size: var(--fs-body);
    transition: all 0.15s;
  }
  .panel-header-btn:hover { border-color: var(--cyan-dim); color: var(--text); }
  .panel-header-btn.sync-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .panel-header-btn.close-btn:hover { border-color: var(--danger); color: var(--danger); }
  .panel-header-btn.save-btn { border-color: var(--cyan-dim); color: var(--cyan); }
  .panel-header-btn.save-btn:hover:not(:disabled) { border-color: var(--cyan); background: rgba(0, 212, 255, 0.1); }
  .panel-header-btn.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .panel-header-btn.del-btn:hover { border-color: var(--danger); color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .panel-header-btn.del-btn:active { transform: scale(0.95); }
  .back-label { display: none; }
  @media (min-width: 600px) { .back-label { display: inline; } }
  .loading { display: flex; align-items: center; justify-content: center; padding: 60px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }

  .sync-status { text-align: center; padding: 30px 0; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .sync-info { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0 0 12px; }
  .sync-info strong { color: var(--cyan); }
  .sync-season-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .sync-season-item {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius);
    cursor: pointer; font-family: var(--font-body);
    font-size: var(--fs-body); color: var(--text);
    transition: border-color 0.15s; user-select: none;
  }
  .sync-season-item:hover { border-color: var(--cyan); }
  .sync-season-item input[type="checkbox"] { accent-color: var(--cyan); }
  .sync-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border); }
  .btn {
    padding: 8px 20px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600;
    cursor: pointer; border: 1px solid transparent; transition: all 0.2s;
  }
  .btn-ghost { background: none; border-color: var(--border); color: var(--text-dim); }
  .btn-ghost:hover { border-color: var(--text-dim); color: var(--text); }
  .btn-primary { background: var(--cyan); color: #000; border-color: var(--cyan); }
  .btn-primary:hover { background: linear-gradient(135deg, var(--cyan), #007bff); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  
  .anime-modal-wrap {
    --modal-full-width: 80vw;
    --modal-full-height: 80vh;
    --modal-narrow-width: 80vw;
    --modal-narrow-height: 80vh;
  }

  .seasons-inner { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .season-scroll { flex: 1; overflow-y: auto; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
  .season-card {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--bg-card);
    cursor: default;
    font-family: var(--font-body); font-size: var(--fs-body); color: var(--text);
  }
  .season-card input[type="checkbox"] { accent-color: var(--cyan); }
  .sc-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  .sc-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sc-episodes { flex-shrink: 0; color: var(--text-dim); }
  .season-card-actions { display: flex; gap: 2px; flex-shrink: 0; }
  .season-card-actions .sr-btn {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; background: none; border: none;
    color: var(--text-dim); cursor: pointer; border-radius: 3px;
    transition: all 0.15s;
  }
  .season-card-actions .sr-btn:hover { color: var(--cyan); background: rgba(0,212,255,0.08); }
  .season-card-actions .sr-btn-del:hover { color: var(--danger); background: rgba(239,68,68,0.08); }
  .season-empty {
    text-align: center; padding: 20px 0;
    font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted);
  }
  .season-add-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px; border: 1px dashed var(--border); border-radius: var(--radius);
    background: none; color: var(--cyan);
    font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer;
    transition: all 0.2s; width: 100%; box-sizing: border-box;
    flex-shrink: 0;
  }
  .season-add-btn:hover { border-color: var(--cyan-dim); background: rgba(0,212,255,0.04); }

  .xray-container { position: relative; flex: 1; min-height: 0; overflow: hidden; }
  .xray-face {
    position: absolute; inset: 0; overflow: hidden;
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .xray-face.show { opacity: 1; pointer-events: auto; }
  .xray-scroll { position: absolute; inset: 0; overflow: auto; -webkit-overflow-scrolling: touch; }

  .search-results-panel { display: flex; flex-direction: column; min-height: 0; }
  .search-results-grid { display: flex; flex-direction: column; gap: 6px; }
  .search-result-card {
    display: flex; gap: 10px; align-items: center; width: 100%;
    padding: 8px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--bg-card); cursor: pointer; transition: border-color 0.15s;
    text-align: left; font-family: inherit; color: inherit; box-sizing: border-box;
  }
  .search-result-card:hover { border-color: var(--cyan); }
  .sr-thumb { width: 40px; height: 56px; object-fit: cover; border-radius: 3px; flex-shrink: 0; }
  .sr-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sr-title { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sr-source { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-muted); }
  .search-status {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 30px 0; font-family: var(--font-body); font-size: var(--fs-body);
    color: var(--text-dim); text-align: center;
  }
  .search-error-status { color: var(--danger); }
  .search-spinner {
    width: 16px; height: 16px; border: 2px solid var(--border);
    border-top-color: var(--cyan); border-radius: 50%;
    animation: spin 0.6s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .create-save-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 14px;
    background: var(--cyan); border: none; border-radius: var(--radius);
    color: #000; font-family: var(--font-body); font-size: var(--fs-body);
    font-weight: 700; cursor: pointer; transition: all 0.2s;
    flex-shrink: 0;
  }
  .create-save-btn:hover:not(:disabled) { filter: brightness(1.2); }
  .create-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
