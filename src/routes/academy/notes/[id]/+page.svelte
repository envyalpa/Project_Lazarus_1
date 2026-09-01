<script>
  import { ArrowLeft, Trash2, Save } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import DocumentForgeEditor from '$lib/components/operations/DocumentForgeEditor.svelte';

  let { data } = $props();
  let note = $state(data.note);
  let content = $state(note.content || '');
  let title = $state(note.title);
  let titleDirty = $state(false);
  let saving = $state(false);
  let showDelete = $state(false);

  let backHref = $derived(note.course_id ? `/academy/${note.area_id}/course/${note.course_id}` : `/academy/${note.area_id}`);
  let backLabel = $derived(note.course_name || note.area_name || 'Back');
  let dirty = $derived(title !== note.title || content !== note.content);

  async function save() {
    saving = true;
    try {
      const res = await fetch(`/academy/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content })
      });
      if (!res.ok) throw new Error('Save failed');
      note = await res.json();
      title = note.title;
      content = note.content;
      titleDirty = false;
      notify('Note saved.');
    } catch {
      notify('Failed to save note.');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    const res = await fetch(`/academy/${note.area_id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-note', id: note.id })
    });
    if (!res.ok) return;
    notify('Note deleted.');
    window.location.href = backHref;
  }
</script>

<div data-section="note-detail">
  <a href={backHref} class="back-link"><ArrowLeft size={16} /><span>Back to {backLabel}</span></a>

  <div class="note-header">
    <input
      type="text"
      class="note-title-input"
      bind:value={title}
      oninput={() => titleDirty = true}
      placeholder="Note title"
    />
    <div class="note-actions">
      {#if dirty}
        <button type="button" class="action-btn save-btn" onclick={save} disabled={saving}>
          <Save size={16} />{saving ? 'Saving...' : 'Save'}
        </button>
      {/if}
      <button type="button" class="action-btn delete-btn" onclick={() => showDelete = true}>
        <Trash2 size={16} />Delete
      </button>
    </div>
  </div>

  {#if note.area_name || note.course_name}
    <div class="note-context">
      {#if note.area_name}<span class="context-badge area-badge">{note.area_name}</span>{/if}
      {#if note.course_name}<span class="context-badge course-badge">{note.course_name}</span>{/if}
    </div>
  {/if}

  <Panel stretch={true}>
    <DocumentForgeEditor bind:contentMarkdown={content} theme="black" class="notes-inline-editor" />
  </Panel>
</div>

{#if showDelete}
  <Modal open={true} title="Delete Note" compact onclose={() => showDelete = false}>
    <DeleteConfirm title="Delete Note" item={note} onconfirm={handleDelete} oncancel={() => showDelete = false} />
  </Modal>
{/if}

<style>
  div[data-section="note-detail"] { display: flex; flex-direction: column; min-height: 0; flex: 1; gap: 12px; }

  .back-link { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-decoration: none; transition: color 0.2s; }
  .back-link:hover { color: var(--cyan); }

  .note-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
  .note-title-input { flex: 1; background: none; border: none; color: var(--text); font-family: var(--font-heading-1); font-size: var(--fs-heading-1); font-weight: 700; padding: 0; outline: none; min-width: 0; }
  .note-title-input::placeholder { color: var(--text-dim); }

  .note-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .action-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); transition: all 0.2s; }
  .save-btn { color: var(--cyan); border-color: var(--cyan); }
  .save-btn:hover { background: rgba(0,212,255,0.1); }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }

  .note-context { display: flex; align-items: center; gap: 6px; }
  .context-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-small); font-weight: 600; letter-spacing: 0.3px; }
  .area-badge { background: rgba(0, 212, 255, 0.12); color: var(--cyan); border: 1px solid rgba(0, 212, 255, 0.3); }
  .course-badge { background: rgba(168, 85, 247, 0.12); color: var(--purple); border: 1px solid rgba(168, 85, 247, 0.3); }
</style>
