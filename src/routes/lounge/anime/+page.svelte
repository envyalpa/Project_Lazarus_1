<script>
  import { page } from '$app/stores';
  import { Plus, ArrowUpDown, LayoutGrid, Table, Pencil, Trash2, Star, Flame, ListChecks, Minimize2, Equal, Maximize2, Filter } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import AnimeCard from '$lib/components/lounge/AnimeCard.svelte';
  import AnimeDetailModal from '$lib/components/lounge/AnimeDetailModal.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let anime = $state(data.anime);
  let genres = $state(data.genres);

  let deleteItem = $state(null);
  let viewMode = $state('card');
  let sortMode = $state(loadSortMode());
  let showProps = $state(false);
  let visibleProps = $state(loadProps());
  let detailAnime = $state(undefined);
  let cardDensity = $state('normal');
  let statusFilter = $state(loadFilter());

  const filterOrder = ['all', 'not_started', 'watching', 'next-season', 'completed'];
  const filterLabels = { all: 'All', not_started: 'Not Started', watching: 'Watching', 'next-season': 'Next Season', completed: 'Completed' };
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  $effect(() => {
    if ($page.url.searchParams.has('open')) {
      const id = $page.url.searchParams.get('open');
      detailAnime = anime.find(a => a.id == id) || undefined;
      history.replaceState(null, '', '/lounge/anime');
    }
  });

  $effect(() => {
    if (showProps) {
      const handler = (e) => {
        const wrap = document.querySelector('[data-section="props-dropdown"]');
        if (wrap && !wrap.contains(e.target)) showProps = false;
      };
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  });

  function loadSortMode() {
    try { return localStorage.getItem('lazarus-anime-sort') || 'default'; }
    catch { return 'default'; }
  }

  function loadFilter() {
    try { return localStorage.getItem('lazarus-anime-status-filter') || 'all'; }
    catch { return 'all'; }
  }

  function loadProps() {
    try {
      return JSON.parse(localStorage.getItem('lazarus-anime-card-props')) || { status: true, rating: true, genres: true, progress: true };
    } catch { return { status: true, rating: true, genres: true, progress: true }; }
  }

  function toggleProp(key) {
    visibleProps[key] = !visibleProps[key];
    localStorage.setItem('lazarus-anime-card-props', JSON.stringify(visibleProps));
  }

  let sorted = $derived.by(() => {
    let list = [...anime];
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (sortMode === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 'status') {
      const order = { not_started: 0, watching: 1, 'next-season': 2, completed: 3 };
      list.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    } else if (sortMode === 'updated') {
      list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
    return list;
  });

  const sortLabels = { default: 'Default', updated: 'Updated', title: 'Name', status: 'Status' };

  function cycleSort() {
    const order = ['default', 'updated', 'title', 'status'];
    const i = order.indexOf(sortMode);
    sortMode = order[(i + 1) % order.length];
    localStorage.setItem('lazarus-anime-sort', sortMode);
  }

  function cycleFilter() {
    const i = filterOrder.indexOf(statusFilter);
    statusFilter = filterOrder[(i + 1) % filterOrder.length];
    localStorage.setItem('lazarus-anime-status-filter', statusFilter);
  }

  function cycleDensity() {
    const i = densityOrder.indexOf(cardDensity);
    cardDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  async function handleDelete(id) {
    const item = anime.find(a => a.id === id);
    await fetch('/lounge/anime', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id })
    });
    anime = anime.filter(a => a.id !== id);
    notify("Commander, anime deleted: " + (item?.title || ''));
    deleteItem = null;
  }

  function openEdit(item) { detailAnime = item; }

  function handleSelect(item) { detailAnime = item; }

  async function handleDetailClose() {
    detailAnime = undefined;
    const res = await fetch('/lounge/anime');
    if (res.ok) anime = await res.json();
  }

  function statusLabel(s) {
    return { not_started: 'Not Started', watching: 'Watching', 'next-season': 'Next Season', completed: 'Completed' }[s] || s;
  }
</script>

<div data-section="anime-page" class="anime-page">
  <div class="page-toolbar">
    <h2 class="page-title" data-label="page-title">Anime Collection</h2>
    <div class="toolbar-actions">
      <button type="button" class="tool-btn sort-btn" onclick={cycleSort} title="Sort">
        <ArrowUpDown size={18} />
        <span>{sortLabels[sortMode]}</span>
      </button>
      <button type="button" class="tool-btn filter-btn" class:filter-active={statusFilter !== 'all'} onclick={cycleFilter} title="Filter by status">
        <Filter size={18} />
        <span>{filterLabels[statusFilter]}</span>
      </button>
      <button type="button" class="tool-btn toggle-btn" class:toggle-active={viewMode === 'card'} onclick={() => { viewMode = viewMode === 'card' ? 'table' : 'card'; }}>
        {#if viewMode === 'card'}
          <LayoutGrid size={18} />
        {:else}
          <Table size={18} />
        {/if}
      </button>
      {#if viewMode === 'card'}
        <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
          {#if cardDensity === 'compact'}
            <Minimize2 size={18} />
          {:else if cardDensity === 'large'}
            <Maximize2 size={18} />
          {:else}
            <Equal size={18} />
          {/if}
        </button>
      {/if}
      <div data-section="props-dropdown" class="props-wrap">
        <button type="button" class="tool-btn props-btn" onclick={() => { showProps = !showProps; }} title="Card Properties">
          <ListChecks size={20} />
        </button>
        {#if showProps}
          <div data-label="props-panel" class="props-panel" role="menu" onclick={(e) => e.stopPropagation()}>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.status} onchange={() => toggleProp('status')} />
              <span>Status</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.rating} onchange={() => toggleProp('rating')} />
              <span>Rating</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.genres} onchange={() => toggleProp('genres')} />
              <span>Genres</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.progress} onchange={() => toggleProp('progress')} />
              <span>Progress</span>
            </label>
          </div>
        {/if}
      </div>
      <button type="button" class="tool-btn add-btn" onclick={() => { detailAnime = null; }}>
        <Plus size={18} />
        <span>Add Anime</span>
      </button>
    </div>
  </div>

  <Panel stretch={true}>
    {#if sorted.length === 0}
      <div class="empty-state" data-label="empty-state">
        <span class="empty-text">No anime yet. Add your first one.</span>
      </div>
    {:else if viewMode === 'card'}
      <div data-section="anime-grid" class="card-grid density-{cardDensity}">
        {#each sorted as item (item.id)}
          <AnimeCard anime={item} {visibleProps} density={cardDensity} onedit={openEdit} ondelete={(a) => { deleteItem = a; }} onselect={handleSelect} />
        {/each}
      </div>
    {:else}
      <div data-section="anime-table" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Genres</th>
              <th>Progress</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as item (item.id)}
              <tr>
                <td><button type="button" class="table-link-btn" onclick={() => handleSelect(item)}>{item.title}</button></td>
                <td><span class="status-pill" style="color: {item.status === 'watching' ? 'var(--cyan)' : item.status === 'next-season' ? 'var(--amber)' : item.status === 'completed' ? 'var(--success)' : 'var(--text-dim)'}">{statusLabel(item.status)}</span></td>
                <td>
                  {#if item.rating === 'trash'}
                    <span style="color: var(--danger); display: flex; gap: 1px;"><Trash2 size={15} /></span>
                  {:else if item.rating === 'flame'}
                    <span style="color: var(--amber); display: flex; gap: 1px;"><Flame size={15} /></span>
                  {:else if item.rating && !isNaN(item.rating)}
                    <span style="color: var(--amber); display: flex; gap: 1px;">
                      <Star size={15} />
                      <span style="font-size: var(--fs-body);"> {item.rating}/5</span>
                    </span>
                  {/if}
                </td>
                <td><span class="genre-list">{item.genres?.map(g => g.name).join(', ') || '—'}</span></td>
                <td>
                  {#if item.total_episodes > 0}
                    <span class="progress-cell">{item.total_watched}/{item.total_episodes}</span>
                  {:else}—{/if}
                </td>
                <td class="col-actions">
                  <div role="presentation" onclick={(e) => e.stopPropagation()} class="row-actions">
                    <button type="button" class="row-act-btn edit" onclick={() => openEdit(item)} title="Edit"><Pencil size={15} /></button>
                    <button type="button" class="row-act-btn del" onclick={() => { deleteItem = item; }} title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Panel>
</div>

{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    <DeleteConfirm title="Delete Anime" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={(id) => handleDelete(id)} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

{#if detailAnime !== undefined}
  <AnimeDetailModal anime={detailAnime} {genres} onclose={handleDetailClose} />
{/if}

<style>
  .anime-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }

  .page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .page-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-1);
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .toolbar-actions {
    display: flex;
    gap: 6px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    height: 34px;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    transition: all 0.2s;
  }

  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .filter-btn.filter-active,
  .toggle-btn.toggle-active { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }

  .add-btn { color: var(--cyan); }

  .props-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .props-btn { color: var(--text-dim); }

  .props-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 140px;
    z-index: 50;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .prop-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    transition: background 0.15s;
  }

  .prop-item:hover { background: var(--bg-panel); }

  .prop-item input[type="checkbox"] {
    accent-color: var(--cyan);
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }

  .card-grid {
    display: grid;
    gap: 12px;
  }

  .card-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .card-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
  .card-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  th {
    background: var(--bg-card);
    padding: 10px 12px;
    text-align: left;
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid var(--border);
  }

  td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }

  .col-actions { width: 80px; text-align: center; }

  .row-actions {
    display: flex;
    justify-content: center;
    gap: 4px;
  }

  .row-act-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    padding: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    transition: all 0.15s;
  }

  .row-act-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .row-act-btn.edit { color: var(--amber); border-color: var(--amber); }
  .row-act-btn.edit:hover { color: var(--amber); border-color: var(--amber); background: rgba(255, 140, 0, 0.1); }
  .row-act-btn.edit:active { transform: scale(0.92); background: rgba(255, 140, 0, 0.2); }
  .row-act-btn.del { color: var(--danger); border-color: var(--danger); }
  .row-act-btn.del:hover { color: var(--danger); border-color: var(--danger); background: rgba(239, 68, 68, 0.1); }
  .row-act-btn.del:active { transform: scale(0.92); background: rgba(239, 68, 68, 0.2); }

  .table-link-btn {
    color: var(--cyan);
    font-weight: 600;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: color 0.2s;
  }

  .table-link-btn:hover { color: var(--cyan); text-decoration: underline; }

  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid;
    border-radius: var(--radius);
    font-size: var(--fs-caption);
    font-weight: 600;
    background: rgba(0,0,0,0.2);
  }

  .genre-list { color: var(--text-dim); font-size: var(--fs-caption); }

  .progress-cell { font-weight: 600; color: var(--cyan); }
</style>
