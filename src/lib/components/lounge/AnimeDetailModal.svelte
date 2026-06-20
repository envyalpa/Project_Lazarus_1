<script>
  import { ArrowLeft, X, RefreshCw, Film, Pencil, Trash2, Search } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import AnimeDetailOverview from '$lib/components/lounge/AnimeDetailOverview.svelte';
  import AnimeDetailForm from '$lib/components/lounge/AnimeDetailForm.svelte';
  import AnimeSeasonsPanel from '$lib/components/lounge/AnimeSeasonsPanel.svelte';
  import SeasonForm from '$lib/components/lounge/SeasonForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import AnimeUrlScraper from '$lib/components/lounge/AnimeUrlScraper.svelte';

  let { anime: initialAnime, genres = [], startEditing = true, onclose } = $props();
  let anime = $state(initialAnime);
  let animeId = $derived(anime?.id);
  let seasons = $state([]);
  let seasonsLoading = $state(true);
  let localGenres = $state(genres);
  let showSeasonModal = $state(false);
  let editSeason = $state(null);
  let deleteItem = $state(null);
  let mode = $derived(anime ? 'edit' : 'create');
  let editing = $state(startEditing || !initialAnime);
  let syncOpen = $state(false);
  let syncSeasons = $state([]);
  let syncLoading = $state(false);
  let scrapedData = $state(null);
  let saveFn = $state(null);

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

  function updateCover() {
    const url = prompt('Cover image URL:', anime?.cover_url || '');
    if (url === null) return;
    fetch(`/lounge/anime/${animeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cover_url: url }) })
      .then(() => { if (anime) anime.cover_url = url; });
  }

  function updateStatus(e) {
    const status = e.target.value;
    fetch(`/lounge/anime/${animeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      .then(() => { if (anime) anime.status = status; });
  }

  function updateRating(v) {
    fetch(`/lounge/anime/${animeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: v }) })
      .then(() => { if (anime) anime.rating = v; });
  }

  function updateNotes(notes) {
    fetch(`/lounge/anime/${animeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
      .then(() => { if (anime) anime.notes = notes; });
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

  function handleScraped(data) {
    scrapedData = { ...data };
  }

  function handleCancel() {
    if (mode === 'create') {
      onclose?.();
    } else {
      editing = false;
    }
  }

  function handleFormSaved(savedAnime) {
    anime = savedAnime;
    if (mode === 'create') {
      onclose?.();
    } else {
      editing = false;
    }
  }
</script>

<Modal open={true} full={mode !== 'create'} narrow={mode === 'create'} noHeader={true} noBodyScroll={true} onclose={onclose}>
  <div data-section="anime-detail-modal" class="detail-modal-body">
    {#if mode === 'create' || anime}
      <div class="detail-grid" class:single-col={mode === 'create'}>
        {#snippet overviewHeaderLeft()}
          <button type="button" class="panel-header-btn" onclick={onclose} title="Back">
            <ArrowLeft size={16} /> <span class="back-label">Back</span>
          </button>
        {/snippet}
        {#snippet overviewHeaderRight()}
          {#if editing}
            <button type="button" class="panel-header-btn cancel-btn" onclick={handleCancel}>Cancel</button>
            <button type="button" class="panel-header-btn save-btn" onclick={async () => { await saveFn?.(); }} style="margin-left: 6px; color: var(--cyan); border-color: var(--cyan-dim);">
              {mode === 'create' ? 'Add Anime' : 'Save Changes'}
            </button>
          {:else}
            <button type="button" class="panel-header-btn edit-btn" onclick={() => { editing = true; }} title="Edit">
              <Pencil size={15} color="var(--amber)" /> Edit
            </button>
            <button type="button" class="panel-header-btn del-btn" onclick={() => { deleteItem = anime; }} title="Delete">
              <Trash2 size={15} color="var(--danger)" /> Delete
            </button>
          {/if}
        {/snippet}

        <div class="left-col">
          <Panel title={mode === 'create' ? 'Add Anime' : (editing ? 'Edit Anime' : 'Overview')} icon={Film} stretch={true} class="form-panel" headerLeft={overviewHeaderLeft} headerRight={overviewHeaderRight}>
            {#if editing}
              <AnimeDetailForm {anime} genres={localGenres} {scrapedData}
                onsaveset={(fn) => { saveFn = fn; }}
                onsaved={handleFormSaved}
                oncancel={handleCancel} />
            {:else}
              <AnimeDetailOverview {anime} onupdatecover={updateCover} onupdatestatus={updateStatus}
                onupdaterating={updateRating} onupdatenotes={updateNotes}
                onedit={() => { editing = true; }} ondelete={() => { deleteItem = anime; }} />
            {/if}
          </Panel>

          {#if editing}
            <div>
              <Panel title="Auto-Fetch" icon={Search}>
                <AnimeUrlScraper onscraped={handleScraped} />
              </Panel>
            </div>
          {/if}
        </div>

        {#if mode !== 'create'}
          <div class="right-col">
            {#snippet seasonsHeaderRight()}
              <button type="button" class="panel-header-btn sync-btn" onclick={handleSyncSeasons} title="Sync seasons from AniList">
                <RefreshCw size={16} />
              </button>
              <button type="button" class="panel-header-btn close-btn" onclick={onclose} title="Close">
                <X size={18} />
              </button>
            {/snippet}
            <AnimeSeasonsPanel {seasons} stretch={true}
              loading={seasonsLoading}
              headerRight={seasonsHeaderRight}
              onedit={(s) => { editSeason = s; showSeasonModal = true; }} ondelete={handleDeleteSeason}
              onincrement={handleIncrement} ondecrement={handleDecrement}
              onadd={() => { editSeason = null; showSeasonModal = true; }} />
          </div>
        {/if}
      </div>
    {:else}
      <div class="loading">Loading anime data...</div>
    {/if}
  </div>
</Modal>

{#if showSeasonModal}
  <SeasonForm season={editSeason} onsave={handleSaveSeason} oncancel={() => { showSeasonModal = false; editSeason = null; }} />
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
    <DeleteConfirm title="Delete Anime" client={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={handleDeleteAnime} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

<style>
  .detail-modal-body { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1; }
  .detail-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 10px; flex: 1; min-height: 0; }
  .detail-grid.single-col { grid-template-columns: 1fr; }
  .left-col { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
  .right-col { display: flex; flex-direction: column; min-height: 0; }
  :global(.form-panel) { flex: 1; min-height: 0; }
  :global(.modal:has(.detail-modal-body) .modal-body) { padding: 10px; }
  .panel-header-btn {
    display: flex; align-items: center; gap: 4px;
    background: none; border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text-dim); cursor: pointer; padding: 4px 8px;
    height: 30px; box-sizing: border-box;
    font-family: var(--font-body); font-size: var(--fs-body);
    transition: all 0.15s;
  }
  .panel-header-btn:hover { border-color: var(--cyan-dim); color: var(--text); }
  .panel-header-btn.sync-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .panel-header-btn.close-btn:hover { border-color: var(--danger); color: var(--danger); }
  .panel-header-btn.cancel-btn:hover { border-color: var(--amber); color: var(--amber); }
  .panel-header-btn.edit-btn:hover { border-color: var(--amber); color: var(--amber); background: rgba(255, 140, 0, 0.08); }
  .panel-header-btn.edit-btn:active { transform: scale(0.95); }
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
  
  :global(.modal.full:has(.detail-modal-body)) { max-width: 85vw; width: 85vw; height: 85vh; }
</style>
