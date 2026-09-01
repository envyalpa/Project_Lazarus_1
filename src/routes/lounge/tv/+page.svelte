<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Plus, ArrowUpDown, LayoutGrid, Table, Pencil, Trash2, Star, Flame, ListChecks, Minimize2, Equal, Maximize2, Play, Circle, Clock, Check } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import TVShowCard from '$lib/components/lounge/TVShowCard.svelte';
  import TVShowDetailModal from '$lib/components/lounge/TVShowDetailModal.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let tvShows = $state(data.tvShows);
  let genres = $state(data.genres);

  let deleteItem = $state(null);
  let viewMode = $state('card');
  let sortMode = $state(loadSortMode());
  let showProps = $state(false);
  let visibleProps = $state(loadProps());
  let detailShow = $state(undefined);
  let cardDensity = $state('normal');
  let statusFilter = $state(loadFilter());
  let selectedItems = $state([]);
  let showBulkDelete = $state(false);

  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  $effect(() => {
    if ($page.url.searchParams.has('open')) {
      const id = $page.url.searchParams.get('open');
      detailShow = tvShows.find(s => s.id == id) || undefined;
      goto('/lounge/tv', { replaceState: true });
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
    try { return localStorage.getItem('lazarus-tv-sort') || 'default'; }
    catch { return 'default'; }
  }

  function loadFilter() {
    try { return localStorage.getItem('lazarus-tv-status-filter') || 'all'; }
    catch { return 'all'; }
  }

  function loadProps() {
    try {
      return JSON.parse(localStorage.getItem('lazarus-tv-card-props')) || { status: true, rating: true, genres: true, progress: true };
    } catch { return { status: true, rating: true, genres: true, progress: true }; }
  }

  function toggleProp(key) {
    visibleProps[key] = !visibleProps[key];
    localStorage.setItem('lazarus-tv-card-props', JSON.stringify(visibleProps));
  }

  let sorted = $derived.by(() => {
    let list = [...tvShows];
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
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
    localStorage.setItem('lazarus-tv-sort', sortMode);
  }

  function cycleDensity() {
    const i = densityOrder.indexOf(cardDensity);
    cardDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  function setStatusFilter(status) {
    statusFilter = status;
    localStorage.setItem('lazarus-tv-status-filter', status);
  }

  async function handleDelete(id) {
    const item = tvShows.find(s => s.id === id);
    await fetch('/lounge/tv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id })
    });
    tvShows = tvShows.filter(s => s.id !== id);
    notify("Commander, TV show deleted: " + (item?.title || ''));
    deleteItem = null;
  }

  function toggleAll() {
    if (selectedItems.length === sorted.length) {
      selectedItems = [];
    } else {
      selectedItems = sorted.map(s => s.id);
    }
  }

  function toggleOne(id) {
    if (selectedItems.includes(id)) {
      selectedItems = selectedItems.filter(i => i !== id);
    } else {
      selectedItems = [...selectedItems, id];
    }
  }

  async function handleBulkDelete() {
    await fetch('/lounge/tv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk_delete: true, ids: selectedItems })
    });
    tvShows = tvShows.filter(s => !selectedItems.includes(s.id));
    notify("Commander, " + selectedItems.length + " TV shows deleted.");
    selectedItems = [];
    showBulkDelete = false;
  }

  function openEdit(item) { detailShow = item; }

  function handleSelect(item) { detailShow = item; }

  async function handleDetailClose() {
    detailShow = undefined;
    const res = await fetch('/lounge/tv');
    if (res.ok) tvShows = await res.json();
  }

  function statusLabel(s) {
    return { not_started: 'Not Started', watching: 'Watching', 'next-season': 'Next Season', completed: 'Completed' }[s] || s;
  }
</script>

<div data-section="tv-shows-page" class="tv-page">
  <div class="page-toolbar">
    <div class="toolbar-tabs">
      <button type="button" class="tab-btn" class:active={statusFilter === 'watching'} onclick={() => setStatusFilter('watching')}><Play size={16} /><span>Watching</span></button>
      <button type="button" class="tab-btn" class:active={statusFilter === 'not_started'} onclick={() => setStatusFilter('not_started')}><Circle size={16} /><span>Not Started</span></button>
      <button type="button" class="tab-btn" class:active={statusFilter === 'next-season'} onclick={() => setStatusFilter('next-season')}><Clock size={16} /><span>Next Season</span></button>
      <button type="button" class="tab-btn" class:active={statusFilter === 'completed'} onclick={() => setStatusFilter('completed')}><Check size={16} /><span>Finished</span></button>
      <button type="button" class="tab-btn" class:active={statusFilter === 'all'} onclick={() => setStatusFilter('all')}><LayoutGrid size={16} /><span>All</span></button>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="tool-btn sort-btn" onclick={cycleSort} title="Sort">
        <ArrowUpDown size={18} />
        <span>{sortLabels[sortMode]}</span>
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
      <button type="button" class="tool-btn add-btn" onclick={() => { detailShow = null; }}>
        <Plus size={18} />
        <span>Add TV Show</span>
      </button>
    </div>
  </div>

  <Panel stretch={true}>
    {#if sorted.length === 0}
      <div class="empty-state" data-label="empty-state">
        <span class="empty-text">No TV shows yet. Add your first one.</span>
      </div>
    {:else if viewMode === 'card'}
      <div data-section="tv-shows-grid" class="card-grid density-{cardDensity}">
        {#each sorted as item (item.id)}
          <TVShowCard show={item} {visibleProps} density={cardDensity} onedit={openEdit} ondelete={(s) => { deleteItem = s; }} onselect={handleSelect} />
        {/each}
      </div>
    {:else}
      <div data-section="tv-shows-table" class="table-wrap">
        {#if selectedItems.length > 0}
          <div data-label="multi-select-toolbar" class="multi-toolbar">
            <span class="selected-count">{selectedItems.length} selected</span>
            <button type="button" class="bulk-delete-btn" onclick={() => { showBulkDelete = true; }}>
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        {/if}
        <table>
          <thead>
            <tr>
              <th class="col-check"><input type="checkbox" checked={selectedItems.length === sorted.length && sorted.length > 0} onchange={toggleAll} /></th>
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
                <td class="col-check"><input type="checkbox" checked={selectedItems.includes(item.id)} onchange={() => toggleOne(item.id)} /></td>
                <td><button type="button" class="table-link-btn" onclick={() => handleSelect(item)}>{item.title}</button></td>
                <td><span class="status-pill" style="color: {item.status === 'watching' ? 'var(--cyan)' : item.status === 'next-season' ? 'var(--amber)' : item.status === 'completed' ? 'var(--success)' : 'var(--text-dim)'}">{statusLabel(item.status)}</span></td>
                <td>
                  {#if item.rating === 'trash'}
                    <span style="color: var(--danger); display: flex; gap: 1px;"><Trash2 size={15} /></span>
                  {:else if item.rating === 'flame'}
                    <span style="color: var(--amber); display: flex; gap: 1px;"><Flame size={15} fill="currentColor" /></span>
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
    <DeleteConfirm title="Delete TV Show" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={(id) => handleDelete(id)} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

{#if showBulkDelete}
  <Modal open={true} noHeader={true} compact onclose={() => { showBulkDelete = false; }}>
    <DeleteConfirm title="Delete Selected TV Shows" item={{ name: selectedItems.length + ' TV shows', id: null }} onconfirm={() => handleBulkDelete()} oncancel={() => { showBulkDelete = false; }} />
  </Modal>
{/if}

{#if detailShow !== undefined}
  <TVShowDetailModal show={detailShow} {genres} onclose={handleDetailClose} />
{/if}

<style>
  .tv-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }

  .page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .toolbar-tabs { display: flex; gap: 5px; background: var(--bg-bar); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px; }
  .tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 150px; height: 35px; padding: 0; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 500; color: var(--text-dim); text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border-radius: calc(var(--radius) - 1px); transition: all 0.2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: none; border: none; cursor: pointer; }
  .tab-btn:hover { color: var(--amber); background: var(--bg-elevated); }
  .tab-btn.active { color: var(--amber); background: rgba(255, 140, 0, 0.1); }

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

  .multi-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(0,212,255,0.06); border: 1px solid var(--cyan-dim); border-radius: var(--radius); margin-bottom: 10px; }
  .selected-count { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text); font-weight: 600; }
  .bulk-delete-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); padding: 6px 14px; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 600; cursor: pointer; transition: all 0.2s; margin-left: auto; }
  .bulk-delete-btn:hover { background: rgba(239,68,68,0.1); }
  .col-check { width: 40px; text-align: center; }
  .col-check input[type="checkbox"] { accent-color: var(--cyan); width: 16px; height: 16px; cursor: pointer; }

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
    font-family: var(--font-body);
    font-size: var(--fs-small);
    font-weight: 500;
    color: var(--text-dim);
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
