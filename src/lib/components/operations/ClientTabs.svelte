<script>
  let { tabs = [], active = 'story-so-far', onchange, onadd, children } = $props();

  const buttonLabels = {
    'story-so-far': '+ Entry',
    'personnel': '+ Contact',
    'meeting-notes': '+ Meeting Note',
    'tasks': '+ Task',
    'time-entries': '+ Time Entry',
    'files': '+ File',
    'activity': '+ Note'
  };

  let addLabel = $derived(buttonLabels[active] || '+ Add');
</script>

<div data-section="client-tabs" class="tab-bar">
  {#each tabs as tab}
    <button
      type="button"
      data-nav={tab.id}
      class="tab-btn"
      class:active={active === tab.id}
      onclick={() => onchange?.(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
  {#if active !== 'activity' && active !== 'codex' && active !== 'monthly-reports'}
    <div class="tab-actions">
      {#if active === 'tasks'}
        {@render children?.()}
      {/if}
      <button type="button" data-label="tab-add" class="add-btn" onclick={() => onadd?.(active)}>
        {addLabel}
      </button>
    </div>
  {/if}
</div>

<style>
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--border-glow);
    gap: 4px;
    background: var(--bg-surface);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text-dim);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tab-btn:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .tab-btn.active {
    color: #000;
    background: var(--amber);
    border-bottom-color: var(--amber);
  }

  .tab-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px;
    width: 160px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: #000;
    background: var(--amber);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-btn:hover {
    background: #ffa233;
  }
</style>
