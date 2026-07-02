<script>
  import { X, Pencil, PlusCircle, Trash2, ArrowLeft, ArrowUpDown, Sparkles } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import StoryTimeline from '$lib/components/operations/StoryTimeline.svelte';
  import StoryEntryModal from '$lib/components/operations/StoryEntryModal.svelte';
  import MeetingNotesCards from '$lib/components/operations/MeetingNotesCards.svelte';
  import ActivityLog from '$lib/components/operations/ActivityLog.svelte';
  import ProjectForm from '$lib/components/operations/ProjectForm.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import ScopedTasksView from '$lib/components/operations/ScopedTasksView.svelte';
  import ScopedTimeEntriesView from '$lib/components/operations/ScopedTimeEntriesView.svelte';
  import TaskForm from '$lib/components/operations/TaskForm.svelte';
  import ModalBreadcrumbs from '$lib/components/operations/ModalBreadcrumbs.svelte';
  import ProjectCodex from '$lib/components/operations/ProjectCodex.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { data: initial } = $props();
  let project = $state(initial.project);
  let entries = $state(initial.entries);
  let meetingNotes = $state(initial.meetingNotes);
  let clientMeetingNotes = $state(initial.clientMeetingNotes);
  let activity = $state(initial.activity);
  let client = $state(initial.client);
  let tasks = $state(initial.tasks);
  let allClients = $state(initial.clients);
  let activeTab = $state('story-so-far');
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);

  let showStoryModal = $state(false);
  let editingEntry = $state(null);
  let showStoryDelete = $state(false);
  let deletingEntry = $state(null);

  let sortMode = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('projectTaskSortMode') || 'default' : 'default');
  let showSubtasks = $state(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('projectTaskShowSubtasks') === '1' : false);
  let meetingNoteAddTrigger = $state(0);
  let taskAddTrigger = $state(0);

  let modalLevel = $state('entry');
  let editingTask = $state(null);
  let editingSubTask = $state(null);
  let subTasks = $state([]);
  let taskTitle = $state('');
  let subTaskTitle = $state('');
  let subTaskError = $state('');

  const tabs = [
    { id: 'story-so-far', label: 'Story so Far' },
    { id: 'meeting-notes', label: 'Meeting Notes' },
    { id: 'codex', label: 'Codex' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'time-entries', label: 'Time Entries' },
    { id: 'activity', label: 'Activity' }
  ];

  const statusLabels = {
    'not-started': 'Not Started',
    'on-hold': 'On Hold',
    'in-progress': 'In Progress',
    'completed': 'Completed'
  };

  const statusColors = {
    'not-started': 'var(--text-dim)',
    'on-hold': 'var(--amber)',
    'in-progress': 'var(--accent-cyan)',
    'completed': 'var(--success)'
  };

  let breadcrumb = $derived.by(() => {
    if (modalLevel === 'entry') {
      return [{ label: editingEntry?.id ? 'Edit Entry' : 'New Entry', value: editingEntry?.title || '', placeholder: 'entry title' }];
    } else if (modalLevel === 'task') {
      const label = editingTask?.id ? 'Edit Task' : 'New Task';
      return [
        { label: editingEntry?.id ? 'Edit Entry' : 'New Entry', value: editingEntry?.title || '', placeholder: 'entry title' },
        { label, value: taskTitle, placeholder: 'task title' }
      ];
    } else {
      const subLabel = editingSubTask?.id ? 'Edit Sub-Task' : 'New Sub-Task';
      return [
        { label: editingEntry?.id ? 'Edit Entry' : 'New Entry', value: editingEntry?.title || '', placeholder: 'entry title' },
        { label: editingTask?.id ? 'Edit Task' : 'New Task', value: taskTitle, placeholder: 'task title' },
        { label: subLabel, value: subTaskTitle, placeholder: 'sub-task title' }
      ];
    }
  });

  let modalTitle = $derived.by(() => {
    if (modalLevel === 'entry') return editingEntry?.id ? 'Edit Entry' : 'New Entry';
    if (modalLevel === 'task') return editingTask?.id ? 'Edit Task' : 'New Task';
    return editingSubTask?.id ? 'Edit Sub-Task' : 'New Sub-Task';
  });

  let isNew = $derived.by(() => {
    if (modalLevel === 'entry') return !editingEntry?.id;
    if (modalLevel === 'task') return !editingTask?.id;
    return !editingSubTask?.id;
  });

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) {
      showEditModal = false;
      showDeleteModal = false;
      showStoryModal = false;
      showStoryDelete = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { closeAllModals(); }
  }

  function closeAllModals() {
    showEditModal = false;
    showDeleteModal = false;
    showStoryModal = false;
    showStoryDelete = false;
    modalLevel = 'entry';
    editingTask = null;
    editingSubTask = null;
    subTasks = [];
    taskTitle = '';
    subTaskTitle = '';
  }

  function closeStoryModal() {
    showStoryModal = false;
    editingEntry = null;
    modalLevel = 'entry';
    editingTask = null;
    editingSubTask = null;
    subTasks = [];
    taskTitle = '';
    subTaskTitle = '';
  }

  async function loadProject() {
    const res = await fetch('/operations/projects/' + project.id);
    project = await res.json();
  }

  async function loadEntries() {
    const res = await fetch(`/operations/projects/${project.id}/entries`);
    entries = await res.json();
  }

  async function loadMeetingNotes() {
    const res = await fetch(`/operations/projects/${project.id}/meeting-notes`);
    meetingNotes = await res.json();
  }

  function handleAdd(tabId) {
    if (tabId === 'story-so-far') {
      editingEntry = null;
      showStoryModal = true;
      modalLevel = 'entry';
    } else if (tabId === 'meeting-notes') {
      meetingNoteAddTrigger++;
    } else if (tabId === 'tasks') {
      taskAddTrigger++;
    }
  }

  function openStoryEdit(entry) {
    editingEntry = entry;
    showStoryModal = true;
    modalLevel = 'entry';
  }

  function confirmStoryDelete(entry) {
    deletingEntry = entry;
    showStoryDelete = true;
  }

  async function handleStorySave(formData) {
    const url = editingEntry
      ? `/operations/clients/${project.client_id}/entries/${editingEntry.id}`
      : `/operations/clients/${project.client_id}/entries`;
    const method = editingEntry ? 'PUT' : 'POST';
    const payload = { ...formData, project_id: project.id };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    closeStoryModal();
    await loadEntries();
    notify(`Commander, "${formData.title}" has been ${editingEntry ? 'updated' : 'created'}.`);
  }

  async function handleStoryDelete() {
    const name = deletingEntry?.title;
    await fetch(`/operations/clients/${project.client_id}/entries/${deletingEntry.id}`, { method: 'DELETE' });
    showStoryDelete = false;
    deletingEntry = null;
    await loadEntries();
    notify(`Commander, "${name}" has been deleted.`);
  }

  async function handleEditSave(formData) {
    await fetch('/operations/projects/' + project.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    showEditModal = false;
    await loadProject();
    notify(`Commander, "${formData.name}" has been updated.`);
  }

  async function handleDelete() {
    const name = project?.name;
    await fetch('/operations/projects/' + project.id, { method: 'DELETE' });
    window.location.href = '/operations/projects';
    notify(`Commander, "${name}" has been deleted.`);
  }

  function handleOpenTask(entryProjectId) {
    editingTask = { client_id: project.client_id, project_id: entryProjectId || project.id };
    taskTitle = '';
    subTasks = [];
    modalLevel = 'task';
  }

  function handleEditTask(task) {
    editingTask = task;
    taskTitle = task.title || '';
    loadSubTasks(task.id);
    modalLevel = 'task';
  }

  async function loadSubTasks(taskId) {
    const res = await fetch(`/operations/tasks/${taskId}/sub-tasks`);
    subTasks = await res.json();
  }

  function handleNavBack() {
    if (modalLevel === 'subtask') {
      modalLevel = 'task';
      subTaskTitle = '';
      editingSubTask = null;
    } else if (modalLevel === 'task') {
      modalLevel = 'entry';
      taskTitle = '';
      editingTask = null;
      subTasks = [];
    }
  }

  function handleNavForward() {
    if (modalLevel === 'task' && subTasks.length > 0) {
      editingSubTask = subTasks[0];
      subTaskTitle = subTasks[0].title || '';
      modalLevel = 'subtask';
    }
  }

  async function handleTaskSave(formData) {
    if (editingTask?.id) {
      await fetch('/operations/tasks/' + editingTask.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      await loadSubTasks(editingTask.id);
      editingTask = { ...editingTask, ...formData };
      notify(`Commander, "${formData.title}" has been updated.`);
    } else {
      const payload = { ...formData, source_type: editingEntry?.id ? 'story_entry' : null, source_id: editingEntry?.id || null };
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newTask = await res.json();
      editingTask = newTask;
      taskTitle = newTask.title;
      subTasks = [];
      notify(`Commander, "${formData.title}" has been created.`);
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
          client_id: editingTask?.client_id || project.client_id,
          project_id: editingTask?.project_id || project.id,
          start_date: editingTask?.start_date || '',
          due_date: editingTask?.due_date || null,
          source_type: editingEntry?.id ? 'story_entry' : null,
          source_id: editingEntry?.id || null
        })
      });
      const savedTask = await res.json();
      editingTask = savedTask;
      taskTitle = savedTask.title;
    }
    editingSubTask = { client_id: project.client_id, project_id: project.id };
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
            client_id: editingTask?.client_id || project.client_id,
            project_id: editingTask?.project_id || project.id,
            start_date: editingTask?.start_date || '',
            due_date: editingTask?.due_date || null,
            source_type: editingEntry?.id ? 'story_entry' : null,
            source_id: editingEntry?.id || null
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

  let showMNTaskModal = $state(false);
  let mnEditingTask = $state(null);
  let mnCurrentNoteId = $state(null);
  let mnTaskReload = $state(0);

  function closeMNTaskModal() {
    showMNTaskModal = false;
    mnEditingTask = null;
    mnTaskReload++;
  }

  function handleMNOpenTask(noteId, noteProjectId) {
    mnCurrentNoteId = noteId || null;
    mnEditingTask = { client_id: project.client_id, project_id: noteProjectId || project.id };
    showMNTaskModal = true;
  }

  function handleMNEditTask(task) {
    mnEditingTask = task;
    showMNTaskModal = true;
  }

  async function handleMNSave(formData) {
    if (mnEditingTask?.id) {
      await fetch('/operations/tasks/' + mnEditingTask.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      mnEditingTask = { ...mnEditingTask, ...formData };
      notify(`Commander, "${formData.title}" has been updated.`);
    } else {
      const payload = { ...formData };
      if (mnCurrentNoteId) {
        payload.source_type = 'meeting_note';
        payload.source_id = mnCurrentNoteId;
      }
      const res = await fetch('/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newTask = await res.json();
      mnEditingTask = newTask;
      notify(`Commander, "${formData.title}" has been created.`);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-section="project-details" class="details-page">
  <div data-label="details-back" class="details-back">
    <a data-nav="back" href="/operations/projects" class="back-link">
      <ArrowLeft size={16} /> Back to Projects
    </a>
  </div>

  <div data-label="project-header" class="project-header">
    <div class="header-left" style="--client-color: {colorValues[project.color || '--cyan']}">
      <div class="header-icon">
        <DynamicIcon name="FolderKanban" size={32} color={colorValues[project.color || '--cyan']} />
      </div>
      <div class="header-info">
        <h1 data-label="project-name" class="project-name">{project.name}</h1>
        {#if project.description}
          <p data-label="project-desc" class="project-desc">{project.description}</p>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      <span class="header-badge status-badge" style="background: {statusColors[project.status] || 'var(--text-dim)'};">{statusLabels[project.status] || project.status}</span>
      {#if client}
        <a href="/operations/clients/{client.id}" class="header-badge client-badge">{client.name}</a>
      {/if}
      <button type="button" data-label="edit-project" class="action-btn edit-btn" onclick={() => showEditModal = true} title="Edit Project">
        <Pencil size={18} />
      </button>
      <button type="button" data-label="delete-project" class="action-btn delete-btn" onclick={() => showDeleteModal = true} title="Delete Project">
        <Trash2 size={18} />
      </button>
    </div>
  </div>

  <div class="project-tabs">
    <div data-section="client-tabs" class="tab-bar">
      {#each tabs as tab}
        <button type="button" data-nav={tab.id} class="tab-btn" class:active={activeTab === tab.id} onclick={() => activeTab = tab.id}>
          {tab.label}
        </button>
      {/each}
      {#if activeTab !== 'activity' && activeTab !== 'document-forge'}
        <div class="tab-actions">
          {#if activeTab === 'tasks'}
            <button type="button" data-label="subtask-toggle" class="task-toggle-btn" class:active={showSubtasks} onclick={() => { const v = !showSubtasks; showSubtasks = v; sessionStorage.setItem('projectTaskShowSubtasks', v ? '1' : '0'); }} title="Toggle sub-tasks">{showSubtasks ? 'Tasks+Sub' : 'Tasks'}</button>
            <button type="button" data-label="sort-btn" class="task-sort-btn" onclick={() => { const modes = ['default', 'alphabetical', 'status', 'newest', 'oldest']; const idx = modes.indexOf(sortMode); const next = modes[(idx + 1) % modes.length]; sortMode = next; sessionStorage.setItem('projectTaskSortMode', next); }} title="Sort"><ArrowUpDown size={16} /><span class="sort-label">{sortMode === 'default' ? 'Default' : sortMode === 'alphabetical' ? 'Name' : sortMode === 'status' ? 'Status' : sortMode === 'newest' ? 'Newest' : 'Oldest'}</span></button>
          {/if}
          <button type="button" data-label="tab-add" class="add-btn" onclick={() => handleAdd(activeTab)}>
            {activeTab === 'story-so-far' ? '+ Entry' : activeTab === 'meeting-notes' ? '+ Meeting Note' : activeTab === 'tasks' ? '+ Task' : '+ Time Entry'}
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div data-label="tab-content" class="tab-content">
    {#if activeTab === 'story-so-far'}
      <StoryTimeline {entries} clientId={project.client_id} onedit={openStoryEdit} ondelete={confirmStoryDelete} />
    {:else if activeTab === 'meeting-notes'}
      <MeetingNotesCards meetingNotes={meetingNotes} clientId={project.client_id} addTrigger={meetingNoteAddTrigger} apiBase={"/operations/projects/" + project.id} clients={allClients} onOpenTask={handleMNOpenTask} onEditTask={handleMNEditTask} taskReloadTrigger={mnTaskReload} />
    {:else if activeTab === 'codex'}
      <ProjectCodex {project} oncompile={loadProject} />
    {:else if activeTab === 'tasks'}
      <ScopedTasksView tasks={tasks} clientId={project.client_id} projectId={project.id} clients={allClients} addTrigger={taskAddTrigger} apiBase={"/operations/projects/" + project.id} {sortMode} {showSubtasks} />
    {:else if activeTab === 'time-entries'}
      <ScopedTimeEntriesView apiBase={"/operations/projects/" + project.id} clients={allClients} tasks={tasks} filterProjectId={project.id} filterClientId={project.client_id} />
    {:else if activeTab === 'activity'}
      <ActivityLog {activity} />
    {/if}
  </div>
</div>

{#if showEditModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Edit Project</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showEditModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <ProjectForm project={project} hideClient onsave={handleEditSave} oncancel={() => showEditModal = false} />
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Project</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDeleteModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Project" item={{ name: project?.name }} onconfirm={handleDelete} oncancel={() => showDeleteModal = false} />
      </div>
    </div>
  </div>
{/if}

{#if showStoryModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header-inline">
        <h3 data-label="modal-title" class="modal-header-title" class:title-new={isNew}>{#if isNew}<PlusCircle size={20} />{:else}<Pencil size={20} />{/if}{modalTitle}</h3>
        <div class="header-right">
          <ModalBreadcrumbs crumbs={breadcrumb} onback={handleNavBack} onforward={handleNavForward} hasPrev={modalLevel !== 'entry'} hasNext={modalLevel === 'task' && subTasks.length > 0} />
          <button type="button" data-label="modal-close" class="close-btn" onclick={closeStoryModal}><X size={18} /></button>
        </div>
      </div>
      <div data-label="modal-body" class="modal-body">
        {#if subTaskError}
          <div class="modal-error">{subTaskError}</div>
        {/if}
        {#if modalLevel === 'entry'}
          <StoryEntryModal entry={editingEntry} onSave={handleStorySave} onCancel={closeStoryModal} clientId={project.client_id} meetingNotes={clientMeetingNotes} projects={[project]} clients={allClients} onOpenTask={handleOpenTask} onEditTask={handleEditTask} />
        {:else if modalLevel === 'task'}
          <TaskForm task={editingTask} clients={allClients} subTasks={subTasks} onAddSubTask={handleAddSubTask} onEditSubTask={handleEditSubTask} onDeleteSubTask={handleDeleteSubTask} onsave={handleTaskSave} oncancel={handleNavBack} onbreadcrumb={(v) => taskTitle = v} />
        {:else if modalLevel === 'subtask'}
          <TaskForm task={editingSubTask} clients={allClients} mode="subtask" onsave={handleSubTaskSave} oncancel={handleNavBack} onbreadcrumb={(v) => subTaskTitle = v} />
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showMNTaskModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeMNTaskModal(); }}>
    <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header-inline">
        <h3 data-label="modal-title" class="modal-header-title" class:title-new={!mnEditingTask?.id}>{#if !mnEditingTask?.id}<PlusCircle size={20} />{:else}<Pencil size={20} />{/if}{mnEditingTask?.id ? 'Edit Task' : 'New Task'}</h3>
        <div class="header-right">
          <button type="button" data-label="modal-close" class="close-btn" onclick={closeMNTaskModal}><X size={18} /></button>
        </div>
      </div>
      <div data-label="modal-body" class="modal-body">
        <TaskForm task={mnEditingTask} clients={allClients} onsave={handleMNSave} oncancel={closeMNTaskModal} />
      </div>
    </div>
  </div>
{/if}

{#if showStoryDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Entry</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showStoryDelete = false; deletingEntry = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Entry" item={{ name: deletingEntry?.title }} onconfirm={handleStoryDelete} oncancel={() => { showStoryDelete = false; deletingEntry = null; }} />
      </div>
    </div>
  </div>
{/if}


<style>
  .details-page { flex: 1; display: flex; flex-direction: column; gap: 0; margin-top: 0; border: 1px solid var(--border-glow); border-radius: var(--radius); overflow: hidden; }
  .details-back { padding: 10px; background: var(--bg-surface); border-bottom: 1px solid var(--border-glow); }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; color: var(--text-dim); text-decoration: none; transition: color 0.2s; }
  .back-link:hover { color: var(--cyan); }
  .project-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px; background: var(--bg-panel); border-bottom: 1px solid var(--border-glow); }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-icon { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: var(--bg-elevated); border: 1px solid var(--client-color); border-radius: var(--radius); flex-shrink: 0; }
  .header-info { min-width: 0; }
  .project-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); letter-spacing: 0.5px; margin: 0; }
  .project-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin-top: 2px; }

  .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .action-btn { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: none; border: 1px solid var(--text-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .edit-btn { color: var(--cyan); }
  .edit-btn:hover { background: rgba(0, 212, 255, 0.1); border-color: var(--accent-cyan); }
  .delete-btn { color: var(--danger); }
  .delete-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); }
  .header-badge { display: inline-flex; align-items: center; height: 38px; padding: 0 14px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; white-space: nowrap; box-sizing: border-box; }
  .status-badge.header-badge { color: #000; text-transform: uppercase; letter-spacing: 0.5px; }
  .client-badge { background: rgba(0, 212, 255, 0.12); color: var(--cyan); text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
  .client-badge:hover { border-color: var(--accent-cyan); background: rgba(0, 212, 255, 0.2); }
  .project-tabs { flex-shrink: 0; }
  .tab-bar { display: flex; border-bottom: 1px solid var(--border-glow); gap: 4px; background: var(--bg-surface); }
  .tab-btn { display: flex; align-items: center; justify-content: center; padding: 12px 20px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 500; color: var(--text-dim); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .tab-btn:hover { color: var(--cyan); background: var(--bg-elevated); }
  .tab-btn.active { color: #000; background: var(--amber); border-bottom-color: var(--amber); }
  .tab-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .add-btn { display: flex; align-items: center; justify-content: center; padding: 12px 20px; width: 160px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: #000; background: var(--amber); border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .add-btn:hover { background: #ffa233; }
  .task-toggle-btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 6px 14px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .task-toggle-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .task-toggle-btn.active { color: var(--accent-cyan); border-color: var(--accent-cyan); background: rgba(0, 212, 255, 0.1); }
  .task-sort-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); padding: 6px 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); font-size: var(--fs-body); white-space: nowrap; }
  .task-sort-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .tab-content { flex: 1; display: flex; padding: 24px; background: var(--bg-surface); overflow-y: auto; }
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

  .document-forge-tab-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
  }

  .forge-launcher-pane {
    flex-shrink: 0;
  }

  .launcher-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px 20px;
    text-align: center;
    gap: 16px;
  }

  .launcher-desc {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    max-width: 600px;
    margin: 0;
  }

  .btn-launch-forge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: #fff;
    background: var(--cyan);
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-launch-forge:hover {
    box-shadow: 0 0 15px var(--cyan-glow);
    background: #33ddff;
  }
</style>
