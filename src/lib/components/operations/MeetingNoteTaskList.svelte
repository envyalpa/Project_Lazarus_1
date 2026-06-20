<script>
  import { Pencil, Trash2, X } from '@lucide/svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { noteId, projectId, clientId, onEditTask, onOpenTask, taskReloadTrigger = 0 } = $props();

  let tasks = $state([]);
  let unsourcedTaskIds = $state([]);
  let showTaskDelete = $state(false);
  let deletingTask = $state(null);

  const statusLabels = {
    'not-started': 'Not Started', 'on-hold': 'On Hold', 'in-progress': 'In Progress',
    'internal-review': 'Internal Review', 'external-review': 'External Review', 'completed': 'Completed'
  };

  async function loadTasks() {
    if (noteId) {
      const res = await fetch(`/operations/tasks?source_type=meeting_note&source_id=${noteId}`);
      tasks = await res.json();
    }
  }

  $effect(() => { loadTasks(); });
  $effect(() => { if (taskReloadTrigger) loadTasks(); });

  async function handleAddTask() {
    if (noteId) {
      onOpenTask?.(noteId, projectId);
    } else {
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task', client_id: clientId, project_id: projectId || null, status: 'not-started' })
      });
      const newTask = await res.json();
      unsourcedTaskIds = [...unsourcedTaskIds, newTask.id];
      notify(`Commander, "${newTask.title}" has been created.`);
    }
  }

  function handleTaskDelete(task) {
    deletingTask = task;
    showTaskDelete = true;
  }

  async function confirmTaskDelete() {
    if (!deletingTask) return;
    const name = deletingTask.title;
    await fetch(`/operations/tasks/${deletingTask.id}`, { method: 'DELETE' });
    showTaskDelete = false;
    deletingTask = null;
    await loadTasks();
    notify(`Commander, "${name}" has been deleted.`);
  }

  export function getUnsourcedTaskIds() {
    return unsourcedTaskIds;
  }
</script>

<div class="section-box box-tasks">
  <div class="box-label">Tasks</div>
  <div class="tasks-list">
    {#each tasks as t, i}
      <div class="task-row">
        <span class="task-name">{t.title}</span>
        <span class="badge status-badge" class:badge-completed={t.status === 'completed'} class:badge-active={t.status !== 'completed'}>
          {statusLabels[t.status] || t.status}
        </span>
        <button type="button" class="mini-btn edit-mini" onclick={() => onEditTask?.(t)} title="Edit task"><Pencil size={14} /></button>
        <button type="button" class="mini-btn delete-mini" onclick={() => handleTaskDelete(t)} title="Delete task"><Trash2 size={14} /></button>
      </div>
    {:else}
      <p class="empty-tasks">No tasks yet.</p>
    {/each}
    <button type="button" class="add-task-btn" onclick={handleAddTask}>+ Task</button>
  </div>
</div>

{#if showTaskDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showTaskDelete = false; deletingTask = null; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Task</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showTaskDelete = false; deletingTask = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Task" client={{ name: deletingTask?.title }} warning={deletingTask?.sub_tasks?.length > 0 ? `This task has ${deletingTask.sub_tasks.length} sub-task(s) which will also be deleted.` : ''} onconfirm={confirmTaskDelete} oncancel={() => { showTaskDelete = false; deletingTask = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(7,11,20,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,200,255,0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
