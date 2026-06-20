<script>
  import Modal from '$lib/components/operations/Modal.svelte';
  import ColorPicker from '$lib/components/operations/ColorPicker.svelte';
  import { Check, RefreshCw, Sparkles, Users, X } from '@lucide/svelte';
  import { colorValues } from '$lib/shared/colors.js';
  import { agentStore } from '$lib/stores/agent.svelte.js';

  let { author = null, onsave, oncancel } = $props();

  let name = $state(author?.name || '');
  let color = $state(author?.color || '--cyan');
  let description = $state(author?.description || '');
  let wikiLink = $state(author?.wiki_link || '');
  let imageUrl = $state(author?.image_url || '');
  let fetching = $state(false);
  let mode = $state('edit');

  function formatDesc(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  }

  const DESC_CHAR_LIMIT = 960;
  let descChars = $derived(description ? description.length : 0);
  let descOver = $derived(descChars > DESC_CHAR_LIMIT);
  let descWarn = $derived(descChars > DESC_CHAR_LIMIT * 0.9);

  function hexColor(token) {
    return colorValues[token] || token;
  }

  async function handleAutoFetch() {
    if (!name) return;
    await agentStore.sendAutoFetch(name.trim(), wikiLink || '');
    oncancel();
  }

  async function handleRegenerate() {
    if (!name) return;
    const existingData = { name: name.trim(), color, image_url: imageUrl, wiki_link: wikiLink };
    if (author?.authorId) existingData.authorId = author.authorId;
    await agentStore.sendRegenerate(name.trim(), wikiLink || '', DESC_CHAR_LIMIT, existingData);
    oncancel();
  }

  function handleSave() {
    if (!name?.trim()) { console.log('handleSave: name empty'); return; }
    const payload = { id: author?.authorId || null, name: name.trim(), old_name: author?.name?.trim() || '', color, description, image_url: imageUrl, wiki_link: wikiLink };
    console.log('handleSave payload:', JSON.stringify(payload));
    onsave(payload);
  }
</script>

<Modal open={true} wide={true} noHeader={true} noBodyScroll={true} onclose={oncancel}>
  <div data-section="author-edit-modal" class="author-modal-inner">

    <!-- Header — pixel-perfect match to Modal.svelte's .modal-header -->
    <div class="modal-header">
      <h3 class="modal-header-title">{author ? 'Edit Author' : 'Add Author'}</h3>
      <div class="header-actions">
        <button type="button" class="action-btn" onclick={handleAutoFetch} disabled={fetching || !name} title="Auto-fetch from Wikipedia">
          {#if fetching}
            <RefreshCw size={14} class="spin" />
          {:else}
            <Sparkles size={14} />
          {/if}
          <span>Auto-Fetch</span>
        </button>
        <button type="button" class="action-btn" onclick={handleRegenerate} disabled={!name} title="Regenerate description">
          <RefreshCw size={14} />
          <span>Regenerate</span>
        </button>
        <button type="button" class="save-btn" onclick={handleSave} disabled={!name?.trim()} title="Save changes">
          <Check size={15} />
          <span>Save</span>
        </button>
        <button type="button" class="close-btn" onclick={oncancel} title="Cancel">
          <X size={18} />
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="modal-body">
      <div class="modal-layout">

        <!-- 9:16 image — stretches to fill the full height of the layout row -->
        <div class="image-preview" style="border-color: {hexColor(color)};">
          {#if imageUrl}
            <img src={imageUrl} alt={name} class="preview-img" />
          {:else}
            <div class="preview-placeholder" style="color: {hexColor(color)};">
              <Users size={56} />
            </div>
          {/if}
        </div>

        <!-- Form fields -->
        <div class="form-column">
          <div class="form-fields-scroll">
            <label class="field-group">
              <span class="field-label">Name</span>
              <div class="color-name-row">
                <ColorPicker value={color} onchange={(c) => { color = c; }} />
                <input type="text" bind:value={name} placeholder="Author name" class="field-input" style="flex: 1;" />
              </div>
            </label>
            <label class="field-group">
              <span class="field-label">Wiki Link</span>
              <input type="url" bind:value={wikiLink} placeholder="https://en.wikipedia.org/wiki/..." class="field-input" />
            </label>
            <label class="field-group">
              <span class="field-label">Author Image URL</span>
              <input type="url" bind:value={imageUrl} placeholder="Image URL or auto-fetch from Wikipedia" class="field-input" />
            </label>
            <div class="field-group description">
              <div class="description-header">
                <span class="field-label">
                  Description
                  <span class="char-counter" class:warn={descWarn} class:over={descOver}>
                    {descChars}/{DESC_CHAR_LIMIT}
                    {#if descOver}<span class="over-msg">— exceeds limit</span>{/if}
                  </span>
                </span>
                <div class="mode-toggles">
                  <button type="button" class="mode-btn" class:active={mode === 'edit'} onclick={() => mode = 'edit'}>Edit</button>
                  <button type="button" class="mode-btn" class:active={mode === 'preview'} onclick={() => mode = 'preview'}>Preview</button>
                </div>
              </div>
              {#if mode === 'edit'}
                <textarea bind:value={description} placeholder="Author description / biography summary" class="field-textarea"></textarea>
              {:else}
                <div class="field-preview-area" data-section="description-preview">
                  {@html formatDesc(description || '*No description entered. Click Auto-Fetch or Regenerate to populate biography.*')}
                </div>
              {/if}
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</Modal>

<style>
  /* Wrapper fills the modal panel completely */
  .author-modal-inner { display: flex; flex-direction: column; height: 580px; max-height: calc(85vh - 48px); }

  /* Header — mirrors Modal.svelte's .modal-header exactly */
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; }

  /* Right-side action cluster */
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .action-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); font-family: var(--font-caption); font-size: var(--fs-caption); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .action-btn:hover:not(:disabled) { background: rgba(0, 212, 255, 0.08); border-color: var(--cyan-dim); color: var(--cyan); }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .save-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; background: rgba(0, 212, 255, 0.12); border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--cyan); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .save-btn:hover:not(:disabled) { background: rgba(0, 212, 255, 0.22); border-color: var(--cyan); }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .close-btn:hover { color: var(--text); background: var(--bg-elevated); border-color: var(--cyan-dim); }

  /* Body */
  .modal-body { flex: 1; min-height: 0; padding: 24px; display: flex; flex-direction: column; overflow: hidden; }

  /* Two-column layout row */
  .modal-layout { display: flex; gap: 20px; align-items: stretch; flex: 1; min-height: 0; }

  /* Image fills the full height of the layout row; width computed from 9:16 ratio */
  .image-preview { aspect-ratio: 9 / 16; align-self: stretch; flex-shrink: 0; border-radius: 6px; overflow: hidden; border: 2px solid; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
  .preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .preview-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }

  /* Form column */
  .form-column { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .form-fields-scroll { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; padding-right: 4px; }
  .field-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .char-counter { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-muted); letter-spacing: 0; text-transform: none; transition: color 0.2s; }
  .char-counter.warn { color: var(--amber); }
  .char-counter.over { color: var(--danger); }
  .over-msg { font-weight: 400; }
  .color-name-row { display: flex; align-items: center; gap: 8px; }
  .field-input { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); outline: none; transition: all 0.2s; width: 100%; box-sizing: border-box; }
  .field-input:focus { border-color: var(--accent-cyan); box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.15); }
  .field-group.description { flex: 1; display: flex; flex-direction: column; }
  .field-textarea { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); outline: none; transition: all 0.2s; flex: 1; resize: none; line-height: 1.5; width: 100%; box-sizing: border-box; min-height: 80px; }
  .field-textarea:focus { border-color: var(--accent-cyan); box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.15); }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .description-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
  .mode-toggles { display: flex; gap: 4px; }
  .mode-btn { background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 8px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
  .mode-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .mode-btn.active { background: rgba(0, 212, 255, 0.08); border-color: var(--cyan); color: var(--cyan); }
  .field-preview-area { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); line-height: 1.5; width: 100%; box-sizing: border-box; min-height: 80px; flex: 1; overflow-y: auto; white-space: pre-wrap; text-align: left; }
  .field-preview-area :global(strong) { color: var(--amber); font-weight: 700; font-style: normal; }
  .field-preview-area :global(em) { color: var(--cyan); font-weight: 600; font-style: normal; }
</style>
