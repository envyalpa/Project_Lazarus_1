<script>
  import { ArrowLeft, X, BookOpen, Trash2, Save, Maximize2, Minimize2, Search } from '@lucide/svelte';
  import { slide } from 'svelte/transition';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DocumentForgeEditor from '$lib/components/operations/DocumentForgeEditor.svelte';
  import BookDetailForm from '$lib/components/lounge/BookDetailForm.svelte';
  import BookUrlScraper from '$lib/components/lounge/BookUrlScraper.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';

  let { book: initialBook, genres = [], series = [], seriesBookCounts = {}, onRequestClose } = $props();
  let book = $state(initialBook);
  let mode = $derived(book ? 'edit' : 'create');
  let bookId = $derived(book?.id);
  let localGenres = $state(genres);
  let deleteItem = $state(null);
  let fullscreen = $state(false);
  let editorNotes = $state(book?.notes || '');
  let pristineNotes = $state(book?.notes || '');
  let confirmClose = $state(false);
  let saving = $state(false);
  let editorMode = $state('normal');
  
  // Undo/Redo Bindings
  let editorCanUndo = $state(false);
  let editorCanRedo = $state(false);
  let editorTriggerUndo = $state();
  let editorTriggerRedo = $state();
  
  let lastBookId = $state(null);
  
  // Load settings from localStorage when bookId changes
  $effect(() => {
    if (bookId && bookId !== lastBookId) {
      lastBookId = bookId;
      const saved = localStorage.getItem(`lazarus_book_settings_${bookId}`);
      if (saved) {
        try {
          const config = JSON.parse(saved);
          if (config.editorMode !== undefined) editorMode = config.editorMode;
          if (config.fullscreen !== undefined) fullscreen = config.fullscreen;
        } catch (e) {
          console.error('Error parsing saved book settings:', e);
        }
      } else {
        // Reset to defaults if no saved settings for this book
        editorMode = 'normal';
        fullscreen = false;
      }
    }
  });

  // Save settings to localStorage reactively
  $effect(() => {
    if (bookId) {
      const config = {
        editorMode,
        fullscreen
      };
      localStorage.setItem(`lazarus_book_settings_${bookId}`, JSON.stringify(config));
    }
  });
  let formSave = $state(null);
  let formDirty = $state(false);
  const setFormSave = (fn) => { formSave = fn; };
  let scrapedData = $state(null);
  const handleDirty = (d) => { formDirty = d; };
  function handleScraped(data) {
    scrapedData = { ...data };
  }

  let notesDirty = $derived(mode === 'edit' && editorNotes !== pristineNotes);
  let hasUnsavedChanges = $derived(formDirty || notesDirty);

  $effect(() => {
    if (book) {
      pristineNotes = book.notes || '';
    }
  });

  function handleFormUpdate(updated) {
    book = { ...(book || {}), ...updated };
    if (initialBook === null && mode === 'edit') {
      localGenres = [...genres];
    }
  }

  function handleClose() {
    if (hasUnsavedChanges) {
      confirmClose = true;
    } else {
      onRequestClose?.();
    }
  }

  async function saveNotes() {
    saving = true;
    try {
      const res = await fetch(`/lounge/books/${bookId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: editorNotes }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server responded with ${res.status}`);
      }
      if (book) book.notes = editorNotes;
      pristineNotes = editorNotes;
      notify("Notes saved.");
    } catch (e) {
      console.error('saveNotes failed:', e);
      notify("Error saving notes: " + e.message);
    } finally {
      saving = false;
    }
  }

  async function saveAndClose() {
    if (formDirty && formSave) await formSave();
    if (notesDirty) await saveNotes();
    confirmClose = false;
    onRequestClose?.();
  }

  function discardAndClose() {
    confirmClose = false;
    onRequestClose?.();
  }

  async function handleDelete() {
    const title = book?.title;
    await fetch(`/lounge/books/${bookId}`, { method: 'DELETE' });
    deleteItem = null; onRequestClose?.();
    notify("Commander, book deleted: " + (title || ''));
  }
</script>

<Modal open={true} full={mode !== 'create'} narrow={mode === 'create'} noHeader={true} noBodyScroll={true} onclose={handleClose}>
  <div data-section="book-detail-modal" class="detail-modal-body">
    {#if book !== undefined}
      {#snippet editHeaderLeft()}<button type="button" class="panel-header-btn" onclick={handleClose} title="Back"><ArrowLeft size={16} /> <span class="back-label">Back</span></button>{/snippet}
      {#snippet editHeaderRight()}
          {#if mode === 'edit' && !fullscreen}
        {/if}
        <button type="button" class="panel-header-btn save-btn icon-btn" onclick={async () => { if (formDirty && formSave) await formSave(); if (notesDirty) await saveNotes(); }} disabled={!hasUnsavedChanges || saving} title={hasUnsavedChanges ? 'Save changes' : 'All saved'}>
          <Save size={16} style={hasUnsavedChanges ? 'color:var(--amber)' : 'color:var(--success)'} />
        </button>
        {#if mode === 'edit'} <button type="button" class="panel-header-btn edit-btn icon-btn" onclick={() => { deleteItem = book; }} title="Delete"><Trash2 size={16} color="var(--danger)" /></button>{/if}
        <button type="button" class="panel-header-btn close-btn icon-btn" onclick={handleClose} title="Close"><X size={16} /></button>
      {/snippet}
      {#if mode === 'create'}
        <Panel title="Auto-Fetch" icon={Search}>
          <BookUrlScraper onscraped={handleScraped} initialUrl="" />
        </Panel>
      {/if}
      <div class="detail-grid" class:fullscreen class:single-col={mode === 'create'}>
        <div class="left-col">
          <Panel title={mode === 'create' ? 'Add Book' : 'Edit Book'} icon={BookOpen} stretch={true} headerLeft={editHeaderLeft} headerRight={editHeaderRight}>
            <BookDetailForm {book} {genres} series={series} {seriesBookCounts} {mode} {scrapedData} {fullscreen} onsaveset={setFormSave} ondirty={handleDirty} onupdate={handleFormUpdate} onrequestclose={onRequestClose} />
          </Panel>
          {#if !fullscreen && mode === 'edit'}
            <div transition:slide={{ duration: 250 }}>
              <Panel title="Auto-Fetch" icon={Search}>
                <BookUrlScraper onscraped={handleScraped} initialUrl={book?.source_url || ''} />
              </Panel>
            </div>
          {/if}
        </div>

        <div class="right-col">
          {#if mode === 'edit'}
            {#snippet notesHeaderRight()}
              {#if notesDirty}<button type="button" class="panel-header-btn save-btn" onclick={saveNotes} disabled={saving} title="Save notes"><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>{/if}
              <button type="button" class="panel-header-btn" onclick={() => { fullscreen = !fullscreen; }} title={fullscreen ? 'Split View' : 'Fullscreen'}>{#if fullscreen}<Minimize2 size={16} />{:else}<Maximize2 size={16} />{/if}</button>
            {/snippet}
            <Panel title="Notes" icon={BookOpen} stretch={true} headerRight={notesHeaderRight}>
              <div class="editor-wrap">
                <DocumentForgeEditor 
                  bind:contentMarkdown={editorNotes} 
                  theme="black" 
                  class="notes-inline-editor" 
                  bind:mode={editorMode}
                  bind:canUndo={editorCanUndo}
                  bind:canRedo={editorCanRedo}
                  bind:triggerUndo={editorTriggerUndo}
                  bind:triggerRedo={editorTriggerRedo}
                />
              </div>
            </Panel>
          {/if}
        </div>
      </div>

      {#if confirmClose}
        <div class="close-overlay">
          <div class="close-dialog">
            <p class="close-dialog-msg">You have unsaved changes. What would you like to do?</p>
            <div class="close-dialog-actions">
              <button type="button" class="dialog-btn btn-save-close" onclick={saveAndClose}>Save &amp; Close</button>
              <button type="button" class="dialog-btn btn-discard" onclick={discardAndClose}>Discard</button>
              <button type="button" class="dialog-btn btn-stay" onclick={() => { confirmClose = false; }}>Stay</button>
            </div>
          </div>
        </div>
      {/if}
    {:else}
      <div class="loading">Loading book data...</div>
    {/if}
  </div>
</Modal>

{#if deleteItem}
  <Modal open={true} noHeader={true} compact onclose={() => { deleteItem = null; }}>
    <DeleteConfirm title="Delete Book" item={{ name: deleteItem.title, id: deleteItem.id }} onconfirm={handleDelete} oncancel={() => { deleteItem = null; }} />
  </Modal>
{/if}

<style>
  .detail-modal-body { display: flex; flex-direction: column; gap: 14px; min-height: 0; flex: 1; position: relative; }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; min-height: 0; }
  .detail-grid.single-col { grid-template-columns: 1fr; }
  .detail-grid.single-col .right-col { display: none; }
  .detail-grid:not(.single-col) { min-height: 700px; }
  .left-col { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
  .left-col > :global(.panel) { flex: 1; min-height: 0; }
  .detail-grid.fullscreen { grid-template-columns: minmax(0, 20%) minmax(0, 80%); }
  .right-col { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
  .right-col > :global(.panel.stretch) { flex: 1; min-height: 0; }
  .detail-grid.fullscreen .left-col :global(.panel-title),
  .detail-grid.fullscreen .left-col :global(.panel-header > svg) { display: none; }
  .detail-grid :global(.panel-header) { height: 56px; padding-top: 0; padding-bottom: 0; box-sizing: border-box; }
  .panel-header-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; padding: 0 8px; font-family: var(--font-body); font-size: var(--fs-body); height: 32px !important; line-height: 1; transition: all 0.15s; box-sizing: border-box; }
  .panel-header-btn:hover { border-color: var(--cyan-dim); color: var(--text); }
  .panel-header-btn.icon-btn { width: 32px; justify-content: center; padding: 4px; }
  .panel-header-btn.close-btn:hover { border-color: var(--danger); color: var(--danger); }
  .panel-header-btn.edit-btn:hover { border-color: var(--danger); color: var(--danger); background: rgba(239, 68, 68, 0.08); }
  .panel-header-btn.edit-btn:active { transform: scale(0.95); }
  .panel-header-btn.save-btn { border-color: var(--cyan-dim); color: var(--cyan); }
  .panel-header-btn.save-btn:hover:not(:disabled) { border-color: var(--cyan); background: rgba(0, 212, 255, 0.1); }
  .panel-header-btn.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .back-label { display: none; }
  @media (min-width: 600px) { .back-label { display: inline; } }
  .editor-wrap { flex: 1; min-height: 0; border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; }
  :global(.edit-form-grid) { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  :global(.notes-inline-editor) { flex: 1; min-height: 250px; min-width: 0; display: flex; flex-direction: column; }
  :global(.notes-inline-editor .blocks-list) { padding: 12px; }
  :global(.notes-inline-editor .btn-add-block) { margin-top: 8px; }
  .close-overlay { position: absolute; inset: 0; background: rgba(7, 11, 20, 0.88); display: flex; align-items: center; justify-content: center; z-index: 200; border-radius: var(--radius); }
  .close-dialog { background: var(--bg-panel); border: 1px solid var(--border-glow); border-radius: var(--radius); padding: 24px 32px; max-width: 400px; text-align: center; box-shadow: 0 0 30px var(--cyan-glow); }
  .close-dialog-msg { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0 0 18px; line-height: 1.5; }
  .close-dialog-actions { display: flex; gap: 10px; justify-content: center; }
  .dialog-btn { padding: 8px 16px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-dim); transition: all 0.15s; }
  .dialog-btn:hover { border-color: var(--cyan-dim); color: var(--text); }
  .btn-save-close { background: rgba(0, 212, 255, 0.12); border-color: var(--cyan-dim); color: var(--cyan); }
  .btn-save-close:hover { background: rgba(0, 212, 255, 0.22); border-color: var(--cyan); }
  .btn-discard { border-color: var(--danger); color: var(--danger); }
  .btn-discard:hover { background: rgba(239, 68, 68, 0.1); }
  .btn-stay { border-color: var(--amber); color: var(--amber); }
  .btn-stay:hover { background: rgba(255, 140, 0, 0.1); }
  .loading { display: flex; align-items: center; justify-content: center; padding: 60px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  :global(.modal.full:has(.detail-modal-body)) { max-width: 85vw; width: 85vw; height: 85vh; }
</style>
