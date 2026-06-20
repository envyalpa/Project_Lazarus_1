<script>
  import { X, Plus, PlusCircle, Pencil, ArrowUpDown, Trash2, Search } from '@lucide/svelte';
  import TaskForm from '$lib/components/operations/TaskForm.svelte';
  import TasksTable from '$lib/components/operations/TasksTable.svelte';
  import StatusDashboard from '$lib/components/operations/StatusDashboard.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import ModalBreadcrumbs from '$lib/components/operations/ModalBreadcrumbs.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { data: initial } = $props();
  let tasks = $state(initial.tasks);
  let statusCounts = $state(initial.statusCounts);
  let clients = $state(initial.clients);
  let showModal = $state(false);
  let editingTask = $state(null);
  let showDeleteModal = $state(false);
  let deletingTask = $state(null);
  let showBulkDelete = $state(false);
  let bulkIds = $state([]);
  let sortMode = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('taskSortMode') || 'default' : 'default');
  let showSubtasks = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('taskShowSubtasks') === '1' : false);
  let showCompleted = $state(false);
  let searchActive = $state(false);
  let searchQuery = $state('');
  let searchRef = $state(null);

  let modalLevel = $state('task');
  let editingSubTask = $state(null);
  let subTasks = $state([]);
  let taskTitle = $state('');
  let subTaskTitle = $state('');
  let subTaskError = $state('');

  let breadcrumb = $derived.by(() => {
    if (modalLevel === 'task') {
      const label = editingTask?.id ? 'Edit Task' : 'New Task';
      return [{ label, value: taskTitle, placeholder: 'task title' }];
    } else {
      const subLabel = editingSubTask?.id ? 'Edit Sub-Task' : 'New Sub-Task';
      return [
        { label: editingTask?.id ? 'Edit Task' : 'New Task', value: taskTitle, placeholder: 'task title' },
        { label: subLabel, value: subTaskTitle, placeholder: 'sub-task title' }
      ];
    }
  });

  let modalTitle = $derived.by(() => {
    if (modalLevel === 'task') return editingTask?.id ? 'Edit Task' : 'New Task';
    return editingSubTask?.id ? 'Edit Sub-Task' : 'New Sub-Task';
  });

  let isNew = $derived.by(() => {
    if (modalLevel === 'task') return !editingTask?.id;
    return !editingSubTask?.id;
  });

  let sortedTasks = $derived.by(() => {
    if (sortMode === 'default' || !tasks) return tasks;
    const sorted = [...tasks];
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

  let displayTasks = $derived.by(() => {
    if (!sortedTasks) return sortedTasks;
    let items = sortedTasks;
    if (!showCompleted) {
      items = items.filter(t => t.status !== 'completed');
    }
    if (!showSubtasks) return items;
    const flat = [];
    for (const task of items) {
      flat.push({ ...task, _isSubTask: false });
      if (task.sub_tasks?.length > 0) {
        for (const st of task.sub_tasks) {
          if (!showCompleted && st.status === 'completed') continue;
          flat.push({ ...st, _isSubTask: true });
        }
      }
    }
    return flat;
  });

  const statusCountsDerived = $derived.by(() => {
    const counts = { 'not-started': 0, 'on-hold': 0, 'in-progress': 0, 'internal-review': 0, 'external-review': 0, 'completed': 0 };
    if (!tasks) return counts;
    for (const t of tasks) { if (counts[t.status] !== undefined) counts[t.status]++; }
    return counts;
  });

  let searchDebounce = null;
  $effect(() => {
    const q = searchQuery;
    if (!searchActive) return;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { loadTasks(); }, 300);
    return () => { if (searchDebounce) clearTimeout(searchDebounce); };
  });

  $effect(() => {
    if (searchActive && searchRef) {
      const input = searchRef.querySelector('input');
      if (input) input.focus();
    }
  });

  async function loadTasks() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    const res = await fetch('/operations/tasks?' + params.toString());
    const data = await res.json();
    tasks = data.tasks;
    statusCounts = data.statusCounts;
  }

  function enterSearch() {
    searchActive = true;
  }

  function exitSearch() {
    searchActive = false;
    searchQuery = '';
    loadTasks();
  }

  function openAdd() {
    editingTask = null;
    taskTitle = '';
    subTasks = [];
    modalLevel = 'task';
    showModal = true;
  }

  function openEdit(task) {
    window.location.href = `/operations/tasks/${task.id}`;
  }

  function openDelete(task) {
    deletingTask = task;
    showDeleteModal = true;
  }

  function closeModal() {
    showModal = false;
    editingTask = null;
    editingSubTask = null;
    subTasks = [];
    taskTitle = '';
    subTaskTitle = '';
    modalLevel = 'task';
  }

  async function handleSave(formData) {
    if (editingTask) {
      await fetch('/operations/tasks/' + editingTask.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      editingTask = { ...editingTask, ...formData };
      notify(`Commander, "${formData.title}" has been updated.`);
      closeModal();
      await loadTasks();
    } else {
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const newTask = await res.json();
      editingTask = newTask;
      taskTitle = newTask.title;
      subTasks = [];
      notify(`Commander, "${formData.title}" has been created.`);
    }
  }

  async function handleDelete() {
    const name = deletingTask?.title;
    await fetch('/operations/tasks/' + deletingTask.id, { method: 'DELETE' });
    showDeleteModal = false;
    deletingTask = null;
    await loadTasks();
    notify(`Commander, "${name}" has been deleted.`);
  }

  function openBulkDelete(ids) {
    bulkIds = ids;
    showBulkDelete = true;
  }

  async function handleBulkDelete() {
    await fetch('/operations/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk_delete: true, ids: bulkIds })
    });
    showBulkDelete = false;
    bulkIds = [];
    await loadTasks();
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) { closeModal(); showDeleteModal = false; deletingTask = null; showBulkDelete = false; }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (searchActive) { exitSearch(); return; }
      closeModal(); showDeleteModal = false; deletingTask = null; showBulkDelete = false;
    }
  }

  async function loadSubTasks(taskId) {
    if (!taskId) { subTasks = []; return; }
    const res = await fetch(`/operations/tasks/${taskId}/sub-tasks`);
    subTasks = await res.json();
  }

  function handleNavBack() {
    if (modalLevel === 'subtask') {
      modalLevel = 'task';
      subTaskTitle = '';
      editingSubTask = null;
    }
  }

  function handleNavForward() {
    if (modalLevel === 'task' && subTasks.length > 0) {
      editingSubTask = subTasks[0];
      subTaskTitle = subTasks[0].title || '';
      modalLevel = 'subtask';
    }
  }

  async function handleAddSubTask() {
    subTaskError = '';
    if (!editingTask?.id && !taskTitle.trim()) {
      subTaskError = 'Task title is required before adding sub-tasks.';
      return;
    }
    if (!editingTask?.id && taskTitle.trim()) {
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: editingTask?.description || '',
          status: editingTask?.status || 'not-started',
          client_id: editingTask?.client_id || null,
          project_id: editingTask?.project_id || null,
          start_date: editingTask?.start_date || '',
          due_date: editingTask?.due_date || null
        })
      });
      const savedTask = await res.json();
      editingTask = savedTask;
      taskTitle = savedTask.title;
    }
    editingSubTask = { client_id: editingTask?.client_id || null, project_id: editingTask?.project_id || null };
    subTaskTitle = '';
    modalLevel = 'subtask';
  }

  function handleEditSubTask(st) {
    subTaskError = '';
    editingSubTask = st;
    subTaskTitle = st.title || '';
    modalLevel = 'subtask';
  }

  async function handleDeleteSubTask(st) {
    await fetch('/operations/tasks/' + st.id, { method: 'DELETE' });
    if (editingTask) await loadSubTasks(editingTask.id);
    notify(`Commander, "${st.title}" has been deleted.`);
  }

  async function handleSubTaskSave(formData) {
    subTaskError = '';
    if (editingSubTask?.id) {
      await fetch('/operations/tasks/' + editingSubTask.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      editingSubTask = { ...editingSubTask, ...formData };
      notify(`Commander, "${formData.title}" has been updated.`);
      if (editingTask) await loadSubTasks(editingTask.id);
      modalLevel = 'task';
      editingSubTask = null;
      subTaskTitle = '';
    } else {
      let parentId = editingTask?.id || null;
      if (!parentId) {
        if (!taskTitle.trim()) {
          subTaskError = 'Task title is required.';
          return;
        }
        const res = await fetch('/operations/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description: editingTask?.description || '',
            status: editingTask?.status || 'not-started',
            client_id: editingTask?.client_id || null,
            project_id: editingTask?.project_id || null,
            start_date: editingTask?.start_date || '',
            due_date: editingTask?.due_date || null
          })
        });
        const savedTask = await res.json();
        editingTask = savedTask;
        taskTitle = savedTask.title;
        parentId = savedTask.id;
      }
      const payload = { ...formData, parent_task_id: parentId };
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newSubTask = await res.json();
      editingSubTask = newSubTask;
      subTaskTitle = newSubTask.title;
      notify(`Commander, "${formData.title}" has been created.`);
      if (editingTask) await loadSubTasks(editingTask.id);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="tasks-page" class="tasks-page">
  {#if searchActive}
    <div bind:this={searchRef} data-section="search-overlay" class="search-overlay">
      <div class="search-overlay-inner">
        <div class="search-icon-wrap">
          <Search size={18} />
        </div>
        <input
          type="text"
          class="search-input"
          placeholder="Search tasks by title..."
          bind:value={searchQuery}
          onkeydown={(e) => { if (e.key === 'Escape') exitSearch(); }}
        />
        <button type="button" class="search-close" onclick={exitSearch}>
          <X size={18} />
        </button>
      </div>
    </div>
  {:else}
  <div data-label="toolbar" class="toolbar">
    <button type="button" data-label="add-task" class="btn-add" onclick={openAdd}>
      + New Task
    </button>
    <div class="toolbar-right">
      <button type="button" data-label="show-completed" class="toggle-btn" class:active={showCompleted} onclick={() => showCompleted = !showCompleted} title="Toggle completed items">
        show completed
      </button>
      <button type="button" data-label="subtask-toggle" class="toggle-btn" class:active={showSubtasks} onclick={() => { const v = !showSubtasks; showSubtasks = v; sessionStorage.setItem('taskShowSubtasks', v ? '1' : '0'); }} title="Toggle sub-tasks">
        {showSubtasks ? 'Tasks+Sub' : 'Tasks'}
      </button>
      <button type="button" data-label="sort-btn" class="sort-btn" onclick={() => { const modes = ['default', 'alphabetical', 'status', 'newest', 'oldest']; const idx = modes.indexOf(sortMode); const next = modes[(idx + 1) % modes.length]; sortMode = next; sessionStorage.setItem('taskSortMode', next); }} title="Sort">
        <ArrowUpDown size={18} />
        <span class="sort-label">{sortMode === 'default' ? 'Default' : sortMode === 'alphabetical' ? 'Name' : sortMode === 'status' ? 'Status' : sortMode === 'newest' ? 'Newest' : 'Oldest'}</span>
      </button>
      <button type="button" data-label="search-btn" class="sort-btn search-btn" onclick={enterSearch} title="Search tasks">
        <Search size={18} />
      </button>
    </div>
  </div>
  {/if}

  <TasksTable tasks={displayTasks} onedit={openEdit} ondelete={openDelete} onbulkdelete={openBulkDelete} />

  <div class="dashboard-section">
    <StatusDashboard counts={statusCountsDerived} />
  </div>
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header-inline">
        <h3 data-label="modal-title" class="modal-header-title" class:title-new={isNew}>{#if isNew}<PlusCircle size={20} />{:else}<Pencil size={20} />{/if}{modalTitle}</h3>
        <div class="header-right">
          <ModalBreadcrumbs crumbs={breadcrumb} onback={handleNavBack} onforward={handleNavForward} hasPrev={modalLevel === 'subtask'} hasNext={modalLevel === 'task' && subTasks.length > 0} />
          <button type="button" data-label="modal-close" class="close-btn" onclick={closeModal}><X size={18} /></button>
        </div>
      </div>
      <div data-label="modal-body" class="modal-body">
        {#if subTaskError}
          <div class="modal-error">{subTaskError}</div>
        {/if}
        {#if modalLevel === 'task'}
          <TaskForm task={editingTask} {clients} subTasks={subTasks} onAddSubTask={handleAddSubTask} onEditSubTask={handleEditSubTask} onDeleteSubTask={handleDeleteSubTask} onsave={handleSave} oncancel={closeModal} onbreadcrumb={(v) => taskTitle = v} />
        {:else}
          <TaskForm task={editingSubTask} {clients} mode="subtask" onsave={handleSubTaskSave} oncancel={handleNavBack} onbreadcrumb={(v) => subTaskTitle = v} />
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showDeleteModal = false; deletingTask = null; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Task</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showDeleteModal = false; deletingTask = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Task" client={{ name: deletingTask?.title }} onconfirm={handleDelete} oncancel={() => { showDeleteModal = false; deletingTask = null; }} />
      </div>
    </div>
  </div>
{/if}

{#if showBulkDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showBulkDelete = false; bulkIds = []; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Tasks</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showBulkDelete = false; bulkIds = []; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <p>Are you sure you want to delete {bulkIds.length} selected tasks?</p>
        <div class="delete-actions">
          <button type="button" class="btn-cancel" onclick={() => { showBulkDelete = false; bulkIds = []; }}>Cancel</button>
          <button type="button" class="btn-confirm" onclick={handleBulkDelete}>Delete All</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tasks-page { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 15px 30px; background: var(--bg-surface); border-top: 1px solid var(--border-glow); border-bottom: 1px solid var(--border-glow); box-shadow: 0 1px 6px var(--cyan-glow); margin: 0 -20px 20px -20px; }
  .search-overlay {
    padding: 15px 30px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-glow);
    border-bottom: 1px solid var(--border-glow);
    box-shadow: 0 1px 6px var(--cyan-glow);
    margin: 0 -20px 20px -20px;
  }
  .search-overlay-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .search-icon-wrap {
    display: flex;
    align-items: center;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.12);
  }
  .search-input::placeholder {
    color: var(--text-muted);
  }
  .search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .search-close:hover {
    color: var(--text);
    background: var(--bg-elevated);
    border-color: var(--cyan-dim);
  }
  .search-btn {
    padding: 6px 10px;
  }
  .btn-add { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0, 212, 255, 0.1); box-shadow: 0 0 12px var(--cyan-glow); }
  .toolbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .sort-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); padding: 6px 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); font-size: var(--fs-body); }
  .sort-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .sort-label { font-size: var(--fs-body); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .toggle-btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 6px 14px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .toggle-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .toggle-btn.active { color: var(--accent-cyan); border-color: var(--accent-cyan); background: rgba(0, 212, 255, 0.1); }
  .dashboard-section { margin-top: auto; }
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-wide { max-width: 1440px; max-height: 95vh; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-inline { display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .header-right { display: flex; align-items: center; gap: 8px; margin-left: auto; min-width: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 8px; }
  .modal-header-title.title-new { color: var(--accent-cyan); }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
  .modal-error { font-family: var(--font-body); font-size: var(--fs-body); color: var(--danger); background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; }
  .delete-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  .btn-cancel { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: transparent; color: var(--text-dim); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); color: var(--accent-cyan); }
  .btn-confirm { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: var(--danger); color: #fff; border: 1px solid var(--danger); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-confirm:hover { background: #dc2626; border-color: #dc2626; }
</style>
