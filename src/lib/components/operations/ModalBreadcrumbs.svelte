<script>
  import { ChevronRight, ChevronLeft } from '@lucide/svelte';

  let { crumbs = [], onback, onforward, hasPrev = false, hasNext = false } = $props();
</script>

<div data-section="modal-breadcrumbs" class="breadcrumbs-row">
  {#if hasPrev}
    <button type="button" class="nav-arrow" onclick={onback} title="Go back">
      <ChevronLeft size={16} />
    </button>
  {/if}

  {#each crumbs as crumb, i}
    {#if i > 0}
      <span class="crumb-sep"><ChevronRight size={16} /></span>
    {/if}
    <span class="crumb-badge" class:crumb-dashed={!crumb.value}>
      {crumb.value || crumb.placeholder || crumb.label}
    </span>
  {/each}

  {#if hasNext}
    <button type="button" class="nav-arrow" onclick={onforward} title="Go forward">
      <ChevronRight size={16} />
    </button>
  {/if}
</div>

<style>
  .breadcrumbs-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    white-space: nowrap;
  }

  .crumb-badge {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 2px 10px;
    border-radius: var(--radius);
    background: rgba(0, 212, 255, 0.1);
    color: var(--cyan);
    border: 1px solid rgba(0, 212, 255, 0.3);
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .crumb-dashed {
    background: transparent;
    color: var(--text-muted);
    border: 1px dashed var(--text-muted);
  }

  .crumb-sep {
    display: inline-flex;
    align-items: center;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: none;
    border: 1px solid var(--modal-border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0;
  }

  .nav-arrow:hover {
    color: var(--cyan);
    border-color: var(--cyan-dim);
    background: rgba(0, 212, 255, 0.1);
  }
</style>
