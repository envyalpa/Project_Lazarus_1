<script>
  import { X, Table, LayoutGrid, ArrowUpDown, Pencil, PlusCircle, Trash2 } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import ProjectForm from '$lib/components/operations/ProjectForm.svelte';
  import ProjectCard from '$lib/components/operations/ProjectCard.svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { data: initial } = $props();
  let projects = $state(initial.projects);
  let clients = $state(initial.clients);
  let view = $state('card');
  let showModal = $state(false);
  let editingProject = $state(null);
  let sortMode = $state('default');
  let showDeleteModal = $state(false);
  let deletingProject = $state(null);
  let isNew = $derived(!editingProject);

  let sortedProjects = $derived.by(() => {
    if (sortMode === 'default' || !projects) return projects;
    const sorted = [...projects];
    if (sortMode === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'status') {
      const order = { 'not-started': 0, 'on-hold': 1, 'in-progress': 2, 'completed': 3 };
      sorted.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));
    }
    return sorted;
  });

  async function loadProjects() {
    const res = await fetch('/operations/projects');
    projects = await res.json();
  }

  function openAdd() {
    editingProject = null;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingProject = null;
  }

  function openEdit(project) {
    editingProject = project;
    showModal = true;
  }

  function openDelete(project) {
    deletingProject = project;
    showDeleteModal = true;
  }

  async function handleDelete() {
    const name = deletingProject?.name;
    await fetch('/operations/projects/' + deletingProject.id, { method: 'DELETE' });
    showDeleteModal = false;
    deletingProject = null;
    await loadProjects();
    notify(`Commander, "${name}" has been deleted.`);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) { closeModal(); showDeleteModal = false; deletingProject = null; }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') { closeModal(); showDeleteModal = false; deletingProject = null; }
  }

  async function handleSave(formData) {
    if (editingProject) {
      await fetch('/operations/projects/' + editingProject.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      notify(`Commander, "${formData.name}" has been updated.`);
    } else {
      await fetch('/operations/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      notify(`Commander, "${formData.name}" has been created.`);
    }
    closeModal();
    await loadProjects();
  }

  const statusLabels = {
    'not-started': 'Not Started',
    'on-hold': 'On Hold',
    'in-progress': 'In Progress',
    'completed': 'Completed'
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div data-label="toolbar" class="toolbar">
  <button type="button" data-label="add-project" class="btn-add" onclick={openAdd}>
    + Add Project
  </button>
  <div class="toolbar-right">
    <button type="button" data-label="sort-btn" class="sort-btn" onclick={() => { const modes = ['default', 'alphabetical', 'status']; const idx = modes.indexOf(sortMode); sortMode = modes[(idx + 1) % modes.length]; }} title="Sort">
      <ArrowUpDown size={18} />
      <span class="sort-label">{sortMode === 'default' ? 'Default' : sortMode === 'alphabetical' ? 'Name' : 'Status'}</span>
    </button>
    <div class="view-toggle">
      <button type="button" data-nav="table-view" class="toggle-btn" class:active={view === 'table'} onclick={() => view = 'table'} title="Table View"><Table size={18} /></button>
      <button type="button" data-nav="card-view" class="toggle-btn" class:active={view === 'card'} onclick={() => view = 'card'} title="Card View"><LayoutGrid size={18} /></button>
    </div>
  </div>
</div>

<div data-section="projects-page" class="projects-page">
  {#if projects.length === 0}
    <div data-label="empty-state" class="empty-state">
      <p>No projects yet. Add your first project.</p>
    </div>
  {:else if view === 'card'}
    <div data-label="card-grid" class="card-grid">
      {#each sortedProjects as project (project.id)}
        <ProjectCard {project} />
      {/each}
    </div>
  {:else}
    <div data-label="table-view" class="table-wrapper">
      <table class="project-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Client</th>
            <th>Status</th>
            <th>Tasks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedProjects as project (project.id)}
            <tr data-item={project.id} class="table-row" onclick={() => window.location.href = '/operations/projects/' + project.id}>
              <td class="cell-name">
                <DynamicIcon name="FolderKanban" size={16} color={colorValues[project.color || '--cyan']} />
                <span class="name-text">{project.name}</span>
              </td>
              <td class="cell-client">{project.client_name || '—'}</td>
              <td class="cell-status">
                <span class="status-pill">{statusLabels[project.status] || project.status}</span>
              </td>
              <td class="cell-tasks">{project.task_count ?? 0}</td>
              <td class="cell-actions">
                <div class="row-actions" role="presentation" onclick={(e) => e.stopPropagation()}>
                  <button type="button" class="row-action-btn edit-btn" onclick={() => openEdit(project)} title="Edit"><Pencil size={14} /></button>
                  <button type="button" class="row-action-btn delete-btn" onclick={() => openDelete(project)} title="Delete"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if showModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={handleBackdrop}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title" class:title-new={isNew}>{#if isNew}<PlusCircle size={20} />{:else}<Pencil size={20} />{/if}{editingProject ? 'Edit Project' : 'New Project'}</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={closeModal}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <ProjectForm project={editingProject} {clients} onsave={handleSave} oncancel={closeModal} />
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showDeleteModal = false; deletingProject = null; }}>
    <div data-section="modal" class="modal" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Project</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showDeleteModal = false; deletingProject = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <p>Are you sure you want to delete "{deletingProject?.name}"?</p>
        <div class="delete-actions">
          <button type="button" class="btn-cancel" onclick={() => { showDeleteModal = false; deletingProject = null; }}>Cancel</button>
          <button type="button" class="btn-confirm" onclick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .projects-page { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 15px 30px; background: var(--bg-surface); border-top: 1px solid var(--border-glow); border-bottom: 1px solid var(--border-glow); box-shadow: 0 1px 6px var(--cyan-glow); margin: 0 -20px 20px -20px; }
  .btn-add { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 20px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add:hover { background: rgba(0, 212, 255, 0.1); box-shadow: 0 0 12px var(--cyan-glow); }
  .toolbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .view-toggle { display: flex; gap: 4px; }
  .toggle-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .toggle-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .toggle-btn.active { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.1); }
  .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; }
  .empty-state p { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(480px, 1fr)); gap: 12px; }
  .table-wrapper { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .project-table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: var(--fs-body); }
  .project-table th { text-align: left; padding: 12px 16px; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-panel); border-bottom: 1px solid var(--border); }
  .table-row { border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--bg-elevated); }
  .table-row td { padding: 14px 16px; }
  .cell-name { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--text); }
  .cell-client { color: var(--text-dim); }
  .cell-tasks { color: var(--text-muted); font-weight: 500; }
  .status-pill { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 3px 10px; border-radius: var(--radius); background: rgba(0, 212, 255, 0.15); color: var(--cyan); }
  .sort-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); padding: 6px 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); font-size: var(--fs-body); }
  .sort-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .sort-label { font-size: var(--fs-body); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .cell-actions { width: 80px; }
  .row-actions { display: flex; gap: 4px; }
  .row-action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .row-action-btn.edit-btn { color: var(--cyan); }
  .row-action-btn.edit-btn:hover { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
  .row-action-btn.delete-btn { color: var(--danger); }
  .row-action-btn.delete-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .delete-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  .btn-cancel { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: transparent; color: var(--text-dim); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); color: var(--accent-cyan); }
  .btn-confirm { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; background: var(--danger); color: #fff; border: 1px solid var(--danger); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-confirm:hover { background: #dc2626; border-color: #dc2626; }
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
  .modal-header-title.title-new { color: var(--accent-cyan); }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
</style>
