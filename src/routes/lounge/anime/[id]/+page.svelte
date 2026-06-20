<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Pencil, Trash2, RefreshCw, Film, Layers } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import StarRating from '$lib/components/lounge/StarRating.svelte';
  import AnimeDetailForm from '$lib/components/lounge/AnimeDetailForm.svelte';
  import SeasonForm from '$lib/components/lounge/SeasonForm.svelte';
  import AnimeSeasonsPanel from '$lib/components/lounge/AnimeSeasonsPanel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let anime = $state(data.anime);
  let seasons = $state(data.seasons);
  let genres = $state(data.genres);

  let showEditModal = $state(false);
  let showSeasonModal = $state(false);
  let editSeason = $state(null);
  let deleteItem = $state(null);
  let syncOpen = $state(false);
  let syncSeasons = $state([]);
  let syncLoading = $state(false);

  async function reloadAnime() {
    const res = await fetch(`/lounge/anime/${anime.id}`);
    if (res.ok) anime = await res.json();
    const res2 = await fetch(`/lounge/anime/${anime.id}/seasons`);
    if (res2.ok) seasons = await res2.json();
  }

  async function updateCover() {
    const url = prompt('Cover image URL:', anime.cover_url || '');
    if (url === null) return;
    await fetch(`/lounge/anime/${anime.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_url: url })
    });
    anime.cover_url = url;
  }

  async function updateStatus(e) {
    const status = e.target.value;
    await fetch(`/lounge/anime/${anime.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    anime.status = status;
  }

  async function updateRating(v) {
    await fetch(`/lounge/anime/${anime.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: v })
    });
    anime.rating = v;
  }

  async function updateNotes(e) {
    const notes = e.target.value;
    await fetch(`/lounge/anime/${anime.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    anime.notes = notes;
  }

  async function handleDeleteAnime() {
    const title = anime.title;
    await fetch(`/lounge/anime/${anime.id}`, { method: 'DELETE' });
    notify("Commander, anime deleted: " + title);
    goto('/lounge/anime');
  }

  async function handleSaveSeason(data) {
    if (editSeason) {
      await fetch(`/lounge/anime/${anime.id}/seasons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editSeason.id, ...data })
      });
      notify("Commander, season updated for " + anime.title);
    } else {
      await fetch(`/lounge/anime/${anime.id}/seasons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...data })
      });
      notify("Commander, season added to " + anime.title);
    }
    await reloadAnime();
    showSeasonModal = false;
    editSeason = null;
  }

  async function handleIncrement(id) {
    await fetch(`/lounge/anime/${anime.id}/seasons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'increment', id })
    });
    await reloadAnime();
  }

  async function handleDecrement(id) {
    await fetch(`/lounge/anime/${anime.id}/seasons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decrement', id })
    });
    await reloadAnime();
  }

  async function handleDeleteSeason(season) {
    await fetch(`/lounge/anime/${anime.id}/seasons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: season.id })
    });
    notify("Commander, season removed from " + anime.title);
    await reloadAnime();
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
      await fetch(`/lounge/anime/${anime.id}/seasons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', season_number: s.season_number, total_episodes: s.total_episodes, episodes_watched: 0 })
      });
    }
    notify("Commander, " + toCreate.length + " seasons synced to " + anime.title);
    syncOpen = false;
    syncSeasons = [];
    await reloadAnime();
  }
</script>

<div data-section="anime-detail">
  <a href="/lounge/anime" class="back-link">
    <ArrowLeft size={16} /> Back to Anime
  </a>

  <div class="detail-grid">
    <Panel title="Overview" icon={Film}>
      <div class="overview-grid">
        <div class="cover-col">
          <div data-label="anime-cover" class="cover-wrap" onclick={updateCover} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') updateCover(); }}>
            {#if anime.cover_url}
              <img src={anime.cover_url} alt={anime.title} class="cover-img" />
            {:else}
              <div class="cover-placeholder">
                <span>+ Add Cover</span>
              </div>
            {/if}
          </div>

          <label class="field">
            <span class="field-label">Status</span>
            <select value={anime.status} onchange={updateStatus} class="field-select">
              <option value="not_started">Not Started</option>
              <option value="watching">Watching</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <div class="field">
            <span class="field-label">Rating</span>
            <StarRating value={anime.rating} onchange={updateRating} />
          </div>
        </div>

        <div class="info-section">
          <h1 class="anime-title">{anime.title}</h1>

          {#if anime.synopsis}
            <p class="synopsis">{anime.synopsis}</p>
          {/if}

          <div class="field">
            <span class="field-label">Genres</span>
            <div class="genre-list">
              {#if anime.genres?.length}
                {#each anime.genres as g (g.id)}
                  <span class="genre-badge">{g.name}</span>
                {/each}
              {:else}
                <span class="no-data">No genres</span>
              {/if}
            </div>
          </div>

          <label class="field">
            <span class="field-label">Notes</span>
            <textarea class="notes-input" onchange={updateNotes} rows="4">{anime.notes}</textarea>
          </label>

          <div class="detail-actions">
            <button type="button" class="detail-btn edit" onclick={() => { showEditModal = true; }}>
              <Pencil size={16} /> Edit
            </button>
            <button type="button" class="detail-btn delete" onclick={() => { deleteItem = anime; }}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>
    </Panel>

    {#snippet seasonsHeaderRight()}
      <button type="button" class="panel-header-btn sync-btn" onclick={handleSyncSeasons} title="Sync seasons from AniList">
        <RefreshCw size={16} />
      </button>
    {/snippet}
    <AnimeSeasonsPanel
      {seasons}
      headerRight={seasonsHeaderRight}
      onedit={(s) => { editSeason = s; showSeasonModal = true; }}
      ondelete={handleDeleteSeason}
      onincrement={handleIncrement}
      ondecrement={handleDecrement}
      onadd={() => { editSeason = null; showSeasonModal = true; }}
    />
  </div>
</div>

{#if showEditModal}
  <Modal title="Edit Anime" open={true} onclose={() => { showEditModal = false; }}>
    <div style="padding: 20px;">
      <AnimeDetailForm
        anime={anime}
        genres={genres}
        onsaved={(a) => { anime = a; showEditModal = false; reloadAnime(); }}
        oncancel={() => { showEditModal = false; }}
      />
    </div>
  </Modal>
{/if}

{#if showSeasonModal}
  <SeasonForm season={editSeason} onsave={handleSaveSeason} oncancel={() => { showSeasonModal = false; editSeason = null; }} />
{/if}
{#if syncOpen}
  <Modal open={true} title="Sync Seasons from AniList" onclose={() => { syncOpen = false; syncSeasons = []; }}>
    <div data-section="sync-seasons-modal">
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
  div[data-section="anime-detail"] {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-dim);
    text-decoration: none;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    transition: color 0.2s;
  }

  .back-link:hover { color: var(--cyan); }

  .detail-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    align-items: start;
    gap: 16px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: 1fr 1.8fr;
    gap: 20px;
  }

  .cover-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cover-wrap {
    width: 100%;
    aspect-ratio: 2/3;
    max-height: 500px;
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--bg-card);
    transition: border-color 0.2s;
  }

  .cover-wrap:hover { border-color: var(--cyan-dim); }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .anime-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .synopsis {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }

  .field { display: flex; flex-direction: column; gap: 4px; }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .field-select {
    padding: 8px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    outline: none;
    cursor: pointer;
  }

  .field-select:focus { border-color: var(--cyan); }

  .genre-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .genre-badge {
    padding: 2px 10px;
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    background: rgba(0, 212, 255, 0.08);
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
  }

  .no-data { color: var(--text-muted); font-family: var(--font-body); font-size: var(--fs-body); }

  .notes-input {
    padding: 10px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    outline: none;
    resize: vertical;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .notes-input:focus { border-color: var(--cyan); }

  .detail-actions { display: flex; gap: 8px; }

  .detail-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--border);
    background: none;
    color: var(--text-dim);
    transition: all 0.15s;
  }

  .detail-btn.edit:hover { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .detail-btn.edit:active { transform: scale(0.95); background: rgba(0, 212, 255, 0.15); }
  .detail-btn.delete:hover { color: var(--danger); border-color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .detail-btn.delete:active { transform: scale(0.95); background: rgba(239, 68, 68, 0.15); }

  .panel-header-btn {
    display: flex; align-items: center; gap: 4px;
    background: none; border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text-dim); cursor: pointer; padding: 4px 8px;
    font-family: var(--font-body); font-size: var(--fs-body);
    transition: all 0.15s;
  }
  .panel-header-btn:hover { border-color: var(--cyan-dim); color: var(--text); }
  .panel-header-btn.sync-btn:hover { border-color: var(--cyan); color: var(--cyan); }

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
</style>
