<script>
  import Panel from '$lib/components/Panel.svelte';
  import { Layers, Plus } from '@lucide/svelte';
  import SeasonRow from './SeasonRow.svelte';

  let { seasons = [], onedit, ondelete, onincrement, ondecrement, onadd, stretch = false, headerRight = null, loading = false } = $props();
</script>

<div data-section="seasons-panel">
  <Panel title="Seasons" icon={Layers} {stretch} {headerRight}>
    <div class="seasons-inner">
      <div class="season-list">
        {#if loading}
          <div class="loading-seasons">Loading seasons...</div>
        {:else if seasons.length}
          {#each seasons as s (s.id)}
            <SeasonRow
              season={s}
              onedit={(s) => onedit?.(s)}
              ondelete={(s) => ondelete?.(s)}
              onincrement={(s) => onincrement?.(s)}
              ondecrement={(s) => ondecrement?.(s)}
            />
          {/each}
        {:else}
          <div class="empty-seasons">No seasons added yet.</div>
        {/if}
      </div>
      <button type="button" class="add-season-btn" onclick={() => onadd?.()}>
        <Plus size={16} /> Add Season
      </button>
    </div>
  </Panel>
</div>

<style>
  .seasons-inner {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  div[data-section="seasons-panel"] {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  div[data-section="seasons-panel"] > :global(.panel) {
    flex: 1;
    min-height: 0;
  }

  .season-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .empty-seasons {
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    text-align: center;
    padding: 20px 0;
  }

  .loading-seasons {
    color: var(--text-muted);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    text-align: center;
    padding: 20px 0;
    opacity: 0.6;
  }

  .add-season-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: none;
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  .add-season-btn:hover {
    border-color: var(--cyan-dim);
    background: rgba(0, 212, 255, 0.04);
  }
</style>
