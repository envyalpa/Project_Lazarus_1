<script>
  import { Pencil, Trash2, FileText } from '@lucide/svelte';

  let { note, density = 'normal', areaName, courseName, onedit, ondelete } = $props();

  let hasActions = $derived(!!onedit || !!ondelete);
</script>

<a href="/academy/notes/{note.id}" class="note-card density-{density}" data-item={note.id}>
  <div class="note-info">
    <FileText size={15} />
    <div class="note-meta">
      {#if areaName || courseName}
        <div class="note-context">
          {#if areaName}<span class="context-badge area-badge">{areaName}</span>{/if}
          {#if courseName}<span class="context-badge course-badge">{courseName}</span>{/if}
        </div>
      {/if}
      <h3 class="note-title">{note.title}</h3>
    </div>
  </div>
  {#if hasActions}
    <div class="note-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
      {#if onedit}
        <button type="button" class="icon-btn edit-btn" onclick={() => onedit(note)} title="Edit">
          <Pencil size={14} />
        </button>
      {/if}
      {#if ondelete}
        <button type="button" class="icon-btn delete-btn" onclick={() => ondelete(note)} title="Delete">
          <Trash2 size={14} />
        </button>
      {/if}
    </div>
  {/if}
</a>

<style>
  .note-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius);
    transition: border-color 0.2s;
    text-decoration: none; color: inherit;
  }
  .note-card:hover { border-color: var(--cyan); }
  .note-info { flex: 1; display: flex; align-items: center; gap: 8px; }
  .note-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .note-context { display: flex; align-items: center; gap: 4px; }
  .context-badge {
    display: inline-flex; align-items: center; padding: 1px 6px;
    border-radius: var(--radius); font-family: var(--font-body);
    font-size: var(--fs-caption); font-weight: 600; letter-spacing: 0.3px;
  }
  .area-badge { background: rgba(0, 212, 255, 0.12); color: var(--cyan); border: 1px solid rgba(0, 212, 255, 0.3); }
  .course-badge { background: rgba(168, 85, 247, 0.12); color: var(--purple); border: 1px solid rgba(168, 85, 247, 0.3); }
  .note-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); margin: 0; transition: color 0.2s; }
  .note-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; background: none; border: 1px solid var(--border);
    border-radius: var(--radius); cursor: pointer; color: var(--text-dim);
    padding: 0; transition: all 0.2s;
  }
  .edit-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }

  .density-compact.note-card { padding: 6px 10px; }
  .density-compact .note-title { font-size: var(--fs-heading-2); }
  .density-large.note-card { padding: 14px 20px; }
  .density-large .note-title { font-size: var(--fs-heading-2); }
</style>
