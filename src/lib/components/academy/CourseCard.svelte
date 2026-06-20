<script>
  import { Pencil, Trash2, Calendar } from '@lucide/svelte';

  let { course, areaId, density = 'normal', onedit, ondelete } = $props();

  let hasActions = $derived(!!onedit || !!ondelete);

  const statusLabels = { 'not-started': 'Not Started', 'on-hold': 'On Hold', 'in-progress': 'In Progress', 'completed': 'Completed' };
  const statusColors = { 'not-started': 'var(--text-dim)', 'on-hold': 'var(--amber)', 'in-progress': 'var(--cyan)', 'completed': 'var(--success)' };

  function formatDate(d) {
    if (!d) return null;
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
</script>

<a href="/academy/{areaId}/course/{course.id}" class="course-card density-{density}" data-item={course.id}>
  <div class="card-cover-wrap">
    {#if course.cover_image}
      <div class="card-cover">
        <img src={course.cover_image} alt={course.name} />
      </div>
    {:else}
      <div class="card-cover card-cover-blank"></div>
    {/if}
    {#if hasActions}
      <div class="cover-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
        {#if onedit}
          <button type="button" class="act-btn edit-btn" onclick={() => onedit(course)} title="Edit">
            <Pencil size={13} />
          </button>
        {/if}
        {#if ondelete}
          <button type="button" class="act-btn delete-btn" onclick={() => ondelete(course)} title="Delete">
            <Trash2 size={13} />
          </button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="card-body">
    <h3 class="course-name">{course.name}</h3>
    {#if course.description}
      <p class="course-desc">{course.description}</p>
    {/if}
    <div class="card-footer">
      <span class="status-pill" style="color: {statusColors[course.status] || 'var(--text-dim)'}; border-color: {statusColors[course.status] || 'var(--text-dim)'};">
        {statusLabels[course.status] || course.status}
      </span>
      {#if course.started_on}
        <span class="meta-item"><Calendar size={12} /> {formatDate(course.started_on)}</span>
      {/if}
    </div>
  </div>
</a>

<style>
  .course-card {
    display: flex; flex-direction: column; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius);
    text-decoration: none; color: inherit; overflow: hidden;
    transition: all 0.2s;
  }
  .course-card:hover { border-color: var(--cyan); }

  .card-cover-wrap { position: relative; }
  .card-cover { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: var(--bg-surface); }
  .card-cover img { width: 100%; height: 100%; object-fit: cover; }
  .card-cover-blank { background: var(--bg-elevated); }

  .cover-actions {
    position: absolute; top: 6px; right: 6px; display: flex; gap: 3px;
    opacity: 0; transition: opacity 0.2s; z-index: 2;
  }
  .course-card:hover .cover-actions { opacity: 1; }

  .act-btn {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; background: rgba(5, 8, 20, 0.7);
    border: 1px solid var(--border); border-radius: var(--radius);
    cursor: pointer; color: var(--text-dim); padding: 0; transition: all 0.2s;
  }
  .edit-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }

  .card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }

  .course-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); margin: 0; }
  .course-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 4px; }
  .status-pill {
    display: inline-flex; align-items: center; padding: 2px 8px;
    border-radius: var(--radius); font-family: var(--font-body);
    font-size: var(--fs-caption); font-weight: 600; background: rgba(0,0,0,0.15);
    border: 1px solid;
  }
  .meta-item {
    display: inline-flex; align-items: center; gap: 3px;
    font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--cyan-dim);
  }

  .density-compact .card-body { padding: 6px 8px 8px; gap: 3px; }
  .density-compact .course-name { font-size: var(--fs-heading-2); }
  .density-compact .course-desc { font-size: var(--fs-body); }
  .density-compact .status-pill { font-size: var(--fs-caption); padding: 1px 6px; }

  .density-large .card-body { padding: 14px 16px 16px; gap: 6px; }
  .density-large .course-name { font-size: var(--fs-heading-2); }
  .density-large .course-desc { font-size: var(--fs-body); }
  .density-large .status-pill { font-size: var(--fs-caption); padding: 3px 10px; }
  .density-large .card-footer { padding-top: 8px; }
</style>
