<script>
  import { X, PlusCircle, Pencil } from '@lucide/svelte';
  import TasksTable from './TasksTable.svelte';
  import TaskForm from './TaskForm.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { tasks = [], clientId, projectId = null, clients = [], addTrigger = 0, apiBase = '', sortMode = 'default', showSubtasks = false } = $props();

  let data = $state(tasks);
  let prevAddTrigger = $state(addTrigger);

  $effect(() => {
    if (addTrigger > prevAddTrigger) { openAdd(); prevAddTrigger = addTrigger; }
  });

  $effect(() => { load(); });

  let showModal = $state(false);
  let editingTask = $state(null);
  let isNew = $derived(!editingTask);
  let showDelete = $state(false);
  let deletingTask = $state(null);

  let sortedData = $derived.by(() => {
    if (sortMode === 'default' || !data) return data;
    const sorted = [...data];
    if (sortMode === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'status') {
      const order = { 'not-started': 0, 'on-hold': 1, 'in-progress': 2, 'internal-review': 3, 'external-review': 4, 'completed': 5 };
      sorted.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    } else if (sortMode === 'newest') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.id - a.id;
      });
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        if (dateA - dateB !== 0) return dateA - dateB;
        return a.id - b.id;
      });
    }
    return sorted;
  });

  let displayData = $derived.by(() => {
    if (!showSubtasks || !sortedData) return sortedData;
    const flat = [];
    for (const task of sortedData) {
      flat.push({ ...task, _isSubTask: false });
      if (task.sub_tasks?.length > 0) {
        for (const st of task.sub_tasks) {
          flat.push({ ...st, _isSubTask: true });
        }
      }
    }
    return flat;
  });

  async function load() {
    const res = await fetch(apiBase + '/tasks');
    data = await res.json();
  }

  function openAdd() { editingTask = null; showModal = true; }
  function openEdit(task) { editingTask = task; showModal = true; }

  async function handleSave(formData) {
    if (editingTask) {
      await fetch('/operations/tasks/' + editingTask.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      notify(`Commander, "${formData.title}" has been updated.`);
      showModal = false; editingTask = null; await load();
    } else {
      const res = await fetch(apiBase + '/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      const newTask = await res.json();
      editingTask = newTask;
      notify(`Commander, "${formData.title}" has been created.`);
    }
  }

  function confirmDelete(task) { deletingTask = task; showDelete = true; }
  async function handleDelete() {
    const name = deletingTask?.title;
    await fetch('/operations/tasks/' + deletingTask.id, { method: 'DELETE' });
    showDelete = false; deletingTask = null; await load();
    notify(`Commander, "${name}" has been deleted.`);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) { showModal = false; showDelete = false; }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { showModal = false; showDelete = false; }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="scoped-tasks-view" class="scoped-tasks-view">
  <TasksTable tasks={displayData} onedit={openEdit} ondelete={confirmDelete} />
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title" class:title-new={isNew}>{#if isNew}<PlusCircle size={20} />{:else}<Pencil size={20} />{/if}{editingTask ? 'Edit Task' : 'New Task'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showModal = false; editingTask = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <TaskForm task={editingTask} {clients} onsave={handleSave} oncancel={() => { showModal = false; editingTask = null; }} />
      </div>
    </div>
  </div>
{/if}

{#if showDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Task</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showDelete = false; deletingTask = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Task" client={{ name: deletingTask?.title }} onconfirm={handleDelete} oncancel={() => { showDelete = false; deletingTask = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .scoped-tasks-view { width: 100%; flex: 1; display: flex; flex-direction: column; margin: -24px; }
  .backdrop { position: fixed; inset: 0; background: rgba(7,11,20,0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,200,255,0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-wide { max-width: 1440px; max-height: 95vh; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
  .modal-header-title.title-new { color: var(--accent-cyan); }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
