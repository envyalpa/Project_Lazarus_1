<script>
  import IconPicker from '$lib/components/operations/IconPicker.svelte';
  import ColorPicker from '$lib/components/operations/ColorPicker.svelte';

  let { area = null, onsave, oncancel } = $props();

  let name = $state(area?.name || '');
  let icon = $state(area?.icon || 'GraduationCap');
  let color = $state(area?.color || '--cyan');
  let description = $state(area?.description || '');
  let cover_url = $state(area?.cover_url || '');
  let priority = $state(area?.priority || 'medium');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      icon,
      color,
      description: description.trim(),
      cover_url: cover_url.trim(),
      priority
    });
  }
</script>

<form data-section="area-form" onsubmit={handleSubmit}>
  <div class="field">
    <span data-label="field-label" class="row-label">Identity</span>
    <div class="identity-row">
      <IconPicker value={icon} onchange={(v) => icon = v} />
      <ColorPicker value={color} onchange={(v) => color = v} />
      <input type="text" class="input name-input" placeholder="Area name" bind:value={name} required />
    </div>
  </div>

  <div class="field">
    <label data-label="field-label" for="area-desc">Description</label>
    <textarea id="area-desc" class="input textarea" rows="3" placeholder="Brief description..." bind:value={description}></textarea>
  </div>

  <div class="field-row">
    <div class="field flex-1">
      <label data-label="field-label" for="area-cover">Cover URL</label>
      <input id="area-cover" type="url" class="input" placeholder="https://example.com/cover.jpg" bind:value={cover_url} />
    </div>
    <div class="field flex-1">
      <label data-label="field-label" for="area-priority">Priority</label>
      <select id="area-priority" class="input" bind:value={priority}>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!name.trim()}>{area ? 'Save' : 'Create'}</button>
  </div>
</form>

<style>
  form[data-section="area-form"] { display: flex; flex-direction: column; gap: 20px; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-row { display: flex; gap: 16px; }
  .flex-1 { flex: 1; }

  span[data-label="field-label"].row-label {
    font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600;
    color: var(--amber); text-transform: uppercase; letter-spacing: 1px;
  }

  .identity-row { display: flex; align-items: stretch; gap: 8px; }
  .name-input { flex: 1; min-width: 0; }

  label[data-label="field-label"] {
    font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600;
    color: var(--amber); text-transform: uppercase; letter-spacing: 1px;
  }

  .input, .textarea {
    background: var(--bg-surface); border: 1px solid var(--modal-border);
    border-radius: 6px; color: var(--modal-text);
    font-family: var(--font-body); font-size: var(--fs-body);
    padding: 10px 14px; transition: all 0.2s ease-in-out;
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
  }

  .input:focus, .textarea:focus {
    outline: none; border-color: var(--accent-cyan);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2), 0 0 0 2px rgba(0, 200, 255, 0.15);
  }

  .input::placeholder, .textarea::placeholder { color: var(--text-placeholder); }
  .textarea { resize: vertical; }
  select.input { cursor: pointer; }

  .form-actions {
    display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px;
  }

  .btn {
    font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600;
    padding: 10px 24px; border-radius: var(--radius);
    border: 1px solid var(--border); cursor: pointer;
    transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px;
  }

  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { color: var(--text); background: var(--bg-elevated); }

  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
