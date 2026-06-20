<script>
  import { Plus, ArrowUpDown, ArrowDownAZ, ArrowDownWideNarrow, Trash2, Search, X, Check, Minimize2, Equal, Maximize2 } from '@lucide/svelte';

  let {
    items = [], onselect, ondeletenav, label = 'Items',
    onadd, onsort, onbulkdelete, sortMode = 'default', densityValue = 'normal', ondensity
  } = $props();

  let search = $state('');
  let selectedIds = $state(new Set());

  let densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };
  let densityIcon = $derived(densityIcons[densityValue] || Equal);
  let densityLabels = { compact: 'Compact', normal: 'Normal', large: 'Large' };

  let sortIcons = { default: ArrowUpDown, name: ArrowDownAZ, count: ArrowDownWideNarrow };
  let sortIcon = $derived(sortIcons[sortMode] || ArrowUpDown);

  let filtered = $derived.by(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q));
  });

  function handleSelect(item) {
    onselect?.(item);
    search = '';
  }

  function toggleItem(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    selectedIds = next;
  }
</script>

<div data-section="quick-nav-panel" class="quick-nav">
  <div class="action-bar">
    {#if onadd}
      <button type="button" class="act-btn" onclick={onadd} title="Add {label.slice(0,-1)}"><Plus size={15} /></button>
    {/if}
    {#if onsort}
      <button type="button" class="act-btn" onclick={onsort} title="Sort by {sortMode}"><svelte:component this={sortIcon} size={15} /></button>
    {/if}
    {#if onbulkdelete}
      <button type="button" class="act-btn del" onclick={() => { if (selectedIds.size > 0) onbulkdelete?.([...selectedIds]); }} disabled={selectedIds.size === 0} title="Delete selected">
        <Trash2 size={15} />{#if selectedIds.size > 0}<span class="act-label">({selectedIds.size})</span>{/if}
      </button>
    {/if}
    {#if ondensity}
      <button type="button" class="act-btn" onclick={ondensity} title="{densityLabels[densityValue] || 'Normal'} density">
        <svelte:component this={densityIcon} size={15} />
      </button>
    {/if}
  </div>

  <div class="nav-search" data-section="nav-search">
    <div class="search-icon-wrap"><Search size={16} /></div>
    <input type="text" bind:value={search} placeholder="Search {label.toLowerCase()}..." class="search-input" />
    {#if search}
      <button type="button" class="clear-btn" onclick={() => search = ''}><X size={14} /></button>
    {/if}
  </div>

  <div class="nav-list">
    {#each filtered as item (item.id || item.name)}
      <button type="button" class="nav-item" class:selected={selectedIds.has(item.id)} onclick={() => handleSelect(item)}>
        <div role="presentation" class="cb-wrap" onclick={(e) => e.stopPropagation()}>
          {#if selectedIds.has(item.id)}
            <div class="cb-checked"><Check size={12} /></div>
          {:else}
            <div class="cb-unchecked"></div>
          {/if}
        </div>
        <span class="nav-item-name">{item.name}</span>
        {#if item.count != null}
          <span class="nav-item-count">{item.count}</span>
        {/if}
        {#if ondeletenav}
          <div role="presentation" class="nav-item-del-wrap" onclick={(e) => e.stopPropagation()}>
            <button type="button" class="nav-item-del" onclick={() => ondeletenav(item)} title="Delete {item.name}"><Trash2 size={13} /></button>
          </div>
        {/if}
      </button>
    {:else}
      <div class="nav-empty">No {label.toLowerCase()} found.</div>
    {/each}
  </div>
</div>

<style>
  .quick-nav { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; overflow: hidden; }
  .action-bar { display: flex; gap: 4px; width: 100%; }
  .act-btn { display: flex; align-items: center; justify-content: center; gap: 4px; flex: 1; height: 30px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; font-family: var(--font-caption); font-size: var(--fs-caption); padding: 0 4px; transition: all 0.15s; }
  .act-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .act-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .act-btn.del { color: var(--danger); }
  .act-btn.del:hover:not(:disabled) { border-color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .act-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40px; }
  .nav-search { display: flex; align-items: center; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .search-icon-wrap { display: flex; align-items: center; justify-content: center; width: 30px; flex-shrink: 0; color: var(--text-muted); }
  .search-input { flex: 1; padding: 7px 8px 7px 0; background: none; border: none; color: var(--text); font-family: var(--font-caption); font-size: var(--fs-caption); outline: none; }
  .search-input:focus { }
  .search-input::placeholder { color: var(--text-muted); }
  .clear-btn { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: none; background: none; color: var(--text-muted); cursor: pointer; border-radius: var(--radius); flex-shrink: 0; margin-right: 4px; }
  .clear-btn:hover { color: var(--text); background: var(--bg-elevated); }
  .nav-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
  .nav-item { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.04); border-radius: 0; cursor: pointer; color: var(--text-dim); font-family: var(--font-caption); font-size: var(--fs-caption); text-align: left; width: 100%; box-sizing: border-box; transition: all 0.1s; }
  .nav-item:last-child { border-bottom: none; }
  .nav-item:hover { background: var(--bg-elevated); color: var(--text); }
  .nav-item.selected { background: rgba(0, 212, 255, 0.04); }
  .cb-wrap { display: flex; align-items: center; flex-shrink: 0; cursor: pointer; }
  .cb-unchecked { width: 16px; height: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-surface); transition: all 0.15s; box-sizing: border-box; }
  .nav-item:hover .cb-unchecked { border-color: var(--cyan-dim); }
  .cb-checked { width: 16px; height: 16px; border: 1px solid var(--cyan); border-radius: var(--radius); background: rgba(0, 212, 255, 0.1); display: flex; align-items: center; justify-content: center; color: var(--cyan); box-sizing: border-box; }
  .nav-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .nav-item-count { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-muted); flex-shrink: 0; }
  .nav-empty { padding: 20px 10px; text-align: center; color: var(--text-muted); font-family: var(--font-caption); font-size: var(--fs-caption); }
  .nav-item-del-wrap { display: none; flex-shrink: 0; }
  .nav-item:hover .nav-item-del-wrap { display: flex; }
  .nav-item-del { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: none; background: none; color: var(--danger); cursor: pointer; border-radius: var(--radius); padding: 0; transition: all 0.15s; }
  .nav-item-del:hover { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
</style>
