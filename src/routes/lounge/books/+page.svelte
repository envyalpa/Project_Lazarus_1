<script>
  import { Plus, ArrowUpDown, LayoutGrid, Table, Pencil, Trash2, Star, Flame, ListChecks, Minimize2, Equal, Maximize2, Filter, X } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import { invalidate } from '$app/navigation';
  import Panel from '$lib/components/Panel.svelte';
  import BookCard from '$lib/components/lounge/BookCard.svelte';
  import BookDetailModal from '$lib/components/lounge/BookDetailModal.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import BooksCollectionTitle from '$lib/components/lounge/BooksCollectionTitle.svelte';

  let { data } = $props();
  let books = $state(data.books);
  let genres = $state(data.genres);
  let allSeries = $state(data.series);

  $effect(() => {
    books = data.books;
    genres = data.genres;
    allSeries = data.series;
  });

  let genreFilter = $state(null);
  let deleteItem = $state(null);
  let viewMode = $state('card');
  let sortMode = $state('default');
  let showProps = $state(false);
  let visibleProps = $state(loadProps());
  let activeBook = $state(undefined);
  let cardDensity = $state('normal');
  let statusFilter = $state(loadFilter());

  const filterOrder = ['all', 'not_started', 'reading', 'completed', 'not_purchased'];
  const filterLabels = { all: 'All', not_started: 'Not Started', reading: 'Reading', completed: 'Finished', not_purchased: 'Not Purchased' };
  const densityOrder = ['compact', 'normal', 'large'];

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

  function loadFilter() {
    try { return localStorage.getItem('lazarus-book-status-filter') || 'all'; }
    catch { return 'all'; }
  }

  function loadProps() {
    try {
      return JSON.parse(localStorage.getItem('lazarus-book-card-props')) || { status: true, rating: true, genres: true, series: true, author: true, startDate: true, endDate: true };
    } catch { return { status: true, rating: true, genres: true, series: true, author: true, startDate: true, endDate: true }; }
  }

  function toggleProp(key) {
    visibleProps[key] = !visibleProps[key];
    localStorage.setItem('lazarus-book-card-props', JSON.stringify(visibleProps));
  }

  let sorted = $derived.by(() => {
    let list = [...books];
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);
    if (genreFilter !== null) list = list.filter(b => b.genres?.some(g => g.id === genreFilter));
    if (sortMode === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 'status') {
      const order = { not_started: 0, reading: 1, completed: 2, not_purchased: 3 };
      list.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    }
    return list;
  });

  let seriesBookCounts = $derived.by(() => {
    const map = {};
    for (const b of books) {
      if (b.series_id) {
        if (!map[b.series_id]) map[b.series_id] = { maxVolume: 0, existingCount: 0, seriesName: '' };
        if (b.volume_number > map[b.series_id].maxVolume) map[b.series_id].maxVolume = b.volume_number;
        map[b.series_id].existingCount++;
      }
    }
    for (const s of allSeries) {
      if (map[s.id]) map[s.id].seriesName = s.name;
    }
    return map;
  });

  const sortLabels = { default: 'Default', title: 'Name', status: 'Status' };

  function cycleSort() {
    const order = ['default', 'title', 'status'];
    const i = order.indexOf(sortMode);
    sortMode = order[(i + 1) % order.length];
  }

  function cycleFilter() {
    const i = filterOrder.indexOf(statusFilter);
    statusFilter = filterOrder[(i + 1) % filterOrder.length];
    localStorage.setItem('lazarus-book-status-filter', statusFilter);
  }

  function cycleDensity() {
    const i = densityOrder.indexOf(cardDensity);
    cardDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  async function handleDelete(id) {
    const item = books.find(b => b.id === id);
    await fetch('/lounge/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id })
    });
    books = books.filter(b => b.id !== id);
    notify("Commander, book deleted: " + (item?.title || ''));
    deleteItem = null;
  }

  function openEdit(item) { activeBook = item; }

  function handleSelect(item) { activeBook = item; }

  async function handleDetailClose() {
    activeBook = undefined;
    await invalidate('lounge:data');
  }

  function statusLabel(s) {
    return { not_started: 'Not Started', reading: 'Reading', completed: 'Finished', not_purchased: 'Not Purchased' }[s] || s;
  }
</script>

<div data-section="books-page" class="books-page">
  <div class="page-toolbar">
    <BooksCollectionTitle value="library" />
    <div class="toolbar-actions">
      {#if genreFilter !== null}
        <button type="button" class="tool-btn filter-btn filter-active" onclick={() => { genreFilter = null; }} title="Clear genre filter">
          <X size={16} />
          <span>{genres.find(g => g.id === genreFilter)?.name || 'Genre'} </span>
        </button>
      {/if}
      <button type="button" class="tool-btn sort-btn" onclick={cycleSort} title="Sort">
        <ArrowUpDown size={18} />
        <span>{sortLabels[sortMode]}</span>
      </button>
      <button type="button" class="tool-btn filter-btn" class:filter-active={statusFilter !== 'all'} onclick={cycleFilter} title="Filter by status">
        <Filter size={18} />
        <span>{filterLabels[statusFilter]}</span>
      </button>
      <button type="button" class="tool-btn toggle-btn" class:toggle-active={viewMode === 'card'} onclick={() => { viewMode = viewMode === 'card' ? 'table' : 'card'; }}>
        {#if viewMode === 'card'}<LayoutGrid size={18} />{:else}<Table size={18} />{/if}
      </button>
      {#if viewMode === 'card'}
        <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
          {#if cardDensity === 'compact'}<Minimize2 size={18} />
          {:else if cardDensity === 'large'}<Maximize2 size={18} />
          {:else}<Equal size={18} />{/if}
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
              <input type="checkbox" checked={visibleProps.series} onchange={() => toggleProp('series')} />
              <span>Series</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.author} onchange={() => toggleProp('author')} />
              <span>Author</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.startDate} onchange={() => toggleProp('startDate')} />
              <span>Start Date</span>
            </label>
            <label class="prop-item">
              <input type="checkbox" checked={visibleProps.endDate} onchange={() => toggleProp('endDate')} />
              <span>End Date</span>
            </label>
          </div>
        {/if}
      </div>
      <button type="button" class="tool-btn add-btn" onclick={() => { activeBook = null; }}>
        <Plus size={18} />
        <span>Add Book</span>
      </button>
    </div>
  </div>

  <Panel stretch={true}>
    {#if sorted.length === 0}
      <div class="empty-state" data-label="empty-state">
        <span class="empty-text">No books yet. Add your first one.</span>
      </div>
    {:else if viewMode === 'card'}
      <div data-section="books-grid" class="card-grid density-{cardDensity}">
        {#each sorted as item (item.id)}
          <BookCard book={item} {visibleProps} density={cardDensity} onedit={openEdit} ondelete={(b) => { deleteItem = b; }} onselect={handleSelect} />
        {/each}
      </div>
    {:else}
      <div data-section="books-table" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Series</th>
              <th>Author</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Genres</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as item (item.id)}
              <tr>
                <td><button type="button" class="table-link-btn" onclick={() => handleSelect(item)}>{item.title}</button></td>
                <td><span class="series-cell">{item.series_name ? item.series_name + (item.volume_number > 0 ? ' Vol ' + item.volume_number : '') : '—'}</span></td>
                <td><span class="author-cell">{item.author || '—'}</span></td>
                <td><span class="status-pill" style="color: {item.status === 'reading' ? 'var(--cyan)' : item.status === 'completed' ? 'var(--success)' : item.status === 'not_purchased' ? 'var(--amber)' : 'var(--text-dim)'}">{statusLabel(item.status)}</span></td>
                  <td>
                    {#if item.rating === 'trash'}<span style="color: var(--danger); display: flex; gap: 1px;"><Trash2 size={15} /></span>
                    {:else if item.rating === 'flame'}<span style="color: var(--amber); display: flex; gap: 1px;"><Flame size={15} /></span>
                    {:else if item.rating && !isNaN(item.rating)}<span style="color: var(--amber); display: flex; gap: 1px;"><Star size={15} /><span style="font-size: var(--fs-body);"> {item.rating}/5</span></span>{/if}
                  </td>
                  <td><span class="genre-list">{item.genres?.map(g => g.name).join(', ') || '—'}</span></td>
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
    <DeleteConfirm title="Delete Book" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={(id) => handleDelete(id)} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

{#if activeBook !== undefined}
  <BookDetailModal book={activeBook} {genres} series={allSeries} {seriesBookCounts} onRequestClose={handleDetailClose} />
{/if}

<style>
  .books-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .page-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; color: var(--text); margin: 0; }
  .toolbar-actions { display: flex; gap: 6px; }
  .tool-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; height: 34px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s; }
  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .tool-btn:disabled { opacity: 0.5; cursor: not-allowed; color: var(--text-dim); border-color: var(--border); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .filter-btn.filter-active,
  .toggle-btn.toggle-active { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .add-btn { color: var(--cyan); }
  .props-wrap { position: relative; display: flex; align-items: center; }
  .props-btn { color: var(--text-dim); }
  .props-panel { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px; display: flex; flex-direction: column; gap: 2px; min-width: 140px; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
  .prop-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); transition: background 0.15s; }
  .prop-item:hover { background: var(--bg-panel); }
  .prop-item input[type="checkbox"] { accent-color: var(--cyan); width: 16px; height: 16px; flex-shrink: 0; }
  .empty-state { display: flex; align-items: center; justify-content: center; padding: 40px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .card-grid { display: grid; gap: 12px; }
  .card-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .card-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
  .card-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  th { background: var(--bg-card); padding: 10px 12px; text-align: left; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .col-actions { width: 80px; text-align: center; }
  .row-actions { display: flex; justify-content: center; gap: 4px; }
  .row-act-btn { background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; padding: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); transition: all 0.15s; }
  .row-act-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .row-act-btn.edit { color: var(--amber); border-color: var(--amber); }
  .row-act-btn.edit:hover { color: var(--amber); border-color: var(--amber); background: rgba(255, 140, 0, 0.1); }
  .row-act-btn.edit:active { transform: scale(0.92); background: rgba(255, 140, 0, 0.2); }
  .row-act-btn.del { color: var(--danger); border-color: var(--danger); }
  .row-act-btn.del:hover { color: var(--danger); border-color: var(--danger); background: rgba(239, 68, 68, 0.1); }
  .row-act-btn.del:active { transform: scale(0.92); background: rgba(239, 68, 68, 0.2); }
  .table-link-btn { color: var(--cyan); font-weight: 600; font-family: var(--font-body); font-size: var(--fs-body); background: none; border: none; cursor: pointer; padding: 0; text-align: left; transition: color 0.2s; }
  .table-link-btn:hover { color: var(--cyan); text-decoration: underline; }
  .status-pill { display: inline-block; padding: 2px 8px; border: 1px solid; border-radius: var(--radius); font-size: var(--fs-caption); font-weight: 600; background: rgba(0,0,0,0.2); }
  .author-cell { color: var(--text-dim); font-size: var(--fs-caption); }
  .series-cell { color: var(--cyan); font-size: var(--fs-body); font-weight: 600; }
  .genre-list { color: var(--text-dim); font-size: var(--fs-caption); }
</style>
