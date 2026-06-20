<script>
  import IconPicker from '$lib/components/operations/IconPicker.svelte';
  import ColorPicker from '$lib/components/operations/ColorPicker.svelte';

  let { person = null, onsave, oncancel } = $props();

  let name = $state(person?.name || '');
  let icon = $state(person?.icon || 'User');
  let color = $state(person?.color || '--cyan');
  let show_in_summary = $state(person?.show_in_summary ?? 1);

  function submit() {
    onsave({ name, icon, color, show_in_summary: show_in_summary ? 1 : 0 });
  }
</script>

<div data-section="people-form" class="form-stack">
  <div class="identity-row">
    <span class="field-label">Identity</span>
    <div class="identity-content">
      <IconPicker value={icon} onchange={(v) => icon = v} />
      <ColorPicker value={color} onchange={(v) => color = v} />
      <input type="text" bind:value={name} placeholder="e.g. Sister" class="field-input" />
    </div>
  </div>

  <label class="field">
    <span class="field-label">Show in Balance Grid</span>
    <div class="checkbox-row">
      <label class="checkbox-label" class:active={show_in_summary === 1}>
        <input type="checkbox" bind:checked={show_in_summary} /> Show on SitRep & Transactions
      </label>
    </div>
  </label>

  <div class="form-actions">
    <button type="button" class="btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="button" class="btn-save" onclick={submit} disabled={!name}>Save</button>
  </div>
</div>

<style>
  .form-stack { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--amber-dark); text-transform: uppercase; letter-spacing: 1px; }
  .field-input { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); transition: all 0.2s; width: 100%; box-sizing: border-box; height: 42px; }
  .field-input:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15); }
  .field-input::placeholder { color: var(--text-muted); }
  .identity-row { display: flex; flex-direction: column; gap: 6px; }
  .identity-content { display: flex; gap: 10px; align-items: center; }
  .identity-content :global(.icon-picker-trigger),
  .identity-content :global(.color-picker-trigger) { flex-shrink: 0; height: 42px; box-sizing: border-box; }
  .identity-content :global(.preview-btn),
  .identity-content :global(.preview-swatch) { height: 42px !important; box-sizing: border-box !important; padding: 10px 8px !important; }
  .identity-content .field-input { flex: 1; }
  .checkbox-row { display: flex; gap: 10px; }
  .checkbox-label { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elevated); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; transition: all 0.2s; }
  .checkbox-label.active { border-color: var(--cyan); background: rgba(0, 212, 255, 0.1); color: var(--cyan); }
  .checkbox-label input { accent-color: var(--cyan); }
  .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border); }
  .btn-cancel { padding: 8px 20px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; transition: all 0.2s; }
  .btn-cancel:hover { color: var(--text); border-color: var(--cyan-dim); }
  .btn-save { padding: 8px 20px; background: var(--cyan); border: none; border-radius: var(--radius); color: #000; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-save:hover { box-shadow: 0 0 12px var(--cyan-glow); }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
</style>
