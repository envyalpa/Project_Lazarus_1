<script>
  import IconPicker from './IconPicker.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let { project = null, clients = [], onsave, oncancel, hideClient = false } = $props();

  let name = $state(project?.name || '');
  let icon = $state(project?.icon || 'FolderKanban');
  let description = $state(project?.description || '');
  let status = $state(project?.status || 'not-started');
  let clientId = $state(project?.client_id || (clients.length > 0 ? clients[0].id : null));
  let color = $state(project?.color || '--cyan');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onsave({ name: name.trim(), icon, description: description.trim(), status, client_id: clientId, color });
  }
</script>

<form data-section="project-form" onsubmit={handleSubmit}>
  <div class="field">
    <span data-label="field-label" class="row-label">Identity</span>
    <div class="identity-row">
      <IconPicker value={icon} onchange={(v) => icon = v} />
      <ColorPicker value={color} onchange={(v) => color = v} />
      <input type="text" class="input name-input" placeholder="Project name" bind:value={name} required />
    </div>
  </div>

  {#if !hideClient}
    <div class="field">
      <span class="field-label">Client</span>
      <select class="input select-input" bind:value={clientId}>
        {#each clients as c}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="field">
    <span class="field-label">Status</span>
    <select class="input select-input" bind:value={status}>
      <option value="not-started">Not Started</option>
      <option value="on-hold">On Hold</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>
  </div>

  <div class="field">
    <span class="field-label">Description</span>
    <textarea class="textarea" rows="3" placeholder="Project description..." bind:value={description}></textarea>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!name.trim()}>Save</button>
  </div>
</form>

<style>
  form[data-section="project-form"] { display: flex; flex-direction: column; gap: 20px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  span[data-label="field-label"].row-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .identity-row { display: flex; align-items: stretch; gap: 8px; }
  .name-input { flex: 1; min-width: 0; }
  .input, .textarea { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 10px 14px; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .input:focus, .textarea:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  .input::placeholder, .textarea::placeholder { color: var(--text-placeholder); }
  .select-input { cursor: pointer; padding-right: 24px; }
  .textarea { resize: vertical; }
  .form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; border-radius: var(--radius); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { color: var(--text); background: var(--bg-elevated); }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
