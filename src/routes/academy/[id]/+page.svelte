<script>
  import { ArrowLeft, Plus, Pencil, Trash2, Minimize2, Equal, Maximize2 } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import DynamicIcon from '$lib/components/operations/DynamicIcon.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  import AreaForm from '$lib/components/academy/AreaForm.svelte';
  import CourseCard from '$lib/components/academy/CourseCard.svelte';
  import CourseForm from '$lib/components/academy/CourseForm.svelte';
  import NoteCard from '$lib/components/academy/NoteCard.svelte';
  import NoteForm from '$lib/components/academy/NoteForm.svelte';

  let { data } = $props();
  let area = $state(data.area);
  let courses = $state(data.courses);
  let notes = $state(data.notes);

  let showEditForm = $state(false);
  let showDelete = $state(false);
  let showCourseForm = $state(false);
  let editCourse = $state(null);
  let deleteCourse = $state(null);
  let showNoteForm = $state(false);
  let editNote = $state(null);
  let deleteNote = $state(null);
  let courseDensity = $state('normal');
  const densityOrder = ['compact', 'normal', 'large'];
  const densityIcons = { compact: Minimize2, normal: Equal, large: Maximize2 };

  function cycleCourseDensity() {
    const i = densityOrder.indexOf(courseDensity);
    courseDensity = densityOrder[(i + 1) % densityOrder.length];
  }

  async function handleEditArea(data) {
    const res = await fetch(`/academy/${area.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) return;
    area = await res.json();
    showEditForm = false;
    notify('Area updated.');
  }

  async function handleDeleteArea() {
    const res = await fetch(`/academy/${area.id}`, { method: 'DELETE' });
    if (!res.ok) return;
    notify('Area deleted.');
    window.location.href = '/academy';
  }

  async function handleSaveCourse(data) {
    if (editCourse) {
      const res = await fetch(`/academy/${area.id}/course/${editCourse.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) return;
      const updated = await res.json();
      courses = courses.map(c => c.id === updated.id ? updated : c);
      notify('Course updated.');
    } else {
      const res = await fetch(`/academy/${area.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) return;
      const created = await res.json();
      courses = [...courses, created];
      notify('Course created.');
    }
    showCourseForm = false; editCourse = null;
  }

  async function handleDeleteCourse(id) {
    const res = await fetch(`/academy/${area.id}/course/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    courses = courses.filter(c => c.id !== id);
    deleteCourse = null;
    notify('Course deleted.');
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const body = { title: fd.get('title') };
    if (editNote) {
      const res = await fetch(`/academy/${area.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, action: 'update-note', id: editNote.id })
      });
      if (!res.ok) return;
      const updated = await res.json();
      notes = notes.map(n => n.id === updated.id ? updated : n);
      notify('Note updated.');
    } else {
      const res = await fetch(`/academy/${area.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, action: 'create-note' })
      });
      if (!res.ok) return;
      const created = await res.json();
      notes = [...notes, created];
      notify('Note created.');
    }
    showNoteForm = false; editNote = null;
  }

  async function handleDeleteNote(id) {
    const res = await fetch(`/academy/${area.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-note', id })
    });
    if (!res.ok) return;
    notes = notes.filter(n => n.id !== id);
    deleteNote = null;
    notify('Note deleted.');
  }
</script>

<div data-section="area-detail">
  <a href="/academy" class="back-link"><ArrowLeft size={16} /><span>Back to Areas</span></a>

    <div class="area-header">
    <DynamicIcon name={area.icon || 'BookOpen'} size={28} color={`var(${area.color || '--cyan'})`} />
    <div class="area-info">
      <h2 class="area-name">{area.name}</h2>
      {#if area.description}<p class="area-desc">{area.description}</p>{/if}
    </div>
    <div class="area-actions">
      <button type="button" class="icon-btn edit-btn" onclick={() => showEditForm = true} title="Edit"><Pencil size={18} /></button>
      <button type="button" class="icon-btn delete-btn" onclick={() => showDelete = true} title="Delete"><Trash2 size={18} /></button>
    </div>
  </div>

  <div class="detail-grid">
    <Panel title="Courses" icon={Plus}>
      {#snippet headerRight()}
        <button type="button" class="panel-add-btn" onclick={() => { editCourse = null; showCourseForm = true; }}>
          <Plus size={16} /><span>New Course</span>
        </button>
        <button type="button" class="panel-add-btn" onclick={cycleCourseDensity} title="Density">
          <svelte:component this={densityIcons[courseDensity]} size={16} />
        </button>
      {/snippet}
      {#if courses.length === 0}
        <div class="empty-state">No courses yet.</div>
      {:else}
        <div class="course-grid density-{courseDensity}">
          {#each courses as course (course.id)}
            <CourseCard {course} areaId={area.id} density={courseDensity} onedit={(c) => { editCourse = { ...c }; showCourseForm = true; }} ondelete={(c) => deleteCourse = c} />
          {/each}
        </div>
      {/if}
    </Panel>

    <Panel title="Notes" icon={Plus}>
      {#snippet headerRight()}
        <button type="button" class="panel-add-btn" onclick={() => { editNote = null; showNoteForm = true; }}>
          <Plus size={16} /><span>New Note</span>
        </button>
      {/snippet}
      {#if notes.length === 0}
        <div class="empty-state">No notes yet.</div>
      {:else}
        <div class="note-list">
          {#each notes as note (note.id)}
            <NoteCard {note} onedit={(n) => { editNote = { ...n }; showNoteForm = true; }} ondelete={(n) => deleteNote = n} />
          {/each}
        </div>
      {/if}
    </Panel>
  </div>
</div>

{#if showEditForm}
  <Modal open={true} title="Edit Area" onclose={() => showEditForm = false}>
    <AreaForm area={area} onsave={handleEditArea} oncancel={() => showEditForm = false} />
  </Modal>
{/if}

{#if showDelete}
  <Modal open={true} title="Delete Area" compact onclose={() => showDelete = false}>
    <DeleteConfirm title="Delete Area" item={area} onconfirm={handleDeleteArea} oncancel={() => showDelete = false} />
  </Modal>
{/if}

{#if showCourseForm}
  <Modal open={true} title={editCourse ? 'Edit Course' : 'Add Course'} onclose={() => { showCourseForm = false; editCourse = null; }}>
    <CourseForm course={editCourse} onsave={handleSaveCourse} oncancel={() => { showCourseForm = false; editCourse = null; }} />
  </Modal>
{/if}

{#if deleteCourse}
  <Modal open={true} title="Delete Course" compact onclose={() => deleteCourse = null}>
    <DeleteConfirm title="Delete Course" item={deleteCourse} onconfirm={(id) => handleDeleteCourse(id)} oncancel={() => deleteCourse = null} />
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
  .area-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
  .area-info { flex: 1; }
  .area-name { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; }
  .area-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 4px 0 0; }
  .area-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .icon-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: none; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; color: var(--text-dim); padding: 0; transition: all 0.2s; }
  .edit-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .delete-btn:hover { color: var(--danger); border-color: var(--danger); }
  .detail-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; margin-bottom: 16px; }
  .empty-state { text-align: center; padding: 32px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .course-grid { display: grid; }
  .course-grid.density-compact { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; }
  .course-grid.density-normal { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
  .course-grid.density-large { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .note-list { display: flex; flex-direction: column; gap: 6px; }
  .panel-add-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--bg-card); border: 1px solid var(--cyan); border-radius: var(--radius); color: var(--cyan); cursor: pointer; font-family: var(--font-body); font-size: var(--fs-body); transition: all 0.2s; }
  .panel-add-btn:hover { background: rgba(0,212,255,0.1); }
</style>
