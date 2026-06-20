<script>
  import { X } from '@lucide/svelte';
  import DatePicker from './DatePicker.svelte';

  function localDateStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  let { entry = null, onsave, oncancel, tasks = [], clients = [] } = $props();

  let title = $state(entry?.title || '');
  let startTime = $state(entry?.start_time || '');
  let endTime = $state(entry?.end_time || '');
  let entryDate = $state(entry?.date || localDateStr());
  let taskId = $state(entry?.task_id || null);
  let clientId = $state(entry?.client_id || null);
  let projectId = $state(entry?.project_id || null);
  let description = $state(entry?.description || '');

  let taskSearch = $state('');
  let showTaskDropdown = $state(false);

  let filteredTasks = $derived(
    tasks.filter(t =>
      t.title.toLowerCase().includes(taskSearch.toLowerCase())
    ).slice(0, 10)
  );

  let totalTime = $derived.by(() => {
    if (!startTime || !endTime) return '';
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) return 'Invalid';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  });

  let selectedTask = $derived(tasks.find(t => t.id === taskId));
  let selectedClientName = $derived(clients.find(c => c.id === clientId)?.name || '');
  let filteredProjects = $derived(
    clientId ? clients.find(c => c.id === clientId)?.projects || [] : []
  );
  let selectedProjectName = $derived(filteredProjects.find(p => p.id === projectId)?.name || '');

  function formatTimeInput(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 3) {
      return digits.slice(0, 2) + ':' + digits.slice(2, 4);
    }
    return value;
  }

  function handleTimeInput(field, e) {
    const raw = e.target.value;
    const formatted = formatTimeInput(raw);
    if (field === 'start') startTime = formatted;
    else endTime = formatted;
  }

  function handleTimeBlur(field, e) {
    const raw = e.target.value.trim();
    const match = raw.match(/^(\d{1,2})(:?)(\d{0,2})$/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = (match[3] || '00').padStart(2, '0');
      const formatted = `${h}:${m}`;
      if (field === 'start') startTime = formatted;
      else endTime = formatted;
    }
  }

  function handleTaskSelect(task) {
    taskId = task.id;
    clientId = task.client_id || null;
    projectId = task.project_id || null;
    taskSearch = '';
    showTaskDropdown = false;
  }

  function clearTask() {
    taskId = null;
    taskSearch = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() && !startTime) return;
    onsave({
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      date: entryDate,
      task_id: taskId,
      client_id: clientId,
      project_id: projectId,
      description: description.trim()
    });
  }
</script>

<form data-section="time-entry-modal" class="modal-form" onsubmit={handleSubmit}>
  <div class="form-grid">
    <div class="left-col">
      <div class="field">
        <span class="field-label">Title</span>
        <input type="text" class="input" placeholder="Time entry title" bind:value={title} required />
      </div>
      <div class="field-row">
        <div class="field half">
          <span class="field-label">Start Time</span>
          <input type="text" class="input" placeholder="09:00" value={startTime} oninput={(e) => handleTimeInput('start', e)} onblur={(e) => handleTimeBlur('start', e)} />
        </div>
        <div class="field half">
          <span class="field-label">End Time</span>
          <input type="text" class="input" placeholder="10:30" value={endTime} oninput={(e) => handleTimeInput('end', e)} onblur={(e) => handleTimeBlur('end', e)} />
        </div>
      </div>
      <div class="field-row">
        <div class="field half">
          <span class="field-label">Total Time</span>
          <input type="text" class="input" value={totalTime} disabled placeholder="Auto" />
        </div>
        <div class="field half">
          <span class="field-label">Date</span>
          <DatePicker value={entryDate} onchange={(v) => entryDate = v} />
        </div>
      </div>
      <div class="field">
        <span class="field-label">Link Task</span>
        <div class="task-autocomplete">
          {#if taskId}
            <div class="selected-task">
              <span>{selectedTask?.title}</span>
              <button type="button" class="clear-btn" onclick={clearTask}><X size={14} /></button>
            </div>
          {:else}
            <input type="text" class="input" placeholder="Search tasks..." bind:value={taskSearch} onfocus={() => showTaskDropdown = true} oninput={() => showTaskDropdown = true} onblur={() => setTimeout(() => showTaskDropdown = false, 200)} />
            {#if showTaskDropdown && taskSearch && filteredTasks.length > 0}
              <div class="task-dropdown">
                {#each filteredTasks as t}
                  <button type="button" class="task-option" onclick={() => handleTaskSelect(t)}>{t.title}</button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </div>
      <div class="field">
        <span class="field-label">Client</span>
        <select class="input select-input" bind:value={clientId} disabled={!!taskId}>
          <option value={null}>{taskId ? selectedClientName || 'Auto-filled from task' : 'Select client'}</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <span class="field-label">Project</span>
        <select class="input select-input" bind:value={projectId} disabled={!!taskId}>
          <option value={null}>{taskId ? selectedProjectName || 'Auto-filled from task' : 'No project'}</option>
          {#each filteredProjects as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="right-col">
      <div class="field field-desc">
        <span class="field-label">Description</span>
        <textarea class="textarea desc-textarea" placeholder="Notes about this time entry…" bind:value={description}></textarea>
      </div>
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!startTime}>Save</button>
  </div>
</form>

<style>
  .modal-form { display: flex; flex-direction: column; gap: 16px; }
  .form-grid { display: grid; grid-template-columns: 1fr 2.25fr; gap: 20px; }
  .left-col { display: flex; flex-direction: column; gap: 14px; }
  .right-col { display: flex; flex-direction: column; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-desc { flex: 1; }
  .field-row { display: flex; gap: 12px; }
  .half { flex: 1; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .input, .textarea, .select-input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 10px 14px; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .input:focus, .textarea:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  .input:disabled, .select-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .select-input { cursor: pointer; padding-right: 24px; }
  .textarea { resize: vertical; min-height: 120px; flex: 1; }
  .desc-textarea { min-height: 300px; }
  .task-autocomplete { position: relative; width: 100%; }
  .task-autocomplete .input { width: 100%; box-sizing: border-box; }
  .selected-task { display: flex; align-items: center; gap: 6px; background: rgba(0,212,255,0.1); border: 1px solid var(--accent-cyan); border-radius: 6px; padding: 8px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--cyan); }
  .selected-task span { flex: 1; }
  .clear-btn { display: flex; align-items: center; background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 2px; }
  .clear-btn:hover { color: var(--danger); }
  .task-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .task-option { display: block; width: 100%; text-align: left; padding: 8px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); background: none; border: none; cursor: pointer; transition: background 0.15s; }
  .task-option:hover { background: rgba(0,200,255,0.1); }
  .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; border-radius: var(--radius); cursor: pointer; transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel { background: transparent; color: var(--text-dim); border: 1px solid var(--border); }
  .btn-cancel:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
