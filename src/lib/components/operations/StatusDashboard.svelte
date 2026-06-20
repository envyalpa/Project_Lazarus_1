<script>
  let { counts = {} } = $props();

  const blocks = [
    { key: 'not-started', label: 'Not Started', color: 'var(--text-dim)' },
    { key: 'on-hold', label: 'On Hold', color: 'var(--amber)' },
    { key: 'in-progress', label: 'In Progress', color: 'var(--accent-cyan)' },
    { key: 'internal-review', label: 'Internal Review', color: 'var(--purple)' },
    { key: 'external-review', label: 'External Review', color: 'var(--blue)' },
    { key: 'completed', label: 'Completed', color: 'var(--success)' }
  ];
</script>

<div data-section="status-dashboard" class="dashboard">
  {#each blocks as block}
    <div class="status-block" style="--block-color: {block.color};">
      <span class="block-count">{counts[block.key] ?? 0}</span>
      <span class="block-label">{block.label}</span>
    </div>
  {/each}
</div>

<style>
  .dashboard { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
  .status-block { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 20px 12px; background: var(--bg-card); border: 1px solid var(--block-color); border-radius: var(--radius); }
  .block-count { font-family: var(--font-heading-1); font-size: var(--fs-display); font-weight: 700; color: var(--block-color); line-height: 1; }
  .block-label { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
</style>
