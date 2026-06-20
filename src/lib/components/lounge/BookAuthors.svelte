<script>
  import { Pencil, Trash2, Users } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import BookCoverCarousel from './BookCoverCarousel.svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { books = [], authors = [], density = 'normal', onselectbook, onedit, ondelete, sortMode = 'default' } = $props();

  // Row height and column widths per density level
  const densityMap = {
    compact: { rowHeight: 150, imgWidth: 95,  descWidth: 340, cardWidth: 90  },
    normal:  { rowHeight: 218, imgWidth: 135, descWidth: 495, cardWidth: 128 },
    large:   { rowHeight: 300, imgWidth: 190, descWidth: 680, cardWidth: 176 }
  };
  let dm = $derived(densityMap[density] ?? densityMap.normal);

  let authorSections = $derived.by(() => {
    const map = {};
    for (const b of books) {
      const names = b.author ? b.author.split(',').map(a => a.trim()).filter(Boolean) : ['Unknown'];
      for (const name of names) {
        if (!map[name]) map[name] = [];
        map[name].push(b);
      }
    }
    const authorMap = {};
    for (const a of authors) authorMap[a.name.toLowerCase()] = a;

    return Object.entries(map)
      .map(([name, bk]) => {
        const meta = authorMap[name.toLowerCase()];
        return {
          name,
          books: bk,
          count: bk.length,
          color: meta?.color || '--cyan',
          description: meta?.description || '',
          image_url: meta?.image_url || '',
          wiki_link: meta?.wiki_link || '',
          authorId: meta?.id || null
        };
      })
      .sort((a, bb) => {
        if (sortMode === 'name') return a.name.localeCompare(bb.name);
        return bb.count - a.count;
      });
  });

  function hexColor(token) {
    return colorValues[token] || token;
  }

  // Convert **bold** â†’ amber <strong> and *italic* â†’ cyan <em> for display
  function formatDesc(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
</script>

<div data-section="book-authors" class="authors-container">
  {#if authorSections.length === 0}
    <div class="empty-state">No authors found.</div>
  {:else}
    {#each authorSections as section}
      <div data-nav-id="author-{slugify(section.name)}">
      <Panel title={section.name} class="author-panel">
        {#snippet headerRight()}
          <span class="count-badge">{section.count} {section.count === 1 ? 'book' : 'books'}</span>
          <button type="button" class="edit-btn" onclick={() => onedit?.(section)} title="Edit author">
            <Pencil size={14} />
          </button>
          {#if ondelete}
            <button type="button" class="del-btn" onclick={() => ondelete?.(section)} title="Delete author">
              <Trash2 size={14} />
            </button>
          {/if}
        {/snippet}
        <div class="author-row" style="--row-h: {dm.rowHeight}px; --img-w: {dm.imgWidth}px; --desc-w: {dm.descWidth}px;">
          {#if section.image_url}
            <div class="author-img-col" style="border-color: {hexColor(section.color)};">
              <img src={section.image_url} alt={section.name} class="author-img" />
            </div>
          {:else}
            <div class="author-img-col placeholder" style="border-color: {hexColor(section.color)}; color: {hexColor(section.color)};">
              <Users size={32} />
            </div>
          {/if}
          {#if section.description}
            <div class="author-desc-col">
              <p class="author-desc">{@html formatDesc(section.description)}</p>
            </div>
          {/if}
          <div class="author-books-col">
            <BookCoverCarousel books={section.books} cardWidth={dm.cardWidth} onselect={onselectbook} />
          </div>
        </div>
      </Panel>
      </div>
    {/each}
  {/if}
</div>

<style>
  .authors-container { display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; overflow-y: auto; }
  :global(.author-panel) { --panel-content-bg: var(--bg-surface); --panel-header-bg: var(--bg-nav); }
  .empty-state { text-align: center; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .author-row { display: flex; gap: 14px; align-items: stretch; height: var(--row-h, 218px); background: var(--bg-surface); }
  .author-img-col { width: var(--img-w, 135px); flex-shrink: 0; border: 2px solid; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); }
  .author-img-col.placeholder { }
  .author-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .author-desc-col { width: var(--desc-w, 495px); flex-shrink: 0; display: flex; flex-direction: column; }
  .author-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; flex: 1; overflow: hidden; line-height: 1.5; padding: 0 8px 0 0; }
  .author-desc :global(strong) { color: var(--amber); font-weight: 700; font-style: normal; }
  .author-desc :global(em) { color: var(--cyan); font-weight: 600; font-style: normal; }
  .author-books-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .count-badge { padding: 0 10px; height: 24px; box-sizing: border-box; display: inline-flex; align-items: center; border-radius: var(--radius); background: rgba(255, 140, 0, 0.12); border: 1px solid var(--amber); color: var(--amber); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; white-space: nowrap; flex-shrink: 0; line-height: 1; }
  .edit-btn, .del-btn { background: none; border: 1px solid var(--amber); border-radius: var(--radius); cursor: pointer; padding: 0 6px; height: 24px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; color: var(--amber); flex-shrink: 0; transition: all 0.15s; }
  .edit-btn:hover, .del-btn:hover { background: rgba(255, 140, 0, 0.1); }
  .del-btn { border-color: var(--danger); color: var(--danger); }
  .del-btn:hover { background: rgba(239, 68, 68, 0.1) !important; }
</style>
