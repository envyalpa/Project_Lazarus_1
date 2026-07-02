<script>
  import { notify } from '$lib/stores/notification.js';
  import { invalidate } from '$app/navigation';
  import BookDetailModal from '$lib/components/lounge/BookDetailModal.svelte';
  import BookGenres from '$lib/components/lounge/BookGenres.svelte';
  import GenreEditModal from '$lib/components/lounge/GenreEditModal.svelte';
  import QuickNavPanel from '$lib/components/lounge/QuickNavPanel.svelte';
  import BooksCollectionTitle from '$lib/components/lounge/BooksCollectionTitle.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { data } = $props();
  let books = $state(data.books);
  let genres = $state(data.genres);

  $effect(() => {
    books = data.books;
    genres = data.genres;
  });

  let editingGenre = $state(null);
  let activeBook = $state(undefined);
  let deleteItem = $state(null);
  let navSortMode = $state('default');

  function cycleNavSort() {
    const order = ['default', 'name', 'count'];
    navSortMode = order[(order.indexOf(navSortMode) + 1) % order.length];
  }

  let genreNavItems = $derived(genres.map(g => ({ id: g.id, name: g.name, count: books.filter(b => b.genres?.some(bg => bg.id === g.id)).length })));

  let sortedGenreNavItems = $derived.by(() => {
    const items = [...genreNavItems];
    if (navSortMode === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (navSortMode === 'count') items.sort((a, b) => b.count - a.count);
    return items;
  });

  let detailText = $derived(deleteItem?.bookCount > 0 ? `This genre has ${deleteItem.bookCount} book${deleteItem.bookCount === 1 ? '' : 's'} assigned. Deleting will remove it from those books.` : '');

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

  async function handleGenreSave(data) {
    try {
      const res = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.id ? { action: 'update', id: data.id, ...data } : data)
      });
      if (res.ok) {
        const updated = await res.json();
        if (data.id) {
          genres = genres.map(g => g.id === updated.id ? updated : g);
        } else {
          genres = [...genres, updated];
        }
        notify("Genre saved: " + data.name);
        editingGenre = null;
        await invalidate('lounge:data');
      } else {
        notify("Error saving genre (" + res.status + ")");
      }
    } catch (err) {
      notify("Error: " + err.message);
      editingGenre = null;
    }
  }

  async function handleGenreDelete(genre) {
    try {
      await invalidate('lounge:data');
      const res = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: genre.id })
      });
      if (res.ok) {
        genres = genres.filter(g => g.id !== genre.id);
        notify("Genre deleted: " + genre.name);
      } else {
        notify("Error deleting genre (" + res.status + ")");
      }
    } catch (err) {
      notify("Error: " + err.message);
    }
  }

  function handleBulkDelete(ids) {
    const items = ids.map(id => genres.find(g => g.id === id)).filter(Boolean);
    const totalBookCount = items.reduce((sum, g) => {
      const nav = genreNavItems.find(i => i.id === g.id);
      return sum + (nav?.count || 0);
    }, 0);
    deleteItem = { ids, names: items.map(g => g.name), bookCount: totalBookCount, isBulk: true };
  }
</script>

<div data-section="genres-page" class="genres-page">
  <div class="split-layout">
    <div class="nav-col">
      <BooksCollectionTitle value="genres" />
      <QuickNavPanel items={sortedGenreNavItems} onselect={(item) => scrollToSection('genre', item.name)} ondeletenav={(item) => { const g = genres.find(x => x.id === item.id); if (g) { const c = genreNavItems.find(i => i.id === g.id)?.count || 0; deleteItem = { ...g, bookCount: c, isBulk: false }; } }} label="Genres" onadd={() => editingGenre = { name: '' }} onsort={cycleNavSort} sortMode={navSortMode} onbulkdelete={handleBulkDelete} />
    </div>
      <div class="split-main">
      <BookGenres {genres} {books} sortMode={navSortMode} onselectgenre={handleSelect} oneditgenre={(g) => { editingGenre = g; }} ondelegencycle={(g) => { const c = genreNavItems.find(i => i.id === g.id)?.count || 0; deleteItem = { ...g, bookCount: c, isBulk: false }; }} />
    </div>
  </div>
</div>

{#if activeBook !== undefined}
  <BookDetailModal book={activeBook} genres={[]} series={[]} seriesBookCounts={{}} onRequestClose={handleDetailClose} />
{/if}

{#if editingGenre}
  <GenreEditModal genre={editingGenre} onsave={handleGenreSave} ondelete={handleGenreDelete} oncancel={() => { editingGenre = null; }} />
{/if}

{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    {#if deleteItem.isBulk}
      <DeleteConfirm title="Delete Genres" item={{ name: `${deleteItem.names.length} genres`, bookCount: deleteItem.bookCount, ids: deleteItem.ids }} {detailText} onconfirm={() => { for (const id of deleteItem.ids) handleGenreDelete({ id }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {:else}
      <DeleteConfirm title="Delete Genre" item={{ name: deleteItem.name, id: deleteItem.id, bookCount: deleteItem.bookCount }} {detailText} onconfirm={(id) => { handleGenreDelete({ id, name: deleteItem.name }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {/if}
  </Modal>
{/if}

<style>
  .genres-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .split-layout { display: flex; gap: 14px; flex: 1; min-height: 0; }
  .nav-col { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
  .nav-col :global(.quick-nav) { flex: 1; min-height: 0; }
  .split-main { flex: 1; min-width: 0; overflow-y: auto; }
</style>
