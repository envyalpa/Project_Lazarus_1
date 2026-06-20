<script>
  let { course = null, onsave, oncancel } = $props();

  let name = $state(course?.name || '');
  let description = $state(course?.description || '');
  let status = $state(course?.status || 'in-progress');
  let started_on = $state(course?.started_on || '');
  let completed_on = $state(course?.completed_on || '');
  let course_url = $state(course?.course_url || '');
  let cover_image = $state(course?.cover_image || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      description: description.trim(),
      status,
      started_on,
      completed_on,
      course_url: course_url.trim(),
      cover_image: cover_image.trim()
    });
  }
</script>

<form data-section="course-form" onsubmit={handleSubmit}>
  <div class="field">
    <label data-label="field-label" for="course-name">Name</label>
    <input id="course-name" type="text" class="input" placeholder="Course name" bind:value={name} required />
  </div>

  <div class="field">
    <label data-label="field-label" for="course-desc">Description</label>
    <textarea id="course-desc" class="input textarea" rows="3" placeholder="Course description..." bind:value={description}></textarea>
  </div>

  <div class="field-row">
    <div class="field flex-1">
      <label data-label="field-label" for="course-status">Status</label>
      <select id="course-status" class="input" bind:value={status}>
        <option value="not-started">Not Started</option>
        <option value="in-progress">In Progress</option>
        <option value="on-hold">On Hold</option>
        <option value="completed">Completed</option>
      </select>
    </div>
    <div class="field flex-1">
      <label data-label="field-label" for="course-started">Started On</label>
      <input id="course-started" type="date" class="input" bind:value={started_on} />
    </div>
    <div class="field flex-1">
      <label data-label="field-label" for="course-completed">Completed On</label>
      <input id="course-completed" type="date" class="input" bind:value={completed_on} />
    </div>
  </div>

  <div class="field-row">
    <div class="field flex-1">
      <label data-label="field-label" for="course-url">Course URL</label>
      <input id="course-url" type="url" class="input" placeholder="https://example.com/course" bind:value={course_url} />
    </div>
    <div class="field flex-1">
      <label data-label="field-label" for="course-cover">Cover Image</label>
      <input id="course-cover" type="url" class="input" placeholder="https://example.com/cover.jpg" bind:value={cover_image} />
    </div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={oncancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!name.trim()}>{course ? 'Save' : 'Create'}</button>
  </div>
</form>

<style>
  form[data-section="course-form"] { display: flex; flex-direction: column; gap: 20px; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-row { display: flex; gap: 16px; }
  .flex-1 { flex: 1; }

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
