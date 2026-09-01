<script>
  import { ArrowLeft, X, Film, Trash2, Save, Search, Plus } from '@lucide/svelte';
  import { slide } from 'svelte/transition';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import MovieDetailForm from '$lib/components/lounge/MovieDetailForm.svelte';
  import MovieUrlScraper from '$lib/components/lounge/MovieUrlScraper.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { movie: initialMovie, genres = [], onclose } = $props();
  let movie = $state(initialMovie);
  let localGenres = $state(genres);
  let deleteItem = $state(null);
  let mode = $derived(movie ? 'edit' : 'create');

  let saveFn = $state(null);
  let formDirty = $state(false);
  let scrapedData = $state(null);

  function handleScraped(data) {
    scrapedData = { ...data };
  }

  async function handleDeleteMovie() {
    const title = movie?.title;
    await fetch(`/lounge/movies/${movie.id}`, { method: 'DELETE' });
    deleteItem = null; onclose?.();
    notify("Commander, movie deleted: " + (title || ''));
  }

  function handleFormSaved(savedMovie) {
    movie = savedMovie;
    if (mode === 'create') {
      onclose?.();
    }
  }
</script>

<div class="movie-modal-wrap">
<Modal open={true} full={mode !== 'create'} narrow={mode === 'create'} noHeader={true} noBodyScroll={true} onclose={onclose}>
  <div data-section="movie-detail-modal" class="detail-modal-body">
    {#if mode === 'create' || movie}
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
          <button type="button" class="panel-header-btn del-btn" onclick={() => { deleteItem = movie; }} title="Delete">
            <Trash2 size={15} color="var(--danger)" /> <span style="margin-left: 4px; color: var(--danger)">Delete</span>
          </button>
        {/if}
      {/snippet}

      {#if mode === 'create'}
        <Panel title="Auto-Fetch" icon={Search}>
          <MovieUrlScraper onscraped={handleScraped} />
        </Panel>
      {/if}

      <Panel title={mode === 'create' ? 'Add Movie' : 'Edit Movie'} icon={Film} stretch={true} class="form-panel" headerLeft={overviewHeaderLeft} headerRight={overviewHeaderRight}>
        <MovieDetailForm movie={movie} genres={localGenres}
          scrapedData={scrapedData}
          ondirty={(d) => { formDirty = d; }}
          onsaveset={(fn) => { saveFn = fn; }}
          onsaved={handleFormSaved}
          oncancel={onclose} />
      </Panel>

      {#if mode === 'create'}
        <button type="button" class="create-save-btn" onclick={async () => { if (saveFn) await saveFn(); }} disabled={!formDirty}>
          <Plus size={20} /> Add Movie
        </button>
      {/if}

      {#if mode === 'edit'}
        <div transition:slide={{ duration: 250 }}>
          <Panel title="Auto-Fetch" icon={Search}>
            <MovieUrlScraper onscraped={handleScraped} initialUrl={movie?.source_url || ''} />
          </Panel>
        </div>
      {/if}
    {:else}
      <div class="loading">Loading movie data...</div>
    {/if}
  </div>
</Modal>

</div>
{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    <DeleteConfirm title="Delete Movie" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={handleDeleteMovie} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

<style>
  .detail-modal-body { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1; }
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
  .panel-header-btn.close-btn:hover { border-color: var(--danger); color: var(--danger); }
  .panel-header-btn.save-btn { border-color: var(--cyan-dim); color: var(--cyan); }
  .panel-header-btn.save-btn:hover:not(:disabled) { border-color: var(--cyan); background: rgba(0, 212, 255, 0.1); }
  .panel-header-btn.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .panel-header-btn.del-btn:hover { border-color: var(--danger); color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .panel-header-btn.del-btn:active { transform: scale(0.95); }
  .back-label { display: none; }
  @media (min-width: 600px) { .back-label { display: inline; } }
  .loading { display: flex; align-items: center; justify-content: center; padding: 60px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }

  .movie-modal-wrap {
    --modal-full-width: 40vw;
    --modal-full-height: 80vh;
    --modal-narrow-width: 40vw;
    --modal-narrow-height: 80vh;
  }

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
