<script>
  import { Clock } from '@lucide/svelte';

  let { activity = [] } = $props();

  let data = $state(activity);

  function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  }

  function actionLabel(action) {
    const labels = { create: 'Created', update: 'Updated', delete: 'Deleted' };
    return labels[action] || action;
  }
</script>

<div data-section="activity-log" class="activity-wrap">
  {#if data.length === 0}
    <p class="empty-text">No activity recorded yet.</p>
  {:else}
    <div class="activity-list">
      {#each data as a (a.id)}
        <div class="activity-item">
          <div class="activity-icon"><Clock size={14} /></div>
          <div class="activity-content">
            <span class="activity-action">{actionLabel(a.action)}</span>
            <span class="activity-description">{a.description}</span>
          </div>
          <span class="activity-time">{formatTimestamp(a.created_at)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .activity-wrap { width: 100%; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 48px; }
  .activity-list { display: flex; flex-direction: column; }
  .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--modal-border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-icon { display: flex; align-items: center; color: var(--accent-cyan); flex-shrink: 0; }
  .activity-content { flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .activity-action { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .activity-description { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); }
  .activity-time { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); flex-shrink: 0; }
</style>
