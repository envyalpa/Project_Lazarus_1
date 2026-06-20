<script>
  import { Pencil, Trash2, CornerDownRight } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { tasks = [], onedit, ondelete, onbulkdelete } = $props();

  function rowStyle(task) {
    if (task._isSubTask) return 'border-left: 2px solid var(--amber);';
    return 'border-left: 2px solid var(--accent-cyan);';
  }

  let selectedTasks = $state([]);
  let selectAll = $state(false);

  function toggleAll() {
    selectAll = !selectAll;
    selectedTasks = selectAll ? tasks.map(t => t.id) : [];
  }

  function toggleOne(id) {
    if (selectedTasks.includes(id)) {
      selectedTasks = selectedTasks.filter(tid => tid !== id);
    } else {
      selectedTasks = [...selectedTasks, id];
    }
    selectAll = selectedTasks.length === tasks.length;
  }

  function getPhase(dueDate, status) {
    if (status === 'completed') return { label: 'Done', class: 'phase-done' };
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Overdue', class: 'phase-overdue' };
    if (diff === 0) return { label: 'Today', class: 'phase-today' };
    return { label: 'Upcoming', class: 'phase-upcoming' };
  }

  const statusLabels = {
    'not-started': 'Not Started',
    'on-hold': 'On Hold',
    'in-progress': 'In Progress',
    'internal-review': 'Internal Review',
    'external-review': 'External Review',
    'completed': 'Completed'
  };

  const statusColors = {
    'not-started': { bg: 'rgba(123, 139, 163, 0.15)', text: 'var(--text-dim)' },
    'on-hold': { bg: 'rgba(255, 140, 0, 0.15)', text: 'var(--amber)' },
    'in-progress': { bg: 'rgba(0, 212, 255, 0.15)', text: 'var(--accent-cyan)' },
    'internal-review': { bg: 'rgba(168, 85, 247, 0.15)', text: 'var(--purple)' },
    'external-review': { bg: 'rgba(0, 136, 255, 0.15)', text: 'var(--blue)' },
    'completed': { bg: 'rgba(34, 197, 94, 0.15)', text: 'var(--success)' }
  };

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDate(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
</script>

{#if selectedTasks.length > 0}
  <div data-label="multi-select-toolbar" class="multi-toolbar">
    <span class="selected-count">{selectedTasks.length} selected</span>
    <button type="button" class="bulk-delete-btn" onclick={() => { onbulkdelete?.(selectedTasks); selectedTasks = []; selectAll = false; }}>
      <Trash2 size={14} /> Delete Selected
    </button>
  </div>
{/if}

<div data-section="tasks-table" class="table-wrapper">
  <table class="tasks-table">
    <colgroup>
      <col style="width: 4%" />
      <col style="width: 25%" />
      <col style="width: 12%" />
      <col style="width: 13%" />
      <col style="width: 13%" />
      <col style="width: 9%" />
      <col style="width: 9%" />
      <col style="width: 9%" />
      <col style="width: 6%" />
    </colgroup>
    <thead>
      <tr>
        <th><input type="checkbox" checked={selectAll} onchange={toggleAll} /></th>
        <th>Task Name</th>
        <th class="th-center">Status</th>
        <th class="th-center">Client</th>
        <th class="th-center">Project</th>
        <th class="th-center">Start Date</th>
        <th class="th-center">Due Date</th>
        <th class="th-center">Phase</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each tasks as task (task.id)}
        <tr data-item={task.id} class="table-row" style={rowStyle(task)}>
          <td class="cell-check"><input type="checkbox" checked={selectedTasks.includes(task.id)} onchange={() => toggleOne(task.id)} /></td>
          <td class="cell-name">
            {#if task._isSubTask}
              <span class="subtask-indicator"><CornerDownRight size={12} /></span>
            {/if}
            <a href="/operations/tasks/{task.id}" class="task-link">{task.title}</a>
          </td>
          <td class="td-center cell-status">
            <span class="status-pill" style="background: {statusColors[task.status]?.bg || 'rgba(0,212,255,0.15)'}; color: {statusColors[task.status]?.text || 'var(--cyan)'};">{statusLabels[task.status] || task.status}</span>
          </td>
          <td class="td-center cell-client">
            {#if task.client_name}
              {@const clr = colorValues[task.client_color] || '#00d4ff'}
              <span class="badge-client" style="background: {clr}1f; color: {clr}; border: 1px solid {clr}33;">{task.client_name}</span>
            {:else}
              —
            {/if}
          </td>
          <td class="td-center cell-project">
            {#if task.project_name}
              {@const clr = colorValues[task.project_color] || '#a855f7'}
              <span class="badge-project" style="background: {clr}1f; color: {clr}; border: 1px solid {clr}33;">{task.project_name}</span>
            {:else}
              —
            {/if}
          </td>
          <td class="td-center cell-date">{formatDate(task.start_date)}</td>
          <td class="td-center cell-date">{formatDate(task.due_date)}</td>
          <td class="td-center cell-phase">
            {#if getPhase(task.due_date, task.status)}
              {@const ph = getPhase(task.due_date, task.status)}
              <span class="phase-badge {ph.class}">{ph.label}</span>
            {:else}
              <span class="phase-none">—</span>
            {/if}
          </td>
          <td class="cell-actions">
            <div class="row-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
              <button type="button" class="row-action-btn edit-btn" onclick={() => onedit?.(task)} title="Edit"><Pencil size={14} /></button>
              <button type="button" class="row-action-btn delete-btn" onclick={() => ondelete?.(task)} title="Delete"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if tasks.length === 0}
    <div class="empty-table">No tasks yet.</div>
  {/if}
</div>

<style>
  .multi-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(0,200,255,0.08); border: 1px solid var(--accent-cyan); border-radius: var(--radius); margin-bottom: 10px; }
  .selected-count { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--accent-cyan); font-weight: 600; }
  .bulk-delete-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); padding: 6px 14px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.2s; margin-left: auto; }
  .bulk-delete-btn:hover { background: rgba(239,68,68,0.1); }

  .table-wrapper { border: 1px solid var(--border); border-radius: var(--radius); overflow-y: auto; overflow-x: auto; flex: 1; min-height: 0; }
  .tasks-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); table-layout: fixed; }
  .tasks-table th { text-align: left; padding: 8px 10px; font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-card); border-bottom: 1px solid var(--border); vertical-align: middle; }
  .tasks-table th.th-center { text-align: center; }
  .tasks-table td.td-center { text-align: center; }
  .tasks-table th:first-child, .tasks-table td:first-child { padding: 8px 8px 8px 14px; width: 4%; }
  .table-row { border-bottom: 1px solid var(--border); transition: background 0.15s; background: var(--bg-surface); }
  .table-row:nth-child(even) { background: var(--bg-card); }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--bg-elevated); }
  .table-row td { padding: 8px 10px; vertical-align: middle; }
  .tasks-table th:first-child input[type="checkbox"] { display: block; margin: auto; cursor: pointer; }
  .cell-check input { display: block; margin: auto; cursor: pointer; }
  .task-link { font-weight: 600; color: var(--accent-cyan); text-decoration: none; transition: color 0.2s; }
  .task-link:hover { text-decoration: underline; color: var(--cyan); }
  .subtask-indicator { display: inline-flex; align-items: center; margin-right: 6px; color: var(--amber); vertical-align: middle; }
  .status-pill { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap; }
  .td-center { text-align: center !important; }
  .badge-client, .badge-project { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; max-width: 100%; text-overflow: ellipsis; overflow: hidden; vertical-align: middle; }
  .phase-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; padding: 2px 8px; border-radius: var(--radius); text-transform: uppercase; letter-spacing: 0.5px; }
  .phase-overdue { background: rgba(239,68,68,0.15); color: var(--danger); }
  .phase-today { background: rgba(245,158,11,0.15); color: var(--amber); }
  .phase-upcoming { background: rgba(0,200,255,0.12); color: var(--accent-cyan); }
  .phase-done { background: rgba(34,197,94,0.15); color: var(--success); }
  .phase-none { color: var(--text-muted); }
  .table-row td.cell-actions { padding: 8px; }
  .row-actions { display: flex; gap: 4px; }
  .row-action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .row-action-btn.edit-btn { color: var(--cyan); }
  .row-action-btn.edit-btn:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
  .row-action-btn.delete-btn { color: var(--danger); }
  .row-action-btn.delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .empty-table { padding: 40px; text-align: center; color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); }
</style>
