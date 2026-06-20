<script>
  import { Pencil, Trash2, Plus, CornerDownRight } from '@lucide/svelte';
  import DatePicker from './DatePicker.svelte';
  import DocumentForgeEditor from './DocumentForgeEditor.svelte';
  import DynamicIcon from './DynamicIcon.svelte';

  let { task = null, clients = [], onsave, oncancel, mode = 'task', subTasks = [], onAddSubTask, onEditSubTask, onDeleteSubTask, onbreadcrumb } = $props();

  let title = $state(task?.title || '');
  let description = $state(task?.description || '');
  let status = $state(task?.status || 'not-started');
  let clientId = $state(task?.client_id || (clients.length > 0 ? clients[0].id : null));
  let projectId = $state(task?.project_id || null);
  let startDate = $state(task?.start_date || '');
  let dueDate = $state(task?.due_date || '');

  let projects = $derived(clientId ? clients.find(c => c.id === clientId)?.projects || [] : []);

  $effect(() => {
    if (!projects.find(p => p.id === projectId)) projectId = null;
  });

  $effect(() => {
    onbreadcrumb?.(title);
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onsave({
      title: title.trim(),
      description,
      status,
      client_id: clientId,
      project_id: projectId,
      start_date: startDate,
      due_date: dueDate
    });
  }

  const statusOptions = [
    { value: 'not-started', label: 'Not Started' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'internal-review', label: 'Internal Review' },
    { value: 'external-review', label: 'External Review' },
    { value: 'completed', label: 'Completed' }
  ];

  const entityLabel = $derived(mode === 'subtask' ? 'Sub-Task' : 'Task');
</script>

<form data-section="task-form" class="modal-form" onsubmit={handleSubmit}>
  <div class="modal-form-grid">
    <div class="left-col">
      <div class="title-cancel-row">
        <input type="text" class="input title-input" placeholder="{entityLabel} Title" bind:value={title} required />
        <div class="form-action-btns">
          <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
          <button type="submit" class="btn btn-save" disabled={!title.trim()}>Save</button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">Client</span>
        <select class="input select-input" bind:value={clientId}>
          <option value={null}>Select client</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <span class="field-label">Project</span>
        <select class="input select-input" bind:value={projectId}>
          <option value={null}>No project</option>
          {#each projects as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <span class="field-label">Status</span>
        <select class="input select-input" bind:value={status}>
          {#each statusOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <div class="field-row">
        <div class="field half">
          <span class="field-label">Start Date</span>
          <DatePicker value={startDate} onchange={(v) => startDate = v} />
        </div>
        <div class="field half">
          <span class="field-label">Due Date</span>
          <DatePicker value={dueDate} onchange={(v) => dueDate = v} />
        </div>
      </div>

      {#if mode === 'task'}
        <div class="section-box box-subtasks">
          <div class="box-label">Sub-Tasks</div>
          <div class="subtask-list">
            {#each subTasks as st}
              <div class="subtask-row">
                <span class="subtask-icon"><CornerDownRight size={14} color="var(--cyan-dim)" /></span>
                <span class="subtask-name">{st.title}</span>
                <span class="st-badge" class:st-completed={st.status === 'completed'} class:st-active={st.status !== 'completed'}>
                  {statusOptions.find(o => o.value === st.status)?.label || st.status}
                </span>
                <button type="button" class="mini-btn edit-mini" onclick={() => onEditSubTask?.(st)} title="Edit sub-task"><Pencil size={14} /></button>
                <button type="button" class="mini-btn delete-mini" onclick={() => onDeleteSubTask?.(st)} title="Delete sub-task"><Trash2 size={14} /></button>
              </div>
            {:else}
              <p class="empty-subtasks">No sub-tasks yet.</p>
            {/each}
            <button type="button" class="add-st-btn" onclick={onAddSubTask}>+ Add Sub-Task</button>
          </div>
        </div>
      {/if}
    </div>

    <div class="right-col">
      <div class="field field-desc">
          <span class="field-label">Description</span>
          <div class="editor-wrap">
            <DocumentForgeEditor bind:contentMarkdown={description} class="notes-inline-editor" />
          </div>
        </div>
    </div>
  </div>
</form>

<style>
  .modal-form { display: flex; flex-direction: column; }
  .modal-form-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; overflow: hidden; }
  .left-col { display: flex; flex-direction: column; gap: 16px; }
  .right-col { display: flex; flex-direction: column; }

  .title-cancel-row { display: flex; align-items: center; gap: 8px; }
  .title-input { flex: 1; }
  .form-action-btns { display: flex; gap: 6px; flex-shrink: 0; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-desc { flex: 1; min-height: 0; overflow: hidden; }
  .field-row { display: flex; gap: 12px; }
  .half { flex: 1; }

  .field-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .input, .textarea, .select-input {
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    color: var(--modal-text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 10px 14px;
    transition: all 0.2s ease-in-out;
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
  }

  .input:focus, .textarea:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }

  .select-input { cursor: pointer; padding-right: 24px; }

  .textarea { resize: vertical; min-height: 120px; flex: 1; }
  .desc-textarea { min-height: 300px; }

  .section-box { border: 1px solid var(--border-glow); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .box-subtasks { background: rgba(0, 212, 255, 0.06); }
  .box-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; text-align: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-glow); }
  .subtask-list { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
  .subtask-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: var(--radius); }
  .subtask-icon { display: flex; align-items: center; flex-shrink: 0; }
  .subtask-name { flex: 1; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; }
  .st-active { background: rgba(0,200,255,0.12); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
  .st-completed { background: rgba(34,197,94,0.12); color: var(--success); border: 1px solid var(--success); }
  .empty-subtasks { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 12px; }

  .mini-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
  .edit-mini { color: var(--accent-cyan); }
  .edit-mini:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .delete-mini { color: var(--danger); }
  .delete-mini:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }

  .add-st-btn { width: 100%; background: none; border: 1px dashed var(--modal-border); border-radius: var(--radius); padding: 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .add-st-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }

  .btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 24px;
    border-radius: var(--radius);
    border: 1px solid var(--modal-border);
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
  .editor-wrap { flex: 1; min-height: 0; border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 5px; }
  :global(.notes-inline-editor) { flex: 1; min-height: 250px; }
  :global(.notes-inline-editor .blocks-list) { padding: 10px; max-width: none; }
  :global(.notes-inline-editor .btn-add-block) { margin-top: 8px; }
</style>
