<script>
  import { Pencil, Trash2, GraduationCap, FileText, ArrowUp, ArrowDown, Minus } from '@lucide/svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';

  let { area, density = 'normal', onedit = () => {}, ondelete = () => {} } = $props();

  let priorityLabel = $derived({ high: 'High', medium: 'Medium', low: 'Low' }[area.priority || 'medium']);
  let priorityColor = $derived({ high: 'var(--danger)', medium: 'var(--amber)', low: 'var(--text-dim)' }[area.priority || 'medium']);
  let priorityIcon = $derived({ high: ArrowUp, medium: Minus, low: ArrowDown }[area.priority || 'medium']);

  let truncatedDesc = $derived.by(() => {
    if (!area.description) return '';
    const words = area.description.split(/\s+/);
    if (words.length <= 50) return area.description;
    return words.slice(0, 50).join(' ') + '…';
  });
</script>

<a href="/academy/{area.id}" class="area-card density-{density}" data-item={area.id}>
  {#if area.cover_url}
    <div data-label="card-cover" class="card-cover">
      <img src={area.cover_url} alt={area.name} />
    </div>
  {/if}
  <div class="card-body">
    <div class="watermark">
      <DynamicIcon name={area.icon || 'GraduationCap'} size={56} color={`var(${area.color || '--cyan'})`} />
    </div>
    <div class="card-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
      <button type="button" class="act-btn edit-btn" onclick={() => onedit(area)} title="Edit">
        <Pencil size={13} />
      </button>
      <button type="button" class="act-btn delete-btn" onclick={() => ondelete(area)} title="Delete">
        <Trash2 size={13} />
      </button>
    </div>
    <h3 class="card-name">{area.name}</h3>
    {#if truncatedDesc}
      <p class="card-desc">{truncatedDesc}</p>
    {/if}
    <div class="card-footer">
      <div class="card-counts">
        <span class="card-count">
          <GraduationCap size={13} />
          {area.course_count ?? 0}
        </span>
        <span class="card-count">
          <FileText size={13} />
          {area.note_count ?? 0}
        </span>
      </div>
      <span class="priority-badge" style="color: {priorityColor}; border-color: {priorityColor};">
        <svelte:component this={priorityIcon} size={13} />
        {priorityLabel}
      </span>
    </div>
  </div>
</a>

<style>
  .area-card {
    display: flex; flex-direction: column; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius);
    text-decoration: none; color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s; overflow: hidden;
  }
  .area-card:hover { border-color: var(--cyan-dim); box-shadow: 0 0 12px var(--cyan-glow); }

  .card-cover { width: 100%; aspect-ratio: 16/9; overflow: hidden; background: var(--bg-surface); }
  .card-cover img { width: 100%; height: 100%; object-fit: cover; }

  .card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; position: relative; }

  .watermark { position: absolute; bottom: 8px; right: 8px; opacity: 0.06; pointer-events: none; z-index: 0; }
  .watermark :global(svg) { display: block; }

  .card-actions {
    position: absolute; top: 6px; right: 6px; display: flex; gap: 3px;
    opacity: 0; transition: opacity 0.2s; z-index: 2;
  }
  .area-card:hover .card-actions { opacity: 1; }

  .act-btn {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); cursor: pointer; color: var(--text-dim);
    padding: 0; transition: all 0.2s;
  }
  .edit-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }

  .card-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); margin: 0; position: relative; z-index: 1; }
  .card-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; position: relative; z-index: 1; }

  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 6px; border-top: 1px solid var(--border); position: relative; z-index: 1; }
  .card-counts { display: flex; align-items: center; gap: 10px; }
  .card-count { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--cyan-dim); font-weight: 500; }
  .priority-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border: 1px solid; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; background: rgba(0,0,0,0.15); }

  .density-compact .card-body { padding: 8px; gap: 4px; }
  .density-compact .card-name { font-size: var(--fs-heading-2); }
  .density-compact .card-desc { font-size: var(--fs-body); }
  .density-compact .card-count { font-size: var(--fs-caption); }
  .density-compact .priority-badge { font-size: var(--fs-caption); }

  .density-large .card-body { padding: 16px; gap: 8px; }
  .density-large .card-name { font-size: var(--fs-heading-2); }
  .density-large .card-desc { font-size: var(--fs-body); }
  .density-large .card-count { font-size: var(--fs-caption); }
  .density-large .card-footer { padding-top: 10px; }
  .density-large .priority-badge { font-size: var(--fs-caption); }
</style>
