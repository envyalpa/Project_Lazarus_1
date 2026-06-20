<script>
  import { Pencil, Trash2, BookMarked } from '@lucide/svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import BookCoverCarousel from './BookCoverCarousel.svelte';

  let { series = [], books = [], onselectbook, onedit, ondelete, sortMode = 'default', density = 'normal' } = $props();

  const densityMap = { compact: { cardWidth: 90, descWidth: 220 }, normal: { cardWidth: 128, descWidth: 280 }, large: { cardWidth: 176, descWidth: 360 } };
  let dm = $derived(densityMap[density] ?? densityMap.normal);

  let seriesSections = $derived.by(() => {
    const grouped = {};
    for (const b of books) {
      if (!b.series_id) continue;
      if (!grouped[b.series_id]) {
        const s = series.find(si => si.id === b.series_id);
        grouped[b.series_id] = {
          id: b.series_id,
          name: s?.name || b.series_name || 'Unknown Series',
          icon: s?.icon || 'BookMarked',
          color: s?.color || '--cyan',
          description: s?.description || '',
          books: []
        };
      }
      grouped[b.series_id].books.push(b);
    }
    return Object.values(grouped)
      .map(g => ({ ...g, count: g.books.length }))
      .sort((a, bb) => {
        if (sortMode === 'name') return a.name.localeCompare(bb.name);
        return bb.count - a.count;
      });
  });

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
</script>

<div data-section="book-series" class="series-container">
  {#if seriesSections.length === 0}
    <div class="empty-state">No series with books found.</div>
  {:else}
    {#each seriesSections as section}
      <div data-nav-id="series-{slugify(section.name)}">
        <Panel title={section.name} class="series-panel">
          {#snippet headerRight()}
            <span class="count-badge">{section.count} {section.count === 1 ? 'book' : 'books'}</span>
            <button type="button" class="edit-btn" onclick={() => onedit?.(section)} title="Edit series">
              <Pencil size={14} />
            </button>
            {#if ondelete}
              <button type="button" class="del-btn" onclick={() => ondelete?.(section)} title="Delete series">
                <Trash2 size={14} />
              </button>
            {/if}
          {/snippet}
          <div class="series-row">
            {#if section.description}
              <div class="series-desc-col" style="width: {dm.descWidth}px;">
                <p class="series-desc">{section.description}</p>
              </div>
            {/if}
            <div class="series-books-col">
              <BookCoverCarousel books={section.books} cardWidth={dm.cardWidth} onselect={onselectbook} />
            </div>
          </div>
        </Panel>
      </div>
    {/each}
  {/if}
</div>

<style>
  .series-container { display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; }
  :global(.series-panel) { --panel-content-bg: var(--bg-surface); --panel-header-bg: var(--bg-nav); }
  .empty-state { text-align: center; padding: 40px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .series-row { display: flex; gap: 14px; align-items: stretch; background: var(--bg-surface); padding: 4px 0; }
  .series-desc-col { flex-shrink: 0; display: flex; flex-direction: column; }
  .series-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; flex: 1; overflow: hidden; line-height: 1.5; padding: 0 8px 0 0; }
  .series-books-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .count-badge { padding: 0 10px; height: 24px; box-sizing: border-box; display: inline-flex; align-items: center; border-radius: var(--radius); background: rgba(0, 212, 255, 0.12); border: 1px solid var(--cyan); color: var(--cyan); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; white-space: nowrap; flex-shrink: 0; line-height: 1; }
  .edit-btn, .del-btn { background: none; border: 1px solid var(--amber); border-radius: var(--radius); cursor: pointer; padding: 0 6px; height: 24px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; color: var(--amber); flex-shrink: 0; transition: all 0.15s; }
  .edit-btn:hover, .del-btn:hover { background: rgba(255, 140, 0, 0.1); }
  .del-btn { border-color: var(--danger); color: var(--danger); }
  .del-btn:hover { background: rgba(239, 68, 68, 0.1) !important; }
</style>
