<script>
  import { X, Pencil, PlusCircle, Trash2, ArrowLeft, Calendar, Clock, TriangleAlert, Circle, Check, CornerDownRight } from '@lucide/svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import TaskNotesEditor from '$lib/components/operations/TaskNotesEditor.svelte';
  import TimeEntriesTab from '$lib/components/operations/TimeEntriesTab.svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';
  import { notify } from '$lib/stores/notification.js';
  import LinkIcon from '$lib/components/operations/LinkIcon.svelte';
  import { getIconForUrl } from '$lib/links.js';

  let { data: initial } = $props();
  let task = $state(initial.task);
  let clients = $state(initial.clients || []);
  let files = $state(initial.files || []);
  let activeTab = $state('notes');
  let showDeleteModal = $state(false);

  let newLinkName = $state('');
  let newLinkUrl = $state('');
  let isAddingLink = $state(false);

  let isEditingTitle = $state(false);

  let editingSubTask = $state(null);
  let subTasks = $state([]);
  let subTaskTitle = $state('');
  let newSubTaskTitle = $state('');

  // Draft States
  let editedTitle = $state(task?.title || '');
  let editedDescription = $state(task?.description || '');
  let editedStatus = $state(task?.status || 'not-started');
  let editedClientId = $state(task?.client_id || null);
  let editedProjectId = $state(task?.project_id || null);
  let editedStartDate = $state(task?.start_date || '');
  let editedDueDate = $state(task?.due_date || '');
  let notesContent = $state(task?.notes || '');
  let editedParentTaskId = $state(task?.parent_task_id || null);
  let parentTasks = $state(initial.parentTasks || []);
  let parentTask = $derived(editedParentTaskId ? parentTasks.find(pt => pt.id === editedParentTaskId) : null);

  $effect(() => {
    if (task?.id) {
      loadSubTasks(task.id);
    }
  });

  $effect(() => {
    if (task) {
      editedTitle = task.title || '';
      editedDescription = task.description || '';
      editedStatus = task.status || 'not-started';
      editedClientId = task.client_id;
      editedProjectId = task.project_id;
      editedStartDate = task.start_date || '';
      editedDueDate = task.due_date || '';
      notesContent = task.notes || '';
      editedParentTaskId = task.parent_task_id || null;
    }
  });

  async function handleSaveAll() {
    if (!editedTitle.trim()) {
      notify('Task title cannot be empty.');
      return;
    }
    try {
      const payload = {
        ...task,
        title: editedTitle.trim(),
        description: editedDescription,
        status: editedStatus,
        client_id: editedClientId,
        project_id: editedProjectId,
        start_date: editedStartDate,
        due_date: editedDueDate,
        notes: notesContent,
        parent_task_id: editedParentTaskId
      };
      const res = await fetch(`/operations/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        notify('Commander, task details saved successfully.');
        await loadTask();
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to save task details.');
    }
  }

  function handleClientChange(e) {
    editedClientId = e.target.value ? parseInt(e.target.value, 10) : null;
    const newClientProjects = editedClientId ? clients.find(c => c.id === editedClientId)?.projects || [] : [];
    if (!newClientProjects.find(p => p.id === editedProjectId)) {
      editedProjectId = null;
    }
  }

  function handleProjectChange(e) {
    editedProjectId = e.target.value ? parseInt(e.target.value, 10) : null;
  }

  function handleParentChange(e) {
    const parentId = e.target.value ? parseInt(e.target.value, 10) : null;
    editedParentTaskId = parentId;
    if (parentId) {
      const parent = parentTasks.find(pt => pt.id === parentId);
      if (parent) {
        editedClientId = parent.client_id;
        editedProjectId = parent.project_id;
      }
    }
  }

  async function handleAddLink() {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    const fileType = getIconForUrl(newLinkUrl);
    try {
      const res = await fetch(`/operations/clients/${task.client_id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: `[Task: ${task.title}] ${newLinkName.trim()}`,
          link: newLinkUrl.trim(),
          file_type: fileType,
          task_id: task.id
        })
      });
      if (res.ok) {
        const newFile = await res.json();
        files = [newFile, ...files];
        newLinkName = '';
        newLinkUrl = '';
        isAddingLink = false;
        notify('Commander, new link has been added successfully.');
      } else {
        throw new Error('Failed to add link');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to add link.');
    }
  }

  async function handleDeleteLink(fileId) {
    try {
      const res = await fetch(`/operations/clients/${task.client_id}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        files = files.filter(f => f.id !== fileId);
        notify('Commander, link has been deleted.');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to delete link.');
    }
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
    'not-started': 'var(--text-dim)',
    'on-hold': 'var(--amber)',
    'in-progress': 'var(--accent-cyan)',
    'internal-review': 'var(--purple)',
    'external-review': 'var(--blue)',
    'completed': 'var(--success)'
  };

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

  const phaseIcons = { Overdue: TriangleAlert, Today: Clock, Upcoming: Calendar, Done: Circle };
  const phaseColors = {
    'phase-overdue': { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)' },
    'phase-today': { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
    'phase-upcoming': { bg: 'rgba(0,200,255,0.12)', text: 'var(--accent-cyan)' },
    'phase-done': { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)' }
  };

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) { showDeleteModal = false; }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { showDeleteModal = false; }
  }

  function startEditingTitle() {
    isEditingTitle = true;
  }

  function saveTitle() {
    isEditingTitle = false;
  }

  function handleTitleKeydown(e) {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      isEditingTitle = false;
    }
  }

  async function loadTask() {
    const res = await fetch('/operations/tasks/' + task.id);
    task = await res.json();
  }

  async function handleDelete() {
    await fetch('/operations/tasks/' + task.id, { method: 'DELETE' });
    window.location.href = '/operations/tasks';
  }

  function formatDate(d) {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  async function loadSubTasks(taskId) {
    const res = await fetch(`/operations/tasks/${taskId}/sub-tasks`);
    subTasks = await res.json();
  }

  async function handleAddSubTaskSubmit(e) {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;
    const titleVal = newSubTaskTitle.trim();
    try {
      const payload = {
        title: titleVal,
        status: 'not-started',
        client_id: task.client_id,
        project_id: task.project_id,
        parent_task_id: task.id
      };
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        newSubTaskTitle = '';
        notify(`Commander, sub-task "${titleVal}" has been created.`);
        await loadSubTasks(task.id);
      } else {
        throw new Error('Failed to create sub-task');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to add sub-task.');
    }
  }

  function startSubTaskEdit(st) {
    editingSubTask = { ...st };
    subTaskTitle = st.title || '';
  }

  function cancelSubTaskEdit() {
    editingSubTask = null;
    subTaskTitle = '';
  }

  async function saveSubTaskEdit() {
    if (!editingSubTask || !subTaskTitle.trim()) return;
    try {
      const payload = {
        title: subTaskTitle.trim(),
        status: editingSubTask.status,
        client_id: editingSubTask.client_id,
        project_id: editingSubTask.project_id
      };
      const res = await fetch(`/operations/tasks/${editingSubTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        notify(`Commander, sub-task "${payload.title}" has been updated.`);
        editingSubTask = null;
        subTaskTitle = '';
        await loadSubTasks(task.id);
      } else {
        throw new Error('Failed to update sub-task');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to update sub-task.');
    }
  }

  async function toggleSubTaskStatus(st) {
    const nextStatus = st.status === 'completed' ? 'in-progress' : 'completed';
    try {
      const payload = {
        title: st.title,
        status: nextStatus,
        client_id: st.client_id,
        project_id: st.project_id
      };
      const res = await fetch(`/operations/tasks/${st.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        notify(`Commander, sub-task "${st.title}" status updated to ${statusLabels[nextStatus]}.`);
        await loadSubTasks(task.id);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to toggle sub-task status.');
    }
  }

  async function handleDeleteSubTask(st) {
    await fetch('/operations/tasks/' + st.id, { method: 'DELETE' });
    await loadSubTasks(task.id);
    notify(`Commander, sub-task has been deleted.`);
  }

  let projects = $derived(editedClientId ? clients.find(c => c.id === editedClientId)?.projects || [] : []);
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="task-details" class="details-page">
  <div data-label="details-back" class="details-back">
    <a data-nav="back" href="/operations/tasks" class="back-link">
      <ArrowLeft size={16} /> Back to Tasks
    </a>
    <div class="back-badges">
      <span class="badge-status" style="background: {statusColors[editedStatus] || 'var(--text-dim)'}; color: #000;"><Circle size={12} />{statusLabels[editedStatus] || editedStatus}</span>
      {#if task.client_name}
        <a href="/operations/clients/{task.client_id}" class="badge-link badge-client"><DynamicIcon name={task.client_icon} size={12} color={colorValues[task.client_color]} />{task.client_name}</a>
      {/if}
      {#if task.project_name}
        <a href="/operations/projects/{task.project_id}" class="badge-link badge-project"><DynamicIcon name={task.project_icon} size={12} color={colorValues[task.project_color]} />{task.project_name}</a>
      {/if}
      {#if parentTask}
        <a href="/operations/tasks/{parentTask.id}" class="badge-link badge-parent">
          <DynamicIcon name="CheckSquare" size={12} color="var(--cyan)" />
          Sub-Task of: {parentTask.title}
        </a>
      {/if}
      {#if editedStartDate}
        <span class="badge-date"><Calendar size={12} />{formatDate(editedStartDate)}</span>
      {/if}
      {#if editedDueDate}
        <span class="badge-date"><Calendar size={12} />{formatDate(editedDueDate)}</span>
      {/if}
      {#if getPhase(editedDueDate, editedStatus)}
        {@const phase = getPhase(editedDueDate, editedStatus)}
        {@const pIcon = phaseIcons[phase.label]}
        <span class="badge-phase {phase.class}" style="background: {phaseColors[phase.class].bg}; color: {phaseColors[phase.class].text};"><svelte:component this={pIcon} size={12} />{phase.label}</span>
      {/if}
      {#if task.source_type && task.source_id}
        <span class="source-label">From {task.source_type === 'story_entry' ? 'Entry' : task.source_type === 'meeting_note' ? 'Meeting Note' : task.source_type} #{task.source_id}</span>
      {:else}
        <span class="source-placeholder">No Entries or Meeting Notes</span>
      {/if}
    </div>
  </div>

  <div data-label="task-header" class="task-header">
    <div class="header-left">
      <div class="header-info">
        {#if isEditingTitle}
          <input
            type="text"
            class="title-inline-input"
            bind:value={editedTitle}
            onblur={saveTitle}
            onkeydown={handleTitleKeydown}
            placeholder="Task Title"
            autofocus
          />
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <h1 data-label="task-title" class="task-title clickable-title" onclick={startEditingTitle} title="Click to edit title">
            {editedTitle}
          </h1>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      <button type="button" class="action-btn save-btn" onclick={handleSaveAll} title="Save All Changes">
        <Check size={18} />
      </button>
      <button type="button" data-label="delete-task" class="action-btn delete-btn" onclick={() => showDeleteModal = true} title="Delete Task">
        <Trash2 size={18} />
      </button>
    </div>
  </div>

  <div class="task-details-body">
    <!-- Left Column: Properties (25%) -->
    <div class="task-properties-panel">
      <div class="property-item">
        <span class="property-label">Description</span>
        <textarea
          bind:value={editedDescription}
          placeholder="Add description here..."
          class="property-textarea"
        ></textarea>
      </div>

      <div class="property-item">
        <span class="property-label">Status</span>
        <select bind:value={editedStatus} class="property-select">
          {#each Object.entries(statusLabels) as [val, lbl]}
            <option value={val}>{lbl}</option>
          {/each}
        </select>
      </div>

      <div class="property-item">
        <span class="property-label">Client</span>
        <select bind:value={editedClientId} onchange={handleClientChange} class="property-select">
          <option value={null}>Select Client</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>

      <div class="property-item">
        <span class="property-label">Project</span>
        <select bind:value={editedProjectId} onchange={handleProjectChange} class="property-select">
          <option value={null}>No Project</option>
          {#each projects as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>

      <div class="property-item">
        <span class="property-label">Parent Task</span>
        {#if subTasks && subTasks.length > 0}
          <div class="property-info-note">
            <TriangleAlert size={14} class="warning-icon" />
            <span>Contains sub-tasks (cannot nest)</span>
          </div>
        {:else}
          <select bind:value={editedParentTaskId} onchange={handleParentChange} class="property-select">
            <option value={null}>None (Top-Level Task)</option>
            {#each parentTasks as pt}
              <option value={pt.id}>{pt.title}</option>
            {/each}
          </select>
        {/if}
      </div>

      <div class="property-item">
        <span class="property-label">Start Date</span>
        <DatePicker value={editedStartDate} onchange={(v) => editedStartDate = v} />
      </div>

      <div class="property-item">
        <span class="property-label">Due Date</span>
        <DatePicker value={editedDueDate} onchange={(v) => editedDueDate = v} />
      </div>

      <div class="property-item links-widget">
        <div class="links-header">
          <span class="property-label">Links</span>
          <button type="button" class="add-link-btn" onclick={() => isAddingLink = !isAddingLink}>
            {isAddingLink ? 'Cancel' : '+ Add Link'}
          </button>
        </div>

        {#if isAddingLink}
          <div class="add-link-form">
            <input type="text" placeholder="Label (e.g. Doc)" bind:value={newLinkName} class="link-input" />
            <input type="text" placeholder="URL (https://...)" bind:value={newLinkUrl} class="link-input" />
            <button type="button" class="btn-save-link" onclick={handleAddLink} disabled={!newLinkName.trim() || !newLinkUrl.trim()}>
              Save
            </button>
          </div>
        {/if}

        <div class="links-list">
          {#if files.length === 0}
            <span class="no-links-text">No links added yet.</span>
          {:else}
            {#each files as f}
              <div class="link-item-row">
                <a href={f.link} target="_blank" rel="noopener" class="link-item-anchor">
                  <LinkIcon url={f.link} size={14} />
                  <span>{f.file_name.replace(`[Task: ${task.title}] `, '')}</span>
                </a>
                <button type="button" class="delete-link-btn" onclick={() => handleDeleteLink(f.id)} title="Remove Link">
                  <X size={12} />
                </button>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Right Column: Notes & Time Entries (75%) -->
    <div class="task-content-panel">
      <div class="task-tabs">
        <div data-section="task-tabs" class="tab-bar">
          <button type="button" data-nav="notes" class="tab-btn" class:active={activeTab === 'notes'} onclick={() => activeTab = 'notes'}>Notes</button>
          <button type="button" data-nav="sub-tasks" class="tab-btn" class:active={activeTab === 'sub-tasks'} onclick={() => activeTab = 'sub-tasks'}>Sub-Tasks ({subTasks.length})</button>
          <button type="button" data-nav="time-entries" class="tab-btn" class:active={activeTab === 'time-entries'} onclick={() => activeTab = 'time-entries'}>Time Entries</button>
        </div>
      </div>

      <div data-label="tab-content" class="tab-content">
        {#if activeTab === 'notes'}
          <TaskNotesEditor taskId={task.id} bind:notes={notesContent} />
        {:else if activeTab === 'sub-tasks'}
          <div data-section="subtasks-manager" class="subtasks-manager">
            <div class="subtasks-list-container">
              {#each subTasks as st}
                <div class="subtask-item-row" class:editing={editingSubTask?.id === st.id}>
                  {#if editingSubTask?.id === st.id}
                    <div class="subtask-edit-inputs">
                      <input type="text" class="input subtask-input" bind:value={subTaskTitle} />
                      <select bind:value={editingSubTask.status} class="property-select subtask-status-select">
                        <option value="not-started">Not Started</option>
                        <option value="on-hold">On Hold</option>
                        <option value="in-progress">In Progress</option>
                        <option value="internal-review">Internal Review</option>
                        <option value="external-review">External Review</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button type="button" class="btn btn-save mini-save" onclick={saveSubTaskEdit} disabled={!subTaskTitle.trim()}>Save</button>
                      <button type="button" class="btn btn-cancel mini-cancel" onclick={cancelSubTaskEdit}>Cancel</button>
                    </div>
                  {:else}
                    <div class="subtask-display-row">
                      <button type="button" class="subtask-status-checkbox" onclick={() => toggleSubTaskStatus(st)}>
                        {#if st.status === 'completed'}
                          <Circle size={16} fill="var(--success)" color="var(--success)" />
                        {:else}
                          <Circle size={16} color="var(--text-dim)" />
                        {/if}
                      </button>
                      <span class="subtask-indicator-arrow"><CornerDownRight size={14} color="var(--amber)" /></span>
                      <span class="subtask-name" class:completed={st.status === 'completed'}>{st.title}</span>
                      <span class="st-badge" class:st-completed={st.status === 'completed'} class:st-active={st.status !== 'completed'}>
                        {statusLabels[st.status] || st.status}
                      </span>
                      <div class="subtask-item-actions">
                        <button type="button" class="action-btn-mini edit-mini" onclick={() => startSubTaskEdit(st)} title="Edit Sub-Task"><Pencil size={14} /></button>
                        <button type="button" class="action-btn-mini delete-mini" onclick={() => handleDeleteSubTask(st)} title="Delete Sub-Task"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  {/if}
                </div>
              {:else}
                <div class="empty-subtasks-state">
                  <p>No sub-tasks assigned. Use the form below to create one.</p>
                </div>
              {/each}
            </div>

            <form onsubmit={handleAddSubTaskSubmit} class="add-subtask-inline-form">
              <input type="text" placeholder="New sub-task title..." bind:value={newSubTaskTitle} class="input add-subtask-input" required />
              <button type="submit" class="btn btn-save add-subtask-btn" disabled={!newSubTaskTitle.trim()}>+ Add Sub-Task</button>
            </form>
          </div>
        {:else}
          <TimeEntriesTab taskId={task.id} clientId={task.client_id} clients={clients} />
        {/if}
      </div>
    </div>
  </div>
</div>

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Task</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDeleteModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Task" client={{ name: task?.title }} onconfirm={handleDelete} oncancel={() => showDeleteModal = false} />
      </div>
    </div>
  </div>
{/if}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->

<style>
  .details-page { flex: 1; display: flex; flex-direction: column; gap: 0; margin-top: 0; border: 1px solid var(--border-glow); border-radius: var(--radius); overflow: hidden; }
  .details-back { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--bg-surface); border-bottom: 1px solid var(--border-glow); gap: 10px; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; color: var(--text-dim); text-decoration: none; transition: color 0.2s; white-space: nowrap; }
  .back-link:hover { color: var(--cyan); }
  .back-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .task-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px; background: var(--bg-panel); border-bottom: 1px solid var(--border-glow); }
  .header-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
  .header-info { min-width: 0; flex: 1; }
  .task-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); letter-spacing: 0.5px; margin: 0; }
  .badge-status { display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; padding: 3px 8px; border-radius: var(--radius); text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
  .badge-link { display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 10px; border-radius: var(--radius); text-decoration: none; line-height: 1; }
  .badge-link:hover { text-decoration: underline; }
  .badge-client { background: rgba(0, 212, 255, 0.12); color: var(--cyan); }
  .badge-project { background: rgba(168, 85, 247, 0.12); color: var(--purple); }
  .badge-parent { background: rgba(0, 212, 255, 0.08); color: var(--cyan); border: 1px solid var(--border-glow); }
  .badge-date { display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 8px; border-radius: var(--radius); background: rgba(255,255,255,0.06); color: var(--text-dim); line-height: 1; }
  .badge-phase { display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 700; padding: 3px 8px; border-radius: var(--radius); text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
  
  .property-info-note { display: flex; align-items: center; gap: 6px; font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-muted); font-style: italic; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius); padding: 8px 12px; }
  .warning-icon { color: var(--danger); }
  .source-label { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); font-style: italic; }
  .source-placeholder { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; padding: 3px 10px; border-radius: var(--radius); background: rgba(255,255,255,0.04); color: var(--text-muted); font-style: italic; display: inline-block; }
  .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .action-btn { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: none; border: 1px solid var(--text-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .save-btn { color: var(--success); }
  .save-btn:hover { background: rgba(34, 197, 94, 0.1); border-color: var(--success); }
  .delete-btn { color: var(--danger); }
  .delete-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); }

  .task-details-body { display: flex; flex: 1; min-height: 0; background: var(--bg-surface); }
  .task-properties-panel { width: 25%; border-right: 1px solid var(--border-glow); padding: 0; background: #060b16; display: flex; flex-direction: column; gap: 0; overflow-y: auto; }
  .task-content-panel { width: 75%; display: flex; flex-direction: column; min-height: 0; }

  .property-item { display: flex; flex-direction: column; gap: 6px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .property-item:last-child { border-bottom: none; }
  .property-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--cyan); }
  .property-select { width: 100%; background: var(--bg-panel); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; transition: all 0.15s; }
  .property-select:focus { border-color: var(--cyan); outline: none; box-shadow: inset 0 0 5px var(--cyan-glow); }

  .title-inline-input { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); background: var(--bg-surface); border: 1px solid var(--border-glow); border-radius: var(--radius); padding: 4px 8px; width: 100%; outline: none; box-shadow: 0 0 10px var(--cyan-glow); }
  .clickable-title { cursor: pointer; border: 1px solid transparent; border-radius: var(--radius); padding: 4px 8px; margin: -4px -8px; transition: all 0.2s; }
  .clickable-title:hover { border-color: var(--border-glow); background: rgba(0, 212, 255, 0.05); }
  .property-textarea { width: 100%; background: var(--bg-panel); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); min-height: 100px; resize: vertical; transition: all 0.15s; }
  .property-textarea:focus { border-color: var(--cyan); outline: none; box-shadow: inset 0 0 5px var(--cyan-glow); }

  .subtasks-manager { display: flex; flex-direction: column; gap: 16px; width: 100%; }
  .subtasks-list-container { display: flex; flex-direction: column; gap: 8px; }
  .subtask-item-row { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; transition: all 0.2s; }
  .subtask-item-row:hover { border-color: var(--border-glow); background: rgba(0, 212, 255, 0.02); }
  .subtask-display-row { display: flex; align-items: center; gap: 12px; width: 100%; }
  .subtask-status-checkbox { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--text-dim); transition: transform 0.1s; }
  .subtask-status-checkbox:hover { transform: scale(1.1); }
  .subtask-name { flex: 1; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); }
  .subtask-name.completed { text-decoration: line-through; color: var(--text-muted); }
  .subtask-indicator-arrow { display: inline-flex; align-items: center; flex-shrink: 0; }
  .subtask-item-actions { display: flex; gap: 6px; opacity: 0.7; transition: opacity 0.2s; }
  .subtask-item-row:hover .subtask-item-actions { opacity: 1; }
  .action-btn-mini { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .action-btn-mini.edit-mini { color: var(--accent-cyan); }
  .action-btn-mini.edit-mini:hover { background: rgba(0, 200, 255, 0.1); border-color: var(--accent-cyan); }
  .action-btn-mini.delete-mini { color: var(--danger); }
  .action-btn-mini.delete-mini:hover { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); }
  .empty-subtasks-state { padding: 24px; text-align: center; color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); border: 1px dashed var(--border); border-radius: var(--radius); }
  .add-subtask-inline-form { display: flex; gap: 8px; margin-top: 8px; }
  .add-subtask-input { flex: 1; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); }
  .add-subtask-input:focus { border-color: var(--cyan); outline: none; }
  .subtask-edit-inputs { display: flex; gap: 8px; align-items: center; width: 100%; }
  .subtask-input { flex: 2; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); }
  .subtask-input:focus { border-color: var(--cyan); outline: none; }
  .subtask-status-select { flex: 1; }
  .mini-save { padding: 8px 16px; font-size: var(--fs-body); }
  .mini-cancel { padding: 8px 16px; font-size: var(--fs-body); }

  .links-widget { border-top: none; padding-top: 16px; margin-top: 0; }
  .links-header { display: flex; align-items: center; justify-content: space-between; }
  .add-link-btn { background: transparent; border: none; color: var(--cyan); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; }
  .add-link-btn:hover { text-decoration: underline; }
  .add-link-form { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--bg-surface); border: 1px dashed var(--border); border-radius: var(--radius); margin-top: 8px; }
  .link-input { background: var(--bg-surface); border: 1px solid var(--border); color: var(--text); padding: 6px 10px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); }
  .link-input:focus { border-color: var(--cyan); outline: none; }
  .btn-save-link { background: var(--cyan); color: var(--bg-surface); border: none; padding: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; border-radius: var(--radius); text-transform: uppercase; }
  .btn-save-link:disabled { opacity: 0.5; cursor: not-allowed; }
  .links-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
  .no-links-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); font-style: italic; }
  .link-item-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .link-item-anchor { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-cyan); text-decoration: none; font-family: var(--font-body); font-size: var(--fs-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .link-item-anchor:hover { text-decoration: underline; }
  .delete-link-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 2px; border-radius: var(--radius); }
  .delete-link-btn:hover { color: var(--danger); background: rgba(239, 68, 68, 0.08); }

  .task-tabs { flex-shrink: 0; }
  .tab-bar { display: flex; border-bottom: 1px solid var(--border-glow); gap: 4px; background: var(--bg-surface); }
  .tab-btn { display: flex; align-items: center; justify-content: center; padding: 12px 20px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; color: var(--text-dim); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .tab-btn:hover { color: var(--cyan); background: var(--bg-elevated); }
  .tab-btn.active { color: #000; background: var(--amber); border-bottom-color: var(--amber); }
  .tab-content { flex: 1; display: flex; padding: 24px; background: var(--bg-surface); overflow-y: auto; }

  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 8px; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }

  .st-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; }
  .st-active { background: rgba(0,200,255,0.12); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
  .st-completed { background: rgba(34,197,94,0.12); color: var(--success); border: 1px solid var(--success); }

  .btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 24px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
