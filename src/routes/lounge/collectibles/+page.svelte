<script>
  import { Package, ChevronRight, RefreshCw } from '@lucide/svelte';
  import { invalidate } from '$app/navigation';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';

  let { data } = $props();
  let collections = $derived(data.collections);
  let refreshing = $state(false);

  async function handleRefresh() {
    refreshing = true;
    try {
      await invalidate('collectibles:collections');
      notify('Commander, collections refreshed.');
    } finally {
      refreshing = false;
    }
  }
</script>

<div data-section="collectibles-page" class="collectibles-page">
  <div class="page-toolbar">
    <div class="toolbar-tabs">
      <span class="tab-btn active"><Package size={16} /><span>Collections</span></span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="tool-btn" onclick={handleRefresh} disabled={refreshing} title="Refresh">
        <RefreshCw size={18} class={refreshing ? 'spin' : ''} />
      </button>
    </div>
  </div>

  <Panel stretch={true}>
    {#if collections.length === 0}
      <div class="empty-state" data-label="empty-state">
        <span class="empty-text">No collections yet.</span>
      </div>
    {:else}
      <div data-section="collections-grid" class="collections-grid">
        {#each collections as c (c.id)}
          <a href="/lounge/collectibles/{c.slug}" class="collection-tile" style="--tile-color: var({c.color});">
            <div class="tile-icon"><Package size={28} /></div>
            <div class="tile-body">
              <h3 class="tile-name">{c.name}</h3>
              <p class="tile-desc">{c.description}</p>
              <div class="tile-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {c.total > 0 ? (c.collected / c.total) * 100 : 0}%;"></div>
                </div>
                <span class="progress-text">{c.collected} / {c.total} collected</span>
              </div>
            </div>
            <ChevronRight size={20} class="tile-chevron" />
          </a>
        {/each}
      </div>
    {/if}
  </Panel>
</div>

<style>
  .collectibles-page { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .toolbar-tabs { display: flex; gap: 5px; background: var(--bg-bar); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px; }
  .tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 150px; height: 35px; padding: 0; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 500; color: var(--text-dim); text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border-radius: calc(var(--radius) - 1px); transition: all 0.2s; }
  .tab-btn.active { color: var(--amber); background: rgba(255, 140, 0, 0.1); }
  .toolbar-actions { display: flex; align-items: center; gap: 6px; }
  .tool-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; height: 35px; box-sizing: border-box; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s; }
  .tool-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .empty-state { display: flex; align-items: center; justify-content: center; padding: 40px; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .collections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  .collection-tile { display: flex; align-items: center; gap: 16px; padding: 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
  .collection-tile:hover { border-color: var(--tile-color); box-shadow: 0 0 12px color-mix(in srgb, var(--tile-color) 35%, transparent); }
  .tile-icon { display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; flex-shrink: 0; border-radius: var(--radius); background: color-mix(in srgb, var(--tile-color) 15%, transparent); color: var(--tile-color); }
  .tile-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .tile-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .tile-desc { font-family: var(--font-body); font-size: var(--fs-caption); color: var(--text-dim); margin: 0; line-height: 1.4; }
  .tile-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .progress-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--bg-surface); overflow: hidden; }
  .progress-fill { height: 100%; background: var(--tile-color); border-radius: 3px; }
  .progress-text { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); white-space: nowrap; }
  :global(.tile-chevron) { color: var(--text-dim); flex-shrink: 0; }
</style>
