<script>
  import { ArrowLeft, Plus, Pencil, Trash2, LayoutGrid, Table, Minimize2, Equal, Maximize2 } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import CourseForm from '$lib/components/academy/CourseForm.svelte';
  import NoteCard from '$lib/components/academy/NoteCard.svelte';
  import NoteForm from '$lib/components/academy/NoteForm.svelte';

  let { data } = $props();
  let area = $state(data.area);
  let course = $state(data.course);
  let notes = $state(data.notes);

  let showEditForm = $state(false);
  let showDelete = $state(false);
  let showNoteForm = $state(false);
  let editNote = $state(null);
  let deleteNote = $state(null);
  let notesView = $state('list');
  let notesDensity = $state('normal');
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  function cycleNotesView() { notesView = notesView === 'card' ? 'list' : 'card'; }
  function cycleNotesDensity() {
    const i = densityOrder.indexOf(notesDensity);
    notesDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  async function handleEditCourse(data) {
    const res = await fetch(`/academy/${area.id}/course/${course.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) return;
    course = await res.json();
    showEditForm = false;
    notify('Course updated.');
  }

  async function handleDeleteCourse() {
    const res = await fetch(`/academy/${area.id}/course/${course.id}`, { method: 'DELETE' });
    if (!res.ok) return;
    notify('Course deleted.');
    window.location.href = `/academy/${area.id}`;
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const body = { title: fd.get('title') };
    if (editNote) {
      const res = await fetch(`/academy/${area.id}/course/${course.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, action: 'update-note', id: editNote.id })
      });
      if (!res.ok) return;
      const updated = await res.json();
      notes = notes.map(n => n.id === updated.id ? updated : n);
      notify('Note updated.');
    } else {
      const res = await fetch(`/academy/${area.id}/course/${course.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) return;
      const created = await res.json();
      notes = [...notes, created];
      notify('Note created.');
    }
    showNoteForm = false; editNote = null;
  }

  async function handleDeleteNote(id) {
    const res = await fetch(`/academy/${area.id}/course/${course.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-note', id })
    });
    if (!res.ok) return;
    notes = notes.filter(n => n.id !== id);
    deleteNote = null;
    notify('Note deleted.');
  }
</script>

<div data-section="course-detail">
  <a href="/academy/{area.id}" class="back-link"><ArrowLeft size={16} /><span>Back to {area.name}</span></a>

  <div class="course-header">
    <div class="course-info">
      <h2 class="course-name">{course.name}</h2>
      {#if course.description}
        <p class="course-desc">{course.description}</p>
      {/if}
      <span class="status-pill" style="background: {(course.status === 'in-progress' ? 'var(--cyan)' : course.status === 'completed' ? 'var(--success)' : 'var(--text-dim)')}22; color: {course.status === 'in-progress' ? 'var(--cyan)' : course.status === 'completed' ? 'var(--success)' : 'var(--text-dim)'};">
        {course.status === 'not-started' ? 'Not Started' : course.status === 'in-progress' ? 'In Progress' : course.status === 'completed' ? 'Completed' : course.status}
      </span>
    </div>
    <div class="course-actions">
      <button type="button" class="icon-btn edit-btn" onclick={() => showEditForm = true} title="Edit"><Pencil size={18} /></button>
      <button type="button" class="icon-btn delete-btn" onclick={() => showDelete = true} title="Delete"><Trash2 size={18} /></button>
    </div>
  </div>

  <Panel title="Notes">
    {#snippet headerRight()}
      <button type="button" class="panel-add-btn" onclick={() => { editNote = null; showNoteForm = true; }}>
        <Plus size={16} /><span>Add Note</span>
      </button>
      <button type="button" class="toggle-btn" class:toggle-active={notesView === 'card'} onclick={cycleNotesView} title="Toggle view">
        {#if notesView === 'card'}<LayoutGrid size={16} />{:else}<Table size={16} />{/if}
      </button>
      {#if notesView === 'card'}
        <button type="button" class="density-btn" onclick={cycleNotesDensity} title="Density">
          <svelte:component this={densityIcons[notesDensity]} size={16} />
        </button>
      {/if}
    {/snippet}
    {#if notes.length === 0}
      <div class="empty-state">No notes yet. Add your first note.</div>
    {:else if notesView === 'card'}
      <div class="note-grid density-{notesDensity}">
        {#each notes as note (note.id)}
          <NoteCard {note} density={notesDensity} onedit={(n) => { editNote = { ...n }; showNoteForm = true; }} ondelete={(n) => deleteNote = n} />
        {/each}
      </div>
    {:else}
      <div class="note-list">
        {#each notes as note (note.id)}
          <NoteCard {note} onedit={(n) => { editNote = { ...n }; showNoteForm = true; }} ondelete={(n) => deleteNote = n} />
        {/each}
      </div>
    {/if}
  </Panel>
</div>

{#if showEditForm}
  <Modal open={true} title="Edit Course" onclose={() => showEditForm = false}>
    <CourseForm course={course} onsave={handleEditCourse} oncancel={() => showEditForm = false} />
  </Modal>
{/if}

{#if showDelete}
  <Modal open={true} title="Delete Course" compact onclose={() => showDelete = false}>
    <DeleteConfirm title="Delete Course" item={course} onconfirm={handleDeleteCourse} oncancel={() => showDelete = false} />
  </Modal>
{/if}

{#if showNoteForm}
  <Modal open={true} noHeader onclose={() => { showNoteForm = false; editNote = null; }}>
    <NoteForm note={editNote} onsave={handleSaveNote} oncancel={() => { showNoteForm = false; editNote = null; }} />
  </Modal>
{/if}

{#if deleteNote}
  <Modal open={true} title="Delete Note" compact onclose={() => deleteNote = null}>
    <DeleteConfirm title="Delete Note" item={deleteNote} onconfirm={(id) => handleDeleteNote(id)} oncancel={() => deleteNote = null} />
  </Modal>
{/if}

<style>
  .back-link { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); text-decoration: none; margin-bottom: 12px; transition: color 0.2s; }
  .back-link:hover { color: var(--cyan); }
  .course-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
  .course-info { flex: 1; }
  .course-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0 0 4px; }
  .course-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0 0 8px; }
  .status-pill { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: var(--radius); font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; }
  .course-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; color: var(--text-dim); padding: 0; transition: all 0.2s; }
  .edit-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }
  .empty-state { text-align: center; padding: 32px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .note-list { display: flex; flex-direction: column; gap: 8px; }

  .panel-add-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--bg-card); border: 1px solid var(--cyan); border-radius: var(--radius); color: var(--cyan); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s; }
  .panel-add-btn:hover { background: rgba(0,212,255,0.1); }

  .toggle-btn, .density-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; background: none; border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s;
  }
  .toggle-btn:hover, .density-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .toggle-btn.toggle-active { color: var(--cyan); border-color: var(--cyan); background: rgba(0,212,255,0.1); }

  .note-grid { display: grid; }
  .note-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px; }
  .note-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
  .note-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
</style>
