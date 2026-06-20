<script>
  import IconPicker from './IconPicker.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let { client: initial = null, onsave, oncancel } = $props();

  let name = $state(initial?.name || '');
  let icon = $state(initial?.icon || 'Building2');
  let color = $state(initial?.color || '--cyan');
  let logo = $state(initial?.logo || '');
  let description = $state(initial?.description || '');
  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onsave({ name: name.trim(), icon, color, logo: logo.trim(), description: description.trim() });
  }
</script>

<form data-section="client-form" onsubmit={handleSubmit}>
  <div class="field">
    <span data-label="field-label" class="row-label">Identity</span>
    <div class="identity-row">
      <IconPicker value={icon} onchange={(v) => icon = v} />
      <ColorPicker value={color} onchange={(v) => color = v} />
      <input type="text" class="input name-input" placeholder="Client name" bind:value={name} required />
    </div>
  </div>

  <div class="field">
    <label data-label="field-label" for="client-desc">Description</label>
    <textarea id="client-desc" class="textarea" rows="3" placeholder="Brief description..." bind:value={description}></textarea>
  </div>

  <div class="field">
    <label data-label="field-label" for="client-logo">Logo URL</label>
    <input id="client-logo" type="url" class="input" placeholder="https://example.com/logo.png" bind:value={logo} />
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!name.trim()}>Save</button>
  </div>
</form>

<style>
  form[data-section="client-form"] {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span[data-label="field-label"].row-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .identity-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .name-input {
    flex: 1;
    min-width: 0;
  }

  label[data-label="field-label"] {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .input, .textarea {
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

  .input:focus, .textarea:focus {
    outline: none;
    border-color: var(--accent-cyan);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2), 0 0 0 2px rgba(0, 200, 255, 0.15);
  }

  .input::placeholder, .textarea::placeholder {
    color: var(--text-placeholder);
  }

  .textarea {
    resize: vertical;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
  }

  .btn {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 10px 24px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-dim);
  }

  .btn-cancel:hover {
    color: var(--text);
    background: var(--bg-elevated);
  }

  .btn-save {
    background: var(--accent-cyan);
    color: #fff;
    border-color: var(--accent-cyan);
  }

  .btn-save:hover {
    background: linear-gradient(135deg, var(--accent-cyan), #007bff);
    border-color: transparent;
  }

  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
