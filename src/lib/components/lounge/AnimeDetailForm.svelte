<script>
  import StarRating from './StarRating.svelte';
  import GenreCombobox from './GenreCombobox.svelte';

  import { notify } from '$lib/stores/notification.js';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  let { anime = null, genres = [], ondirty, onsaveset, onsaved, oncancel, scrapedData = null, scrapedSeasons = [], manualSeasons = [] } = $props();

  let editTitle = $state('');
  let editSynopsis = $state('');
  let editCoverUrl = $state('');
  let editStatus = $state('not_started');
  let editRating = $state(null);
  let editGenreIds = $state([]);
  let localGenres = $state([...genres]);
  let editNotes = $state('');

  let covers = $state([]);
  let coverIndex = $state(0);
  let coverError = $state(false);

  function snapshot() {
    return {
      title: editTitle,
      synopsis: editSynopsis,
      cover_url: editCoverUrl,
      status: editStatus,
      rating: editRating,
      genre_ids: [...editGenreIds],
      notes: editNotes
    };
  }

  function pristineFromProps() {
    return {
      title: anime?.title || '',
      synopsis: anime?.synopsis || '',
      cover_url: anime?.cover_url || '',
      status: anime?.status || 'not_started',
      rating: anime?.rating || null,
      genre_ids: anime?.genres?.map(g => g.id) || [],
      notes: anime?.notes || ''
    };
  }

  let pristine = $state(pristineFromProps());

  let hasChanges = $derived.by(() => {
    const c = snapshot();
    return c.title !== pristine.title ||
           c.synopsis !== pristine.synopsis ||
           c.cover_url !== pristine.cover_url ||
           c.status !== pristine.status ||
           c.rating !== pristine.rating ||
           JSON.stringify(c.genre_ids) !== JSON.stringify(pristine.genre_ids) ||
           c.notes !== pristine.notes;
  });

  let lastDirty = $state(false);
  $effect(() => {
    const dirty = hasChanges;
    if (dirty !== lastDirty) {
      lastDirty = dirty;
      ondirty?.(dirty);
    }
  });

  // Initialize fields on mount or when anime changes
  $effect(() => {
    editTitle = anime?.title || '';
    editSynopsis = anime?.synopsis || '';
    editCoverUrl = anime?.cover_url || '';
    editStatus = anime?.status || 'not_started';
    editRating = anime?.rating || null;
    editGenreIds = anime?.genres?.map(g => g.id) || [];
    editNotes = anime?.notes || '';
    localGenres = [...genres];
    covers = [];
    coverIndex = 0;
    coverError = false;
    
    pristine = pristineFromProps();
  });

  let appliedScrapedRef = null;
  $effect(() => {
    if (scrapedData && scrapedData !== appliedScrapedRef) {
      appliedScrapedRef = scrapedData;
      const d = scrapedData;
      if (d.title) editTitle = d.title;
      if (d.synopsis) editSynopsis = d.synopsis;
      if (d.cover_url) { editCoverUrl = d.cover_url; coverError = false; }
      if (d.genre_ids?.length) {
        if (d.new_genres?.length) {
          localGenres = [...localGenres, ...d.new_genres];
        }
        editGenreIds = [...new Set([...editGenreIds, ...d.genre_ids])];
      }
      covers = d.covers || [];
      coverIndex = 0;
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
      genre_ids: editGenreIds,
      notes: editNotes
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
        pristine = snapshot();
        lastDirty = false;
        ondirty?.(false);
        notify("Commander, anime updated: " + updated.title);
      } else {
        notify("Error: Failed to save changes.");
      }
    } else {
      const allSeasons = [
        ...(scrapedSeasons || []).filter(s => s.checked).map(s => ({
          season_number: s.season_number,
          total_episodes: s.total_episodes
        })),
        ...(manualSeasons || []).map(s => ({
          season_number: s.season_number,
          total_episodes: s.total_episodes
        }))
      ];
      if (allSeasons.length > 0) {
        payload.seasons = allSeasons;
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
  <!-- Col 1: Cover image + Cover URL stacked -->
  <div class="gc-col1">
    <div data-section="edit-cover" class="edit-cover-wrap">
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
    <div class="gc-cover-url">
      <label class="efield">
        <span class="efield-label">Cover URL</span>
        <input type="text" bind:value={editCoverUrl} class="efield-input" placeholder="https://..." oninput={() => { coverError = false; }} />
      </label>
    </div>
  </div>

  <!-- Col 2, Row 1: Title + Synopsis -->
  <div class="gc-title-synopsis">
    <label class="efield">
      <span class="efield-label">Title</span>
      <input type="text" bind:value={editTitle} class="efield-input" placeholder="Anime title" />
    </label>

    <label class="efield synopsis-field">
      <span class="efield-label">Synopsis</span>
      <textarea bind:value={editSynopsis} class="efield-input etextarea" placeholder="Anime synopsis..."></textarea>
    </label>
  </div>

  <!-- Col 2, Row 2: Genres + Status + Rating -->
  <div class="gc-fields">
    <label class="efield">
      <span class="efield-label">Genres</span>
      <GenreCombobox genres={localGenres} value={editGenreIds} onchange={(v) => { editGenreIds = v; }} oncreate={handleCreateGenre} />
    </label>

    <label class="efield">
      <span class="efield-label">Status</span>
      <select bind:value={editStatus} class="efield-input">
        <option value="not_started" style="color:var(--text-dim)">Not Started</option>
        <option value="watching" style="color:var(--cyan)">Watching</option>
        <option value="next-season" style="color:var(--amber)">Next Season</option>
        <option value="completed" style="color:var(--success)">Completed</option>
      </select>
    </label>

    <div class="efield">
      <span class="efield-label">Rating</span>
      <StarRating value={editRating} onchange={(v) => { editRating = v; }} />
    </div>
  </div>
</div>

<style>
  .edit-form-grid {
    display: grid;
    grid-template-columns: 1.75fr 3.25fr;
    grid-template-rows: 1fr auto;
    gap: 10px;
    min-height: 0;
    flex: 1;
  }
  .gc-col1 {
    grid-column: 1; grid-row: 1 / -1;
    display: flex; flex-direction: column; gap: 10px;
    min-height: 0; min-width: 0;
  }
  .gc-col1 .edit-cover-wrap { flex: 1; }
  .gc-title-synopsis {
    grid-column: 2; grid-row: 1;
    display: flex; flex-direction: column; gap: 10px;
    min-height: 0; min-width: 0;
  }
  .gc-fields {
    grid-column: 2; grid-row: 2;
    display: flex; flex-direction: column; gap: 10px;
    min-height: 0; min-width: 0;
  }
  .edit-cover-wrap {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-card);
  }
  .edit-cover-img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .edit-cover-placeholder {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    border: 2px dashed var(--border); border-radius: var(--radius);
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
    min-height: 0;
    resize: vertical;
  }
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
