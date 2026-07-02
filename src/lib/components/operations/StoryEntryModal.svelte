<script>
  import { X, Pencil, Plus, Link, Trash2 } from '@lucide/svelte';
  import DatePicker from './DatePicker.svelte';
  import DocumentForgeEditor from './DocumentForgeEditor.svelte';
  import DynamicIcon from './DynamicIcon.svelte';
  import { getIconForUrl } from '$lib/links.js';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { entry = null, onSave, onCancel, clientId, meetingNotes = [], projects = [], clients = [], onOpenTask, onEditTask } = $props();

  let title = $state(entry?.title || '');
  let body = $state(entry?.body || '');
  let entryDate = $state(entry?.entry_date || new Date().toISOString().split('T')[0]);
  let projectId = $state(entry?.project_id || null);
  let links = $state(entry?.links ? entry.links.map(l => l.url) : []);
  let selectedMeetingNoteIds = $state(entry?.meeting_notes ? entry.meeting_notes.map(mn => mn.id) : []);
  let tasks = $state([]);
  let entryId = $derived(entry?.id);
  let showTaskDelete = $state(false);
  let deletingTask = $state(null);

  let searchQuery = $state('');
  let showDropdown = $state(false);
  let container = $state(null);

  let filteredNotes = $derived(
    meetingNotes.filter(mn =>
      mn.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedMeetingNoteIds.includes(mn.id)
    )
  );

  const statusLabels = {
    'not-started': 'Not Started', 'on-hold': 'On Hold', 'in-progress': 'In Progress',
    'internal-review': 'Internal Review', 'external-review': 'External Review', 'completed': 'Completed'
  };

  async function loadTasks() {
    if (entryId) {
      const res = await fetch(`/operations/tasks?source_type=story_entry&source_id=${entryId}`);
      tasks = await res.json();
    }
  }

  $effect(() => { loadTasks(); });

  function addLink() {
    links = [...links, ''];
  }

  function updateLink(index, value) {
    links = links.map((l, i) => i === index ? value : l);
  }

  function removeLink(index) {
    links = links.filter((_, i) => i !== index);
  }

  function toggleMeetingNote(id) {
    if (selectedMeetingNoteIds.includes(id)) {
      selectedMeetingNoteIds = selectedMeetingNoteIds.filter(mnId => mnId !== id);
    } else {
      selectedMeetingNoteIds = [...selectedMeetingNoteIds, id];
    }
    searchQuery = '';
  }

  function removeMeetingNote(id) {
    selectedMeetingNoteIds = selectedMeetingNoteIds.filter(mnId => mnId !== id);
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

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      body,
      entry_date: entryDate,
      project_id: projectId,
      links: links.filter(l => l.trim()),
      meeting_note_ids: selectedMeetingNoteIds
    });
  }

  $effect(() => {
    if (!showDropdown) return;
    function handleClick(e) {
      if (container && !container.contains(e.target)) showDropdown = false;
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  });
</script>

<form data-section="story-entry-modal" class="modal-form" onsubmit={handleSubmit}>
  <div class="modal-form-grid">
    <div class="left-col">
      <div class="title-cancel-row">
        <input type="text" class="input title-input" placeholder="Entry Title" bind:value={title} required />
        <div class="form-action-btns">
          <button type="button" class="btn btn-cancel" onclick={onCancel}>Cancel</button>
          <button type="submit" class="btn btn-save" disabled={!title.trim()}>Save</button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">Date</span>
        <DatePicker value={entryDate} onchange={(v) => entryDate = v} />
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
        <span class="field-label">Link Meeting Notes</span>
        <div bind:this={container} class="autocomplete-wrap">
          <input type="text" class="input" placeholder="Search meeting notes..." bind:value={searchQuery} onfocus={() => showDropdown = true} oninput={() => showDropdown = true} />
          {#if showDropdown && searchQuery && filteredNotes.length > 0}
            <div class="autocomplete-dropdown">
              {#each filteredNotes as mn}
                <button type="button" class="autocomplete-item" onclick={() => toggleMeetingNote(mn.id)}>{mn.title}</button>
              {/each}
            </div>
          {/if}
        </div>
        {#if selectedMeetingNoteIds.length > 0}
          <div class="selected-tags">
            {#each selectedMeetingNoteIds as mnId}
              {@const mn = meetingNotes.find(m => m.id === mnId)}
              {#if mn}
                <span class="tag-pill">
                  {mn.title}
                  <button type="button" class="tag-remove" onclick={() => removeMeetingNote(mnId)}><X size={12} /></button>
                </span>
              {/if}
            {/each}
          </div>
        {/if}
      </div>

      <div class="section-box box-links">
        <div class="box-label">Links</div>
        {#each links as link, i}
          <div class="link-input-group">
            <span class="link-input-icon">{#if link}<DynamicIcon name={getIconForUrl(link)} size={16} color="var(--accent-cyan)" />{:else}<Link size={16} color="var(--text-dim)" />{/if}</span>
            <input type="url" class="link-inner-input" placeholder="Paste URL..." value={link} oninput={(e) => updateLink(i, e.target.value)} />
            <button type="button" class="link-group-btn remove-btn" onclick={() => removeLink(i)} title="Remove"><X size={14} /></button>
            {#if i === links.length - 1}
              <button type="button" class="link-group-btn add-btn" onclick={addLink} title="Add link"><Plus size={14} /></button>
            {/if}
          </div>
        {:else}
          <button type="button" class="add-link-btn" onclick={addLink}>+ Add Link</button>
        {/each}
      </div>

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
          <button type="button" class="add-task-btn" onclick={() => onOpenTask?.(projectId)}>+ Task</button>
        </div>
      </div>
    </div>

    <div class="right-col">
      <div class="field field-body">
          <span class="field-label">Entry Body</span>
          <div class="editor-wrap">
            <DocumentForgeEditor bind:contentMarkdown={body} class="notes-inline-editor" />
          </div>
        </div>
    </div>
  </div>
</form>

{#if showTaskDelete}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => { showTaskDelete = false; deletingTask = null; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Task</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => { showTaskDelete = false; deletingTask = null; }}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Task" item={{ name: deletingTask?.title }} warning={deletingTask?.sub_tasks?.length > 0 ? `This task has ${deletingTask.sub_tasks.length} sub-task(s) which will also be deleted.` : ''} onconfirm={confirmTaskDelete} oncancel={() => { showTaskDelete = false; deletingTask = null; }} />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-form { display: flex; flex-direction: column; }
  .modal-form-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; overflow: hidden; }
  .left-col { display: flex; flex-direction: column; gap: 16px; }
  .right-col { display: flex; flex-direction: column; }

  .title-cancel-row { display: flex; align-items: center; gap: 8px; }
  .title-input { flex: 1; }
  .form-action-btns { display: flex; gap: 6px; flex-shrink: 0; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-body { flex: 1; min-height: 0; overflow: hidden; }

  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }

  .input, .textarea, .select-input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 10px 14px; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .input:focus, .textarea:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  .select-input { cursor: pointer; padding-right: 24px; }
  .textarea { resize: vertical; min-height: 120px; flex: 1; }
  .body-textarea { min-height: 375px; }

  .autocomplete-wrap { position: relative; width: 100%; }
  .autocomplete-wrap .input { width: 100%; box-sizing: border-box; }
  .autocomplete-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; max-height: 160px; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .autocomplete-item { display: block; width: 100%; text-align: left; padding: 8px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); background: none; border: none; cursor: pointer; transition: background 0.15s; }
  .autocomplete-item:hover { background: rgba(0,200,255,0.1); }
  .selected-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag-pill { display: flex; align-items: center; gap: 4px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 500; color: var(--accent-cyan); background: rgba(0,200,255,0.1); border: 1px solid var(--accent-cyan); border-radius: var(--radius); padding: 3px 8px; }
  .tag-remove { display: flex; align-items: center; background: none; border: none; color: var(--accent-cyan); cursor: pointer; padding: 0; }

  .link-input-group {
    display: flex;
    align-items: center;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: 6px;
    color: var(--modal-text);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
    transition: all 0.2s ease-in-out;
    padding: 0 4px;
  }
  .link-input-group:focus-within {
    border-color: var(--accent-cyan);
    box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15);
  }
  .link-input-icon {
    display: flex;
    align-items: center;
    padding: 0 6px;
    flex-shrink: 0;
    color: var(--text-dim);
  }
  .link-inner-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--modal-text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 10px 6px;
    min-width: 0;
  }
  .link-inner-input::placeholder { color: var(--text-placeholder); }
  .link-group-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0;
  }
  .link-group-btn.remove-btn { color: var(--danger); }
  .link-group-btn.remove-btn:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .link-group-btn.add-btn { color: var(--accent-cyan); }
  .link-group-btn.add-btn:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .section-box { border: 1px solid var(--border-glow); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .box-links { background: rgba(255, 140, 0, 0.06); }
  .box-tasks { background: rgba(168, 85, 247, 0.06); }
  .box-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; text-align: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-glow); }
  .add-link-btn { background: none; border: 1px dashed var(--modal-border); border-radius: var(--radius); padding: 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .add-link-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }

  .tasks-field { flex: 1; }
  .tasks-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
  .task-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: var(--radius); }
  .task-name { flex: 1; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty-tasks { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-align: center; padding: 12px; }
  .status-badge { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); white-space: nowrap; }
  .badge-active { background: rgba(0,200,255,0.12); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
  .badge-completed { background: rgba(34,197,94,0.12); color: var(--success); border: 1px solid var(--success); }
  .mini-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; flex-shrink: 0; color: var(--accent-cyan); }
  .mini-btn:hover { background: rgba(0,200,255,0.1); border-color: var(--accent-cyan); }
  .delete-mini { color: var(--danger); }
  .delete-mini:hover { background: rgba(239,68,68,0.1); border-color: var(--danger); }
  .add-task-btn { width: 100%; background: none; border: 1px dashed var(--modal-border); border-radius: var(--radius); padding: 8px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .add-task-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }

  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; max-width: 480px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { width: fit-content; min-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; flex-shrink: 0; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; border-radius: var(--radius); border: 1px solid var(--modal-border); cursor: pointer; transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px; }
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
