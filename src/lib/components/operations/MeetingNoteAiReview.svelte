<script>
  import { CheckSquare, Square, UserPlus, ListTodo, FileText, RefreshCw } from '@lucide/svelte';
  let { result, clients = [], clientId, projectId, onConfirm, onCancel } = $props();

  function resolveClientAndProject(cName, pName) {
    let rClientId = clientId ? Number(clientId) : (clients.length > 0 ? clients[0].id : null);
    let rProjectId = projectId ? Number(projectId) : null;
    if (cName) {
      const cMatch = clients.find(c => c.name.toLowerCase().trim() === cName.toLowerCase().trim());
      if (cMatch) {
        rClientId = cMatch.id;
        const pMatch = pName ? cMatch.projects.find(p => p.name.toLowerCase().trim() === pName.toLowerCase().trim()) : null;
        rProjectId = pMatch ? pMatch.id : null;
      }
    }
    return { clientId: rClientId, projectId: rProjectId };
  }

  let tasks = $state((result.tasks || []).map(t => {
    const res = resolveClientAndProject(t.target_client_name, t.target_project_name);
    return { title: t.title || '', description: t.description || '', due_date: t.due_date || '', client_id: res.clientId, project_id: res.projectId, selected: true };
  }));

  let contacts = $state((result.contacts || []).map(c => {
    const res = resolveClientAndProject(c.target_client_name, null);
    return { name: c.name || '', designation: c.designation || '', email: c.email || '', phone: c.phone || '', client_id: res.clientId, selected: true };
  }));

  let storyEntries = $state([]);
  if (result.story_entries && Array.isArray(result.story_entries)) {
    storyEntries = result.story_entries.map(s => {
      const res = resolveClientAndProject(s.target_client_name, s.target_project_name);
      return { title: s.title || 'Summary Narrative', body: s.body || '', client_id: res.clientId, project_id: res.projectId, is_parent: !!s.is_parent, selected: true };
    });
  } else if (result.story_entry) {
    const s = result.story_entry;
    const res = resolveClientAndProject(s.target_client_name, s.target_project_name);
    storyEntries = [{ title: s.title || 'Summary Narrative', body: s.body || '', client_id: res.clientId, project_id: res.projectId, is_parent: true, selected: true }];
  }

  let taskUpdates = $state((result.task_updates || []).map(tu => ({
    id: tu.id,
    title: tu.title || '',
    status: tu.status || 'completed',
    explanation: tu.explanation || '',
    selected: true
  })));

  let notesText = $state(result.meeting_note?.summary || '');

  function handleIngest() {
    onConfirm({
      tasks: tasks.filter(t => t.selected),
      contacts: contacts.filter(c => c.selected),
      storyEntries: storyEntries.filter(s => s.selected),
      taskUpdates: taskUpdates.filter(tu => tu.selected),
      notesText
    });
  }
</script>

<div data-section="ai-review-panel" class="ai-review">
  <div class="review-scroll-container">
    <div class="review-grid">
      <div class="review-col">
        <div class="review-block notes-block">
          <div class="block-header"><FileText size={14} /><span>AI Meeting Notes Summary</span></div>
          <textarea class="textarea review-notes" bind:value={notesText}></textarea>
        </div>
        <div class="review-block story-block">
          <div class="block-header"><FileText size={14} /><span>Proposed Story Milestones</span></div>
          <div class="items-list">
            {#each storyEntries as s, i}
              <div class="item-row" class:unselected={!s.selected}>
                <button type="button" class="check-btn" onclick={() => s.selected = !s.selected}><svelte:component this={s.selected ? CheckSquare : Square} size={16} /></button>
                <div class="item-fields">
                  <div class="story-header-fields">
                    <input type="text" class="field-input story-title" bind:value={s.title} />
                    <span class="badge-parent">{s.is_parent ? 'Parent' : 'Child'}</span>
                  </div>
                  <textarea class="textarea story-body-review" bind:value={s.body}></textarea>
                  <div class="cascade-row">
                    <select class="select-input" bind:value={s.client_id} onchange={() => s.project_id = null}>
                      {#each clients as c}<option value={c.id}>{c.name}</option>{/each}
                    </select>
                    <select class="select-input" bind:value={s.project_id}>
                      <option value={null}>No Project</option>
                      {#each (clients.find(c => c.id === s.client_id)?.projects || []) as p}<option value={p.id}>{p.name}</option>{/each}
                    </select>
                  </div>
                </div>
              </div>
            {:else}
              <p class="empty-msg">No story entries proposed.</p>
            {/each}
          </div>
        </div>
      </div>
      <div class="review-col">
        <div class="review-block tasks-block">
          <div class="block-header"><ListTodo size={14} /><span>Proposed Tasks</span></div>
          <div class="items-list">
            {#each tasks as t, i}
              <div class="item-row" class:unselected={!t.selected}>
                <button type="button" class="check-btn" onclick={() => t.selected = !t.selected}><svelte:component this={t.selected ? CheckSquare : Square} size={16} /></button>
                <div class="item-fields">
                  <input type="text" class="field-input" bind:value={t.title} />
                  <input type="text" class="field-input desc-input" bind:value={t.description} />
                  <div class="cascade-row">
                    <select class="select-input" bind:value={t.client_id} onchange={() => t.project_id = null}>
                      {#each clients as c}<option value={c.id}>{c.name}</option>{/each}
                    </select>
                    <select class="select-input" bind:value={t.project_id}>
                      <option value={null}>No Project</option>
                      {#each (clients.find(c => c.id === t.client_id)?.projects || []) as p}<option value={p.id}>{p.name}</option>{/each}
                    </select>
                  </div>
                </div>
                <input type="date" class="date-input" bind:value={t.due_date} />
              </div>
            {:else}
              <p class="empty-msg">No tasks identified in this meeting.</p>
            {/each}
          </div>
        </div>
        
        <div class="review-block task-updates-block" data-section="task-updates">
          <div class="block-header"><RefreshCw size={14} /><span>Proposed Task Updates</span></div>
          <div class="items-list">
            {#each taskUpdates as tu}
              <div class="item-row" class:unselected={!tu.selected}>
                <button type="button" class="check-btn" onclick={() => tu.selected = !tu.selected}><svelte:component this={tu.selected ? CheckSquare : Square} size={16} /></button>
                <div class="item-fields">
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span class="update-title">{tu.title}</span>
                    <span class="status-badge-update {tu.status}">{tu.status}</span>
                  </div>
                  {#if tu.explanation}
                    <span class="update-reason">{tu.explanation}</span>
                  {/if}
                </div>
              </div>
            {:else}
              <p class="empty-msg">No task status updates identified.</p>
            {/each}
          </div>
        </div>

        <div class="review-block contacts-block">
          <div class="block-header"><UserPlus size={14} /><span>Proposed Contacts</span></div>
          <div class="items-list">
            {#each contacts as c, i}
              <div class="item-row" class:unselected={!c.selected}>
                <button type="button" class="check-btn" onclick={() => c.selected = !c.selected}><svelte:component this={c.selected ? CheckSquare : Square} size={16} /></button>
                <div class="item-fields flex-row-fields">
                  <input type="text" class="field-input" placeholder="Name" bind:value={c.name} />
                  <input type="text" class="field-input" placeholder="Role" bind:value={c.designation} />
                  <input type="text" class="field-input" placeholder="Email" bind:value={c.email} />
                  <select class="select-input client-select" bind:value={c.client_id}>
                    {#each clients as cl}<option value={cl.id}>{cl.name}</option>{/each}
                  </select>
                </div>
              </div>
            {:else}
              <p class="empty-msg">No new contacts identified.</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={onCancel}>Back</button>
    <button type="button" class="btn btn-save" onclick={handleIngest}>Ingest</button>
  </div>
</div>

<style>
  .ai-review { display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; }
  .review-scroll-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; }
  .review-col { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
  .review-block { border: 1px solid var(--border-glow); border-radius: var(--radius); overflow: hidden; background: rgba(0,212,255,0.02); display: flex; flex-direction: column; min-height: 0; }
  .notes-block { flex: 1; }
  .story-block { flex: 1.5; }
  .tasks-block { flex: 1.3; }
  .task-updates-block { flex: 1.2; }
  .contacts-block { flex: 0.9; }
  .block-header { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(0,0,0,0.25); border-bottom: 1px solid var(--border-glow); font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; }
  .items-list { display: flex; flex-direction: column; gap: 4px; padding: 8px; flex: 1; overflow-y: auto; }
  .items-list::-webkit-scrollbar { width: 4px; }
  .items-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .item-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: var(--radius); }
  .item-row.unselected { opacity: 0.45; }
  .check-btn { background: none; border: none; color: var(--cyan); cursor: pointer; display: flex; align-items: center; padding: 0; }
  .item-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .flex-row-fields { flex-direction: row; gap: 6px; }
  .field-input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 4px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 4px 8px; width: 100%; box-sizing: border-box; }
  .desc-input { font-size: var(--fs-body); color: var(--text-dim); }
  .date-input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 4px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 4px 6px; max-width: 125px; }
  .textarea { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 8px 12px; width: 100%; box-sizing: border-box; resize: none; }
  .review-notes { flex: 1; min-height: 0; border: none; border-radius: 0; }
  .empty-msg { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); text-align: center; }
  .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 8px 18px; border-radius: var(--radius); border: 1px solid var(--modal-border); cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .cascade-row { display: flex; gap: 6px; margin-top: 4px; }
  .cascade-row select, .client-select {
    flex: 1;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 6px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    color: var(--modal-text);
    border-radius: 6px;
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
  }
  .client-select { max-width: 160px; }
  .story-header-fields { display: flex; align-items: center; justify-content: space-between; width: 100%; }
  .story-body-review { min-height: 50px; height: 50px; font-size: var(--fs-body); }
  .badge-parent { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; padding: 2px 6px; border-radius: var(--radius); background: rgba(0, 212, 255, 0.15); color: var(--cyan); border: 1px solid var(--cyan); margin-left: 6px; }
  .update-title { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--modal-text); }
  .update-reason { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); margin-top: 2px; }
  .status-badge-update { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
  .status-badge-update.completed { background: rgba(34, 197, 94, 0.15); color: var(--success); border-color: var(--success); }
  .status-badge-update.in-progress { background: rgba(0, 212, 255, 0.15); color: var(--cyan); border-color: var(--cyan); }
  .status-badge-update.on-hold { background: rgba(234, 179, 8, 0.15); color: #eab308; border-color: #eab308; }
</style>
