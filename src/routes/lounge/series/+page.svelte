<script>
  import { notify } from '$lib/stores/notification.js';
  import { invalidate } from '$app/navigation';
  import BookDetailModal from '$lib/components/lounge/BookDetailModal.svelte';
  import BookSeriesPanel from '$lib/components/lounge/BookSeriesPanel.svelte';
  import SeriesEditModal from '$lib/components/lounge/SeriesEditModal.svelte';
  import QuickNavPanel from '$lib/components/lounge/QuickNavPanel.svelte';
  import { BookOpen, Users, BookMarked, Tags } from '@lucide/svelte';

  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let books = $state(data.books);
  let allSeries = $state(data.series);

  $effect(() => {
    books = data.books;
    allSeries = data.series;
  });

  let editingSeries = $state(null);
  let activeBook = $state(undefined);
  let deleteItem = $state(null);
  let navSortMode = $state('default');
  let seriesDensity = $state(typeof localStorage !== 'undefined' ? (localStorage.getItem('seriesDensity') || 'normal') : 'normal');
  const densityOrder = ['compact', 'normal', 'large'];

  function cycleNavSort() {
    const order = ['default', 'name', 'count'];
    navSortMode = order[(order.indexOf(navSortMode) + 1) % order.length];
  }

  function cycleSeriesDensity() {
    const i = densityOrder.indexOf(seriesDensity);
    seriesDensity = densityOrder[(i + 1) % densityOrder.length];
    localStorage.setItem('seriesDensity', seriesDensity);
  }

  let seriesNavItems = $derived(allSeries.map(s => ({ id: s.id, name: s.name, count: books.filter(b => b.series_id === s.id).length })));

  let sortedSeriesNavItems = $derived.by(() => {
    const items = [...seriesNavItems];
    if (navSortMode === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (navSortMode === 'count') items.sort((a, b) => b.count - a.count);
    return items;
  });

  let detailText = $derived(deleteItem?.bookCount > 0 ? `This series has ${deleteItem.bookCount} book${deleteItem.bookCount === 1 ? '' : 's'} assigned. Deleting will set those books to "No Series".` : '');

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function scrollToSection(prefix, name) {
    const id = prefix + '-' + slugify(name);
    const el = document.getElementById(id) || document.querySelector(`[data-nav-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSelect(item) { activeBook = item; }

  async function handleDetailClose() {
    activeBook = undefined;
    await invalidate('lounge:data');
  }

  async function handleSeriesSave(data) {
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.id ? { action: 'update', id: data.id, ...data } : data)
      });
      if (res.ok) {
        const updated = await res.json();
        if (data.id) {
          allSeries = allSeries.map(s => s.id === updated.id ? updated : s);
        } else {
          allSeries = [...allSeries, updated];
        }
        notify("Series saved: " + data.name);
        editingSeries = null;
        await invalidate('lounge:data');
      } else {
        notify("Error saving series (" + res.status + ")");
      }
    } catch (err) {
      notify("Error: " + err.message);
      editingSeries = null;
    }
  }

  async function handleSeriesDelete(series) {
    try {
      await invalidate('lounge:data');
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: series.id })
      });
      if (res.ok) {
        allSeries = allSeries.filter(s => s.id !== series.id);
        notify("Series deleted: " + series.name);
      } else {
        notify("Error deleting series (" + res.status + ")");
      }
    } catch (err) {
      notify("Error: " + err.message);
    }
  }

  function handleBulkDelete(ids) {
    const items = ids.map(id => allSeries.find(s => s.id === id)).filter(Boolean);
    const totalBookCount = items.reduce((sum, s) => {
      const nav = seriesNavItems.find(i => i.id === s.id);
      return sum + (nav?.count || 0);
    }, 0);
    deleteItem = { ids, names: items.map(s => s.name), bookCount: totalBookCount, isBulk: true };
  }
</script>

<div data-section="series-page" class="series-page">
  <div class="page-toolbar">
    <div class="toolbar-tabs">
      <a href="/lounge/books" class="tab-btn"><BookOpen size={16} /><span>Book Library</span></a>
      <a href="/lounge/authors" class="tab-btn"><Users size={16} /><span>Authors</span></a>
      <a href="/lounge/series" class="tab-btn active"><BookMarked size={16} /><span>Series</span></a>
      <a href="/lounge/genres" class="tab-btn"><Tags size={16} /><span>Genres</span></a>
    </div>
  </div>
  <div class="split-layout">
    <div class="nav-col">
      <QuickNavPanel items={sortedSeriesNavItems} onselect={(item) => scrollToSection('series', item.name)} ondeletenav={(item) => { const s = allSeries.find(x => x.id === item.id); if (s) { const c = seriesNavItems.find(i => i.id === s.id)?.count || 0; deleteItem = { ...s, bookCount: c, isBulk: false }; } }} label="Series" onadd={() => editingSeries = { name: '' }} onsort={cycleNavSort} sortMode={navSortMode} onbulkdelete={handleBulkDelete} densityValue={seriesDensity} ondensity={cycleSeriesDensity} />
    </div>
      <div class="split-main">
      <BookSeriesPanel series={allSeries} {books} sortMode={navSortMode} density={seriesDensity} onselectbook={handleSelect} onedit={(section) => { editingSeries = { id: section.id, name: section.name, icon: section.icon, color: section.color, description: section.description }; }} ondelete={(section) => { const c = seriesNavItems.find(i => i.id === section.id)?.count || 0; deleteItem = { id: section.id, name: section.name, bookCount: c, isBulk: false }; }} />
    </div>
  </div>
</div>

{#if activeBook !== undefined}
  <BookDetailModal book={activeBook} genres={[]} series={allSeries} seriesBookCounts={{}} onRequestClose={handleDetailClose} />
{/if}

{#if editingSeries}
  <SeriesEditModal series={editingSeries} onsave={handleSeriesSave} ondelete={handleSeriesDelete} oncancel={() => { editingSeries = null; }} />
{/if}

{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    {#if deleteItem.isBulk}
      <DeleteConfirm title="Delete Series" item={{ name: `${deleteItem.names.length} series`, bookCount: deleteItem.bookCount, ids: deleteItem.ids }} {detailText} onconfirm={() => { for (const id of deleteItem.ids) handleSeriesDelete({ id }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {:else}
      <DeleteConfirm title="Delete Series" item={{ name: deleteItem.name, id: deleteItem.id, bookCount: deleteItem.bookCount }} {detailText} onconfirm={(id) => { handleSeriesDelete({ id, name: deleteItem.name }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {/if}
  </Modal>
{/if}

<style>
  .series-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .toolbar-tabs { display: flex; gap: 5px; background: var(--bg-bar); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px; }
  .tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 150px; height: 35px; padding: 0; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 500; color: var(--text-dim); text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border-radius: calc(var(--radius) - 1px); transition: all 0.2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tab-btn:hover { color: var(--amber); background: var(--bg-elevated); }
  .tab-btn.active { color: var(--amber); background: rgba(255, 140, 0, 0.1); }
  .split-layout { display: flex; gap: 14px; flex: 1; min-height: 0; }
  .nav-col { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
  .nav-col :global(.quick-nav) { flex: 1; min-height: 0; }
  .split-main { flex: 1; min-width: 0; overflow-y: auto; }
</style>
