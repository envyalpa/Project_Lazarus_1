<script>
  import { Pencil, Trash2 } from '@lucide/svelte';
  import StarRating from '$lib/components/lounge/StarRating.svelte';
  import DocumentForgeEditor from '$lib/components/operations/DocumentForgeEditor.svelte';

  let { anime, onupdatecover, onupdatestatus, onupdaterating, onupdatenotes, onedit, ondelete } = $props();

  let editorNotes = $state(anime.notes || '');

  let saveTimer;
  $effect(() => {
    const notes = editorNotes;
    if (notes !== undefined) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => onupdatenotes?.(notes), 1500);
    }
    return () => clearTimeout(saveTimer);
  });
</script>

<div class="overview-grid">
  <div class="cover-col">
    <div data-label="anime-cover" class="cover-wrap" onclick={onupdatecover} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') onupdatecover?.(); }}>
      {#if anime.cover_url}
        <img src={anime.cover_url} alt={anime.title} class="cover-img" />
      {:else}
        <div class="cover-placeholder">
          <span>+ Add Cover</span>
        </div>
      {/if}
    </div>

    <label class="field prop-sep">
      <span class="field-label">Status</span>
      <select value={anime.status} onchange={onupdatestatus} class="field-select">
        <option value="not_started" style="color:var(--text-dim)">Not Started</option>
        <option value="watching" style="color:var(--cyan)">Watching</option>
        <option value="next-season" style="color:var(--amber)">Next Season</option>
        <option value="completed" style="color:var(--success)">Completed</option>
      </select>
    </label>

    <div class="field prop-sep">
      <span class="field-label">Rating</span>
      <StarRating value={anime.rating} onchange={onupdaterating} />
    </div>
  </div>

  <div class="info-section">
    <h1 class="anime-title">{anime.title}</h1>

    {#if anime.synopsis}
      <p class="synopsis">{anime.synopsis}</p>
    {/if}

    <div class="field prop-sep">
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

    <div class="field prop-sep notes-area">
      <span class="field-label">Notes</span>
      <div class="editor-wrap">
        <DocumentForgeEditor bind:contentMarkdown={editorNotes} theme="black" class="notes-inline-editor" />
      </div>
    </div>

  </div>
</div>

<style>
  .overview-grid {
    display: grid;
    grid-template-columns: 1fr 1.8fr;
    gap: 20px;
    flex: 1;
    min-height: 0;
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
    font-size: var(--fs-heading-1);
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

  .notes-area { flex: 1; }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
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
    font-size: var(--fs-body);
  }

  .no-data { color: var(--text-muted); font-family: var(--font-body); font-size: var(--fs-body); }

  .editor-wrap { flex: 1; min-height: 120px; border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; }

  :global(.notes-inline-editor) { flex: 1; min-height: 120px; }
  :global(.notes-inline-editor .blocks-list) { padding: 8px; max-width: none; }
  :global(.notes-inline-editor .btn-add-block) { margin-top: 8px; }

</style>
