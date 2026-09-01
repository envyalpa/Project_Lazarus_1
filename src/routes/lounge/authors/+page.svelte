<script>
  import { notify } from '$lib/stores/notification.js';
  import { invalidate } from '$app/navigation';
  import BookDetailModal from '$lib/components/lounge/BookDetailModal.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import BookAuthors from '$lib/components/lounge/BookAuthors.svelte';
  import AuthorEditModal from '$lib/components/lounge/AuthorEditModal.svelte';
  import QuickNavPanel from '$lib/components/lounge/QuickNavPanel.svelte';
  import { BookOpen, Users, BookMarked, Tags } from '@lucide/svelte';


  let { data } = $props();
  let books = $state(data.books);
  let allAuthors = $state(data.authors);

  $effect(() => {
    books = data.books;
    allAuthors = data.authors;
  });

  let editingAuthor = $state(null);
  let activeBook = $state(undefined);
  let deleteItem = $state(null);
  let authorDensity = $state(typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('authorDensity') || 'normal') : 'normal');
  const authorDensityOrder = ['compact', 'normal', 'large'];
  let navSortMode = $state('default');

  function cycleAuthorDensity() {
    const i = authorDensityOrder.indexOf(authorDensity);
    authorDensity = authorDensityOrder[(i + 1) % authorDensityOrder.length];
    sessionStorage.setItem('authorDensity', authorDensity);
  }

  function cycleNavSort() {
    const order = ['default', 'name', 'count'];
    navSortMode = order[(order.indexOf(navSortMode) + 1) % order.length];
  }

  let authorNavItems = $derived(allAuthors.map(a => ({ id: a.id, name: a.name, count: books.filter(b => b.author?.toLowerCase().includes(a.name.toLowerCase())).length })));

  let sortedAuthorNavItems = $derived.by(() => {
    const items = [...authorNavItems];
    if (navSortMode === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (navSortMode === 'count') items.sort((a, b) => b.count - a.count);
    return items;
  });

  let detailText = $derived(deleteItem?.bookCount > 0 ? `This author has ${deleteItem.bookCount} book${deleteItem.bookCount === 1 ? '' : 's'} assigned. Deleting will set those books to "No Author".` : '');

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

  async function handleAuthorSave(data) {
    try {
      const res = await fetch('/api/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        const i = allAuthors.findIndex(a => a.id === updated.id);
        if (i >= 0) {
          allAuthors = allAuthors.map((a, idx) => idx === i ? updated : a);
        } else {
          allAuthors = [...allAuthors, updated];
        }
        notify("Author saved: " + data.name);
        editingAuthor = null;
        await invalidate('lounge:data');
        const bkRes = await fetch('/lounge/books');
        if (bkRes.ok) books = await bkRes.json();
      } else {
        notify("Error saving author (" + res.status + ")");
        editingAuthor = null;
      }
    } catch (err) {
      notify("Error: " + err.message);
      editingAuthor = null;
    }
  }

  async function handleAuthorDelete(author) {
    try {
      await invalidate('lounge:data');
      const res = await fetch('/api/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: author.id })
      });
      if (res.ok) {
        allAuthors = allAuthors.filter(a => a.id !== author.id);
        notify("Author deleted: " + author.name);
      } else {
        notify("Error deleting author (" + res.status + ")");
      }
    } catch (err) {
      notify("Error: " + err.message);
    }
  }

  function handleBulkDelete(ids) {
    const items = ids.map(id => allAuthors.find(a => a.id === id)).filter(Boolean);
    const totalBookCount = items.reduce((sum, a) => {
      const nav = authorNavItems.find(i => i.id === a.id);
      return sum + (nav?.count || 0);
    }, 0);
    deleteItem = { ids, names: items.map(a => a.name), bookCount: totalBookCount, isBulk: true };
  }
</script>

<div data-section="authors-page" class="authors-page">
  <div class="page-toolbar">
    <div class="toolbar-tabs">
      <a href="/lounge/books" class="tab-btn"><BookOpen size={16} /><span>Book Library</span></a>
      <a href="/lounge/authors" class="tab-btn active"><Users size={16} /><span>Authors</span></a>
      <a href="/lounge/series" class="tab-btn"><BookMarked size={16} /><span>Series</span></a>
      <a href="/lounge/genres" class="tab-btn"><Tags size={16} /><span>Genres</span></a>
    </div>
  </div>
  <div class="split-layout">
    <div class="nav-col">
      <QuickNavPanel items={sortedAuthorNavItems} onselect={(item) => scrollToSection('author', item.name)} ondeletenav={(item) => { const a = allAuthors.find(x => x.id === item.id); if (a) { const c = authorNavItems.find(i => i.id === a.id)?.count || 0; deleteItem = { ...a, bookCount: c, isBulk: false }; } }} label="Authors" onadd={() => editingAuthor = { name: '', color: '--cyan', description: '', image_url: '', wiki_link: '' }} onsort={cycleNavSort} sortMode={navSortMode} onbulkdelete={handleBulkDelete} densityValue={authorDensity} ondensity={cycleAuthorDensity} />
    </div>
      <div class="split-main">
      <BookAuthors {books} authors={allAuthors} density={authorDensity} sortMode={navSortMode} onselectbook={handleSelect} onedit={(section) => { editingAuthor = section; }} ondelete={(section) => { if (!section.authorId) return; const c = authorNavItems.find(i => i.id === section.authorId)?.count || 0; deleteItem = { id: section.authorId, name: section.name, bookCount: c, isBulk: false }; }} />
    </div>
  </div>
</div>

{#if activeBook !== undefined}
  <BookDetailModal book={activeBook} genres={[]} series={[]} seriesBookCounts={{}} onRequestClose={handleDetailClose} />
{/if}

{#if editingAuthor}
  <AuthorEditModal author={editingAuthor} onsave={handleAuthorSave} oncancel={() => { editingAuthor = null; }} />
{/if}

{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    {#if deleteItem.isBulk}
      <DeleteConfirm title="Delete Authors" item={{ name: `${deleteItem.names.length} authors`, bookCount: deleteItem.bookCount, ids: deleteItem.ids }} {detailText} onconfirm={() => { for (const id of deleteItem.ids) handleAuthorDelete({ id }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {:else}
      <DeleteConfirm title="Delete Author" item={{ name: deleteItem.name, id: deleteItem.id, bookCount: deleteItem.bookCount }} {detailText} onconfirm={(id) => { handleAuthorDelete({ id, name: deleteItem.name }); deleteItem = null; }} oncancel={() => { deleteItem = null; }} />
    {/if}
  </Modal>
{/if}

<style>
  .authors-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
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
