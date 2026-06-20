<script>
  import Modal from '$lib/components/operations/Modal.svelte';
  import IconPicker from '$lib/components/operations/IconPicker.svelte';
  import ColorPicker from '$lib/components/operations/ColorPicker.svelte';
  import { Tag, Check, Trash2, X } from '@lucide/svelte';

  let { genre = null, onsave, oncancel, ondelete } = $props();

  let name = $state(genre?.name || '');
  let icon = $state(genre?.icon || 'Tag');
  let color = $state(genre?.color || '--cyan');
  let description = $state(genre?.description || '');
  let mode = $state('edit');

  function formatDesc(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  }

  function handleSave() {
    if (!name?.trim()) return;
    onsave({ id: genre?.id || null, name: name.trim(), icon, color, description });
  }
</script>

<Modal open={true} noHeader={true} compact onclose={oncancel}>
  <div data-section="genre-edit-modal" class="genre-modal-inner">
    <div class="modal-header">
      <h3 class="modal-header-title"><Tag size={18} /> {genre ? 'Edit Genre' : 'Add Genre'}</h3>
      <button type="button" class="close-btn" onclick={oncancel} title="Close"><X size={18} /></button>
    </div>
    <div class="modal-body">
      <label class="field-group">
        <span class="field-label">Identity</span>
        <div class="icon-color-name-row">
          <IconPicker value={icon} onchange={(v) => { icon = v; }} />
          <ColorPicker value={color} onchange={(c) => { color = c; }} />
          <input type="text" bind:value={name} placeholder="Genre name" class="field-input" style="flex: 1;" />
        </div>
      </label>
      <div class="field-group description">
        <div class="description-header">
          <span class="field-label">Description</span>
          <div class="mode-toggles">
            <button type="button" class="mode-btn" class:active={mode === 'edit'} onclick={() => mode = 'edit'}>Edit</button>
            <button type="button" class="mode-btn" class:active={mode === 'preview'} onclick={() => mode = 'preview'}>Preview</button>
          </div>
        </div>
        {#if mode === 'edit'}
          <textarea bind:value={description} placeholder="Genre description" class="field-textarea"></textarea>
        {:else}
          <div class="field-preview-area">{@html formatDesc(description || '*No description.*')}</div>
        {/if}
      </div>
      <div class="form-actions">
        {#if genre}
          <button type="button" class="delete-btn" onclick={() => { ondelete?.(genre); }}><Trash2 size={15} /> Delete</button>
        {/if}
        <div class="right-actions">
          <button type="button" class="cancel-btn" onclick={oncancel}>Cancel</button>
          <button type="button" class="save-btn" onclick={handleSave} disabled={!name.trim()}><Check size={15} /> {genre ? 'Accept' : 'Create'}</button>
        </div>
      </div>
    </div>
  </div>
</Modal>

<style>
  .genre-modal-inner { display: flex; flex-direction: column; min-width: 480px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: flex; align-items: center; gap: 8px; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
  .close-btn:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--cyan-dim); }
  .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .field-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-small); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .icon-color-name-row { display: flex; align-items: center; gap: 8px; }
  .field-input { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); outline: none; transition: all 0.2s; box-sizing: border-box; }
  .field-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15); }
  .field-input::placeholder { color: var(--text-muted); }
  .field-group.description { flex: 1; display: flex; flex-direction: column; }
  .description-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .mode-toggles { display: flex; gap: 4px; }
  .mode-btn { background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 8px; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 600; color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
  .mode-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .mode-btn.active { background: rgba(0, 212, 255, 0.08); border-color: var(--cyan); color: var(--cyan); }
  .field-textarea { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); outline: none; transition: all 0.2s; resize: vertical; min-height: 80px; width: 100%; box-sizing: border-box; }
  .field-textarea:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15); }
  .field-preview-area { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); min-height: 80px; white-space: pre-wrap; }
  .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
  .right-actions { display: flex; gap: 8px; margin-left: auto; }
  .delete-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: none; border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; transition: all 0.15s; }
  .delete-btn:hover { background: rgba(239, 68, 68, 0.1); }
  .cancel-btn { padding: 8px 16px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-body); font-size: var(--fs-body); cursor: pointer; transition: all 0.15s; }
  .cancel-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .save-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(0, 212, 255, 0.12); border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--cyan); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .save-btn:hover:not(:disabled) { background: rgba(0, 212, 255, 0.22); border-color: var(--cyan); }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
