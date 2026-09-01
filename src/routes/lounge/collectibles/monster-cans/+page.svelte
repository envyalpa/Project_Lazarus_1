<script>
  import { ArrowLeft, Filter, Minimize2, Equal, Maximize2, Package, ChevronDown, ChevronRight, LayoutGrid, Rows3, RefreshCw } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import { invalidate } from '$app/navigation';
  import { tick } from 'svelte';
  import Panel from '$lib/components/Panel.svelte';
  import QuickNavPanel from '$lib/components/lounge/QuickNavPanel.svelte';
  import CollectibleCard from '$lib/components/lounge/CollectibleCard.svelte';
  import CollectibleShelf from '$lib/components/lounge/CollectibleShelf.svelte';
  import CollectibleDetailModal from '$lib/components/lounge/CollectibleDetailModal.svelte';

  let { data } = $props();
  let items = $state(data.items);

  $effect(() => {
    items = data.items;
  });

  let statusFilter = $state('all');
  let cardDensity = $state('normal');
  let viewMode = $state('grid');
  let activeItem = $state(null);
  let collapsedCategories = $state(new Set());
  let refreshing = $state(false);

  const densityOrder = ['compact', 'normal', 'large'];

  async function handleRefresh() {
    refreshing = true;
    try {
      await invalidate('collectibles:monster-cans');
      notify('Commander, Monster Cans data refreshed.');
    } finally {
      refreshing = false;
    }
  }
  const filterOrder = ['all', 'not_collected', 'collected'];
  const filterLabels = { all: 'All', not_collected: 'Not Collected', collected: 'Collected' };

  function cycleFilter() {
    statusFilter = filterOrder[(filterOrder.indexOf(statusFilter) + 1) % filterOrder.length];
  }

  function cycleDensity() {
    cardDensity = densityOrder[(densityOrder.indexOf(cardDensity) + 1) % densityOrder.length];
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function toggleCategory(name) {
    const next = new Set(collapsedCategories);
    if (next.has(name)) next.delete(name); else next.add(name);
    collapsedCategories = next;
  }

  async function scrollToCategory(name) {
    if (collapsedCategories.has(name)) {
      const next = new Set(collapsedCategories);
      next.delete(name);
      collapsedCategories = next;
      await tick();
    }
    document.getElementById('cat-' + slugify(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let filtered = $derived(statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter));

  let categories = $derived.by(() => {
    const seen = [];
    for (const i of items) {
      if (!seen.includes(i.category)) seen.push(i.category);
    }
    return seen;
  });

  let categoryNavItems = $derived(categories.map(c => ({
    id: c,
    name: c,
    count: items.filter(i => i.category === c && i.status === 'collected').length + ' / ' + items.filter(i => i.category === c).length
  })));

  let totalCollected = $derived(items.filter(i => i.status === 'collected').length);

  async function persistItem(updated) {
    const res = await fetch('/lounge/collectibles/monster-cans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      const saved = await res.json();
      items = items.map(i => i.id === saved.id ? saved : i);
      if (activeItem?.id === saved.id) activeItem = saved;
    } else {
      notify('Error saving collectible (' + res.status + ')');
    }
  }

  function handleToggle(item) {
    persistItem({ id: item.id, status: item.status === 'collected' ? 'not_collected' : 'collected', collected_date: item.status === 'collected' ? item.collected_date : new Date().toISOString().slice(0, 10) });
  }

  async function handleDelete(item) {
    await fetch('/lounge/collectibles/monster-cans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: item.id })
    });
    items = items.filter(i => i.id !== item.id);
    notify('Commander, collectible deleted: ' + item.name);
    activeItem = null;
  }
</script>

<div data-section="monster-cans-page" class="monster-cans-page">
  <div class="page-toolbar">
    <div class="toolbar-tabs">
      <a href="/lounge/collectibles" class="tab-btn"><ArrowLeft size={16} /><span>Collections</span></a>
      <span class="tab-btn active"><Package size={16} /><span>Monster Cans</span></span>
    </div>
    <div class="toolbar-actions">
      <span class="progress-summary">{totalCollected} / {items.length} collected</span>
      <button type="button" class="tool-btn" onclick={handleRefresh} disabled={refreshing} title="Refresh">
        <RefreshCw size={18} class={refreshing ? 'spin' : ''} />
      </button>
      <button type="button" class="tool-btn filter-btn" class:filter-active={statusFilter !== 'all'} onclick={cycleFilter} title="Filter by status">
        <Filter size={18} />
        <span>{filterLabels[statusFilter]}</span>
      </button>
      <button type="button" class="tool-btn toggle-btn" class:toggle-active={viewMode === 'shelf'} onclick={() => { viewMode = viewMode === 'grid' ? 'shelf' : 'grid'; }} title={viewMode === 'grid' ? 'Switch to Shelf View' : 'Switch to Grid View'}>
        {#if viewMode === 'grid'}<LayoutGrid size={18} />{:else}<Rows3 size={18} />{/if}
      </button>
      {#if viewMode === 'grid'}
        <button type="button" class="tool-btn" onclick={cycleDensity} title="Density">
          {#if cardDensity === 'compact'}<Minimize2 size={18} />
          {:else if cardDensity === 'large'}<Maximize2 size={18} />
          {:else}<Equal size={18} />{/if}
        </button>
      {/if}
    </div>
  </div>

  <div class="content-row">
    <QuickNavPanel items={categoryNavItems} label="Categories" onselect={(item) => scrollToCategory(item.id)} />

    <div class="main-col">
      <Panel stretch={true}>
        {#if filtered.length === 0}
          <div class="empty-state" data-label="empty-state">
            <span class="empty-text">No cans match this filter.</span>
          </div>
        {:else}
          <div class="categories-list">
            {#each categories as cat (cat)}
              {@const catItems = filtered.filter(i => i.category === cat)}
              {#if catItems.length > 0}
                {@const isCollapsed = collapsedCategories.has(cat)}
                <div class="category-section" id="cat-{slugify(cat)}">
                  {#if viewMode === 'grid'}
                    <button type="button" class="category-heading" onclick={() => toggleCategory(cat)}>
                      {#if isCollapsed}<ChevronRight size={18} />{:else}<ChevronDown size={18} />{/if}
                      <span>{cat}</span>
                      <span class="category-count">{catItems.length}</span>
                    </button>
                    {#if !isCollapsed}
                      <div data-section="collectibles-grid" class="card-grid density-{cardDensity}">
                        {#each catItems as item (item.id)}
                          <CollectibleCard {item} density={cardDensity} ontoggle={handleToggle} onselect={(i) => { activeItem = i; }} />
                        {/each}
                      </div>
                    {/if}
                  {:else}
                    <CollectibleShelf items={catItems} onselect={(i) => { activeItem = i; }} label={cat} count={catItems.length} collapsed={isCollapsed} ontoggle={() => toggleCategory(cat)} />
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </Panel>
    </div>
  </div>
</div>

{#if activeItem}
  <CollectibleDetailModal item={activeItem} onsave={persistItem} ondelete={handleDelete} onclose={() => { activeItem = null; }} />
{/if}

<style>
  .monster-cans-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .toolbar-tabs { display: flex; gap: 5px; background: var(--bg-bar); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px; }
  .tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 150px; height: 35px; padding: 0; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 500; color: var(--text-dim); text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border-radius: calc(var(--radius) - 1px); transition: all 0.2s; }
  .tab-btn:hover { color: var(--amber); background: var(--bg-elevated); }
  .tab-btn.active { color: var(--amber); background: rgba(255, 140, 0, 0.1); }
  .toolbar-actions { display: flex; align-items: center; gap: 6px; }
  .progress-summary { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--success); margin-right: 4px; }
  .tool-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; height: 35px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s; }
  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .filter-btn.filter-active,
  .toggle-btn.toggle-active { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .content-row { display: flex; gap: 12px; min-height: 0; flex: 1; }
  .main-col { flex: 1; min-width: 0; display: flex; }
  .main-col :global(.panel) { flex: 1; min-width: 0; }
  .empty-state { display: flex; align-items: center; justify-content: center; padding: 40px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .categories-list { display: flex; flex-direction: column; gap: 22px; }
  .category-section { scroll-margin-top: 12px; }
  .category-heading { display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; cursor: pointer; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; border-bottom: 1px solid var(--border); padding: 0 0 8px; transition: color 0.15s; }
  .category-heading:hover { color: var(--cyan); }
  .category-count { margin-left: auto; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: none; letter-spacing: normal; }
  .card-grid { display: grid; gap: 12px; }
  .card-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .card-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .card-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
</style>
