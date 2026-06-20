<script>
  import StarRating from './StarRating.svelte';
  import GenreCombobox from './GenreCombobox.svelte';
  import { notify } from '$lib/stores/notification.js';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { anime = null, genres = [], scrapedData = null, onsaveset, onsaved, oncancel } = $props();

  let editTitle = $state('');
  let editSynopsis = $state('');
  let editCoverUrl = $state('');
  let editStatus = $state('not_started');
  let editRating = $state(null);
  let editNotes = $state('');
  let editGenreIds = $state([]);
  let localGenres = $state([...genres]);

  // Scraped covers & seasons
  let covers = $state([]);
  let coverIndex = $state(0);
  let coverError = $state(false);
  let scrapedSeasons = $state([]);

  // Initialize fields on mount or when anime changes
  $effect(() => {
    editTitle = anime?.title || '';
    editSynopsis = anime?.synopsis || '';
    editCoverUrl = anime?.cover_url || '';
    editStatus = anime?.status || 'not_started';
    editRating = anime?.rating || null;
    editNotes = anime?.notes || '';
    editGenreIds = anime?.genres?.map(g => g.id) || [];
    localGenres = [...genres];
    covers = [];
    coverIndex = 0;
    coverError = false;
    scrapedSeasons = [];
  });

  // Listen for scraped data updates
  $effect(() => {
    if (scrapedData) {
      if (scrapedData.title) editTitle = scrapedData.title;
      if (scrapedData.synopsis) editSynopsis = scrapedData.synopsis;
      if (scrapedData.cover_url) { editCoverUrl = scrapedData.cover_url; coverError = false; }
      if (scrapedData.genre_ids?.length) {
        if (scrapedData.new_genres?.length) {
          localGenres = [...localGenres, ...scrapedData.new_genres];
        }
        editGenreIds = [...new Set([...editGenreIds, ...scrapedData.genre_ids])];
      }
      covers = scrapedData.covers || [];
      coverIndex = 0;
      scrapedSeasons = (scrapedData.seasons || []).map(s => ({ ...s, checked: true }));
    }
  });

  async function handleCreateGenre(name) {
    const res = await fetch('/api/genres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) {
      const g = await res.json();
      localGenres = [...localGenres, g];
      editGenreIds = [...editGenreIds, g.id];
    }
  }

  function setCover(i) {
    if (i < 0) i = covers.length - 1;
    if (i >= covers.length) i = 0;
    coverIndex = i;
    editCoverUrl = covers[i].url;
    coverError = false;
  }
  async function handleSave() {
    if (!editTitle.trim()) {
      notify("Title cannot be empty.");
      return;
    }
    const payload = {
      title: editTitle,
      synopsis: editSynopsis,
      cover_url: editCoverUrl,
      status: editStatus,
      rating: editRating,
      notes: editNotes,
      genre_ids: editGenreIds
    };
    if (anime) {
      const res = await fetch(`/lounge/anime/${anime.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        onsaved?.(updated);
        notify("Commander, anime updated: " + updated.title);
      } else {
        notify("Error: Failed to save changes.");
      }
    } else {
      if (scrapedSeasons.length > 0) {
        payload.seasons = scrapedSeasons.filter(s => s.checked).map(s => ({
          season_number: s.season_number,
          total_episodes: s.total_episodes
        }));
      }
      const res = await fetch('/lounge/anime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        onsaved?.(created);
        notify("Commander, anime created: " + created.title);
      } else {
        notify("Error: Failed to create anime.");
      }
    }
  }

  $effect(() => {
    onsaveset?.(handleSave);
  });
</script>

<div class="edit-form-grid" data-section="anime-detail-form">
  <!-- Row 1: Cover Preview (Left) and Title/Synopsis (Right) -->
  <div data-section="edit-cover" class="edit-cover-wrap grid-cover-preview">
    {#if editCoverUrl && !coverError}
      <img src={editCoverUrl} alt="Cover" class="edit-cover-img" onerror={() => { coverError = true; }} />
    {:else}
      <div class="edit-cover-placeholder">+ Add Cover</div>
    {/if}
    {#if covers.length > 1}
      <div class="cover-nav">
        <button type="button" class="nav-btn" onclick={() => setCover(coverIndex - 1)}>
          <ChevronLeft size={14} />
        </button>
        <span class="nav-counter">{coverIndex + 1}/{covers.length}</span>
        <button type="button" class="nav-btn" onclick={() => setCover(coverIndex + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
    {/if}
  </div>

  <div class="grid-title-synopsis">
    <label class="efield">
      <span class="efield-label">Title</span>
      <input type="text" bind:value={editTitle} class="efield-input" placeholder="Anime title" />
    </label>
    <label class="efield synopsis-field">
      <span class="efield-label">Synopsis</span>
      <textarea bind:value={editSynopsis} class="efield-input etextarea" placeholder="Anime synopsis..."></textarea>
    </label>
  </div>

  <!-- Row 2: Cover URL (Left) and Genres (Right) -->
  <label class="efield grid-cover-url">
    <span class="efield-label">Cover URL</span>
    <input type="text" bind:value={editCoverUrl} class="efield-input" placeholder="https://..." oninput={() => { coverError = false; }} />
  </label>

  <div class="grid-genres">
    <label class="efield">
      <span class="efield-label">Genres</span>
      <GenreCombobox genres={localGenres} value={editGenreIds} onchange={(v) => { editGenreIds = v; }} oncreate={handleCreateGenre} />
    </label>
  </div>

  <!-- Row 3: Status (Left) and Notes (Right, spans Rows 3-4) -->
  <label class="efield grid-status">
    <span class="efield-label">Status</span>
    <select bind:value={editStatus} class="efield-input">
      <option value="not_started" style="color:var(--text-dim)">Not Started</option>
      <option value="watching" style="color:var(--cyan)">Watching</option>
      <option value="next-season" style="color:var(--amber)">Next Season</option>
      <option value="completed" style="color:var(--success)">Completed</option>
    </select>
  </label>

  <label class="efield grid-notes">
    <span class="efield-label">Notes</span>
    <textarea bind:value={editNotes} class="efield-input etextarea" placeholder="My notes..."></textarea>
  </label>

  <!-- Row 4: Rating (Left) and Notes (Right, spans Rows 3-4) -->
  <div class="efield grid-rating">
    <span class="efield-label">Rating</span>
    <StarRating value={editRating} onchange={(v) => { editRating = v; }} />
  </div>

  <!-- Row 5: Seasons Preview (Right, if adding anime) -->
  <div class="grid-seasons-preview">
    {#if !anime && scrapedSeasons.length > 0}
      <div data-section="seasons-preview" class="seasons-box">
        <span class="efield-label">Detected Seasons</span>
        <div class="season-list">
          {#each scrapedSeasons as season, i}
            <label class="season-item">
              <input type="checkbox" bind:checked={season.checked} />
              <span>Season {season.season_number} ({season.total_episodes} ep{season.total_episodes !== 1 ? 's' : ''})</span>
            </label>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .edit-form-grid {
    display: grid;
    grid-template-columns: 1.2fr 2fr;
    gap: 10px;
    align-items: start;
    min-height: 0;
    flex: 1;
  }
  .grid-cover-preview {
    grid-column: 1;
    grid-row: 1;
    height: 100%;
  }
  .grid-title-synopsis {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  }
  .grid-cover-url {
    grid-column: 1;
    grid-row: 2;
  }
  .grid-genres {
    grid-column: 2;
    grid-row: 2;
  }
  .grid-status {
    grid-column: 1;
    grid-row: 3;
  }
  .grid-notes {
    grid-column: 2;
    grid-row: 3 / span 2;
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: 100%;
    min-height: 0;
  }
  .grid-notes .etextarea {
    flex: 1;
    min-height: 100px;
    resize: vertical;
  }
  .grid-rating {
    grid-column: 1;
    grid-row: 4;
  }
  .grid-seasons-preview {
    grid-column: 2;
    grid-row: 5;
  }
  .edit-cover-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    margin: 0 auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-card);
    display: flex;
    flex-direction: column;
  }
  .edit-cover-img { width: 100%; height: 100%; object-fit: cover; }
  .edit-cover-placeholder {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; border: 2px dashed var(--border); border-radius: var(--radius);
    color: var(--text-muted); font-family: var(--font-body); font-size: var(--fs-body);
  }
  .cover-nav {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 8px; padding: 6px;
    background: rgba(5, 8, 20, 0.75);
    backdrop-filter: blur(4px);
  }
  .nav-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: none; color: var(--text-dim);
    cursor: pointer; transition: all 0.15s;
  }
  .nav-btn:hover {
    border-color: var(--cyan); color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }
  .nav-btn:active { transform: scale(0.92); }
  .nav-counter {
    font-family: var(--font-heading-1); font-size: var(--fs-body);
    color: var(--text); min-width: 32px; text-align: center;
  }
  .efield { display: flex; flex-direction: column; gap: 4px; }
  .efield-label {
    font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 600;
    color: var(--amber); text-transform: uppercase; letter-spacing: 1px;
  }
  .efield-input {
    padding: 8px 10px; background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-family: var(--font-body);
    font-size: var(--fs-body); outline: none; transition: border-color 0.2s;
  }
  .efield-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15); }
  .etextarea { resize: vertical; min-height: 60px; }
  .synopsis-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }
  .synopsis-field .etextarea {
    flex: 1;
    min-height: 120px;
    resize: vertical;
  }
  .seasons-box { display: flex; flex-direction: column; gap: 8px; }
  .season-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .season-item {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius);
    cursor: pointer; font-family: var(--font-body);
    font-size: var(--fs-body); color: var(--text);
    transition: border-color 0.15s; user-select: none;
  }
  .season-item:hover { border-color: var(--cyan); }
  .season-item input[type="checkbox"] { accent-color: var(--cyan); }
  .edit-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .efield-btn {
    padding: 8px 20px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600;
    cursor: pointer; border: 1px solid transparent; transition: all 0.2s;
  }
  .efield-btn.ghost { background: none; border-color: var(--border); color: var(--text-dim); }
  .efield-btn.ghost:hover { border-color: var(--text-dim); color: var(--text); }
  .efield-btn.primary { background: var(--cyan); color: #000; border-color: var(--cyan); }
  .efield-btn.primary:hover { background: linear-gradient(135deg, var(--cyan), #007bff); }
  .efield-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

