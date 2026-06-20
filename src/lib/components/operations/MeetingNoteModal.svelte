<script>
  import { X, RefreshCw } from '@lucide/svelte';
  import DatePicker from './DatePicker.svelte';
  import DocumentForgeEditor from './DocumentForgeEditor.svelte';
  import { notify } from '$lib/stores/notification.js';
  import MeetingNoteAiReview from './MeetingNoteAiReview.svelte';
  import MeetingNoteTaskList from './MeetingNoteTaskList.svelte';

  let { meetingNote = null, onSave, onCancel, projects = [], clientId, clients = [], onEditTask, onOpenTask, taskReloadTrigger = 0 } = $props();

  let title = $state(meetingNote?.title || '');
  let meetingDate = $state(meetingNote?.meeting_date || new Date().toISOString().split('T')[0]);
  let projectId = $state(meetingNote?.project_id || (projects.length > 0 ? projects[0].id : null));
  let notes = $state(meetingNote?.notes || '');
  let transcript = $state(meetingNote?.transcript || '');
  let noteId = $derived(meetingNote?.id);

  let activeTab = $state('notes');
  let isProcessing = $state(false);
  let processingError = $state('');
  let reviewResult = $state(null);
  let showReviewModal = $state(false);
  let ediConfig = $state(null);
  let taskListEl = $state(null);
  let processedOnce = $state(!!(meetingNote?.transcript && meetingNote?.notes));

  let showReprocessPrompt = $state(false);
  let reprocessResult = $state(null);
  let reprocessTasksSelected = $state([]);
  let reprocessContactsSelected = $state([]);
  let reprocessTaskUpdatesSelected = $state([]);
  let reprocessStorySelected = $state(true);
  let reprocessNotesSelected = $state(true);

  async function loadEdiConfig() {
    try {
      const res = await fetch('/settings/edi');
      const data = await res.json();
      ediConfig = data.config;
    } catch {}
  }

  $effect(() => { loadEdiConfig(); });

  const isKeyConfigured = $derived(
    ediConfig ? ((ediConfig.agentProvider || 'gemini') === 'gemini' ? !!ediConfig.googleApiKey : !!ediConfig.deepseekApiKey) : true
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      meeting_date: meetingDate,
      project_id: projectId,
      notes,
      transcript
    };
    const unsourcedTaskIds = taskListEl ? taskListEl.getUnsourcedTaskIds() : [];
    if (unsourcedTaskIds.length > 0) payload.unsourced_task_ids = unsourcedTaskIds;
    onSave(payload);
  }

  async function processTranscript() {
    if (!transcript.trim()) {
      processingError = 'Transcript is empty.';
      return;
    }
    isProcessing = true;
    processingError = '';
    try {
      const url = projectId
        ? `/operations/projects/${projectId}/meeting-notes/process`
        : `/operations/clients/${clientId}/meeting-notes/process`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title, meetingDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process transcript.');
      reviewResult = data.result;
      processedOnce = true;
      showReviewModal = true;
    } catch (err) {
      processingError = err.message || 'Processing failed';
    } finally {
      isProcessing = false;
    }
  }

  async function deepReviewTranscript() {
    if (!transcript.trim()) return;
    isProcessing = true;
    processingError = '';
    try {
      const url = projectId
        ? `/operations/projects/${projectId}/meeting-notes/process`
        : `/operations/clients/${clientId}/meeting-notes/process`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title, meetingDate, deepReview: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to perform deep review.');
      reviewResult = data.result;
      notify('EDI: Deep review complete. Ingestion proposal updated.');
    } catch (err) {
      processingError = err.message || 'Deep review failed';
      notify(`EDI Error: ${processingError}`);
    } finally {
      isProcessing = false;
    }
  }

  async function reprocessTranscript() {
    if (!transcript.trim()) {
      processingError = 'Transcript is empty.';
      return;
    }
    isProcessing = true;
    processingError = '';
    try {
      const url = projectId
        ? `/operations/projects/${projectId}/meeting-notes/process`
        : `/operations/clients/${clientId}/meeting-notes/process`;
      
      const currentAlreadyFound = {
        meeting_note: { title: title.trim(), summary: notes },
        tasks: reviewResult?.tasks || [],
        contacts: reviewResult?.contacts || [],
        story_entries: reviewResult?.story_entries || (reviewResult?.story_entry ? [reviewResult.story_entry] : []),
        task_updates: reviewResult?.task_updates || []
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          title,
          meetingDate,
          reprocess: true,
          meetingNoteId: noteId || null,
          alreadyFound: currentAlreadyFound
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reprocess transcript.');
      
      const missed = data.result.missed;
      if (missed && missed.has_missed) {
        reprocessResult = missed;
        reprocessTasksSelected = (missed.tasks || []).map(() => true);
        reprocessContactsSelected = (missed.contacts || []).map(() => true);
        reprocessTaskUpdatesSelected = (missed.task_updates || []).map(() => true);
        reprocessStorySelected = !!missed.story_entry;
        reprocessNotesSelected = !!missed.meeting_note?.summary_additions;
        showReprocessPrompt = true;
      } else {
        notify('EDI: Reprocessing complete. No missed information identified.');
      }
    } catch (err) {
      processingError = err.message || 'Reprocessing failed';
      notify(`EDI Error: ${processingError}`);
    } finally {
      isProcessing = false;
    }
  }

  function handleConfirmReprocess() {
    if (!reprocessResult) return;

    if (!reviewResult) {
      reviewResult = {
        meeting_note: {
          title: title.trim(),
          summary: notes
        },
        tasks: [],
        contacts: [],
        story_entry: null,
        task_updates: []
      };
    }

    const newTasks = (reprocessResult.tasks || [])
      .filter((_, idx) => reprocessTasksSelected[idx])
      .map(t => ({ ...t, selected: true }));
    reviewResult.tasks = [...(reviewResult.tasks || []), ...newTasks];

    const newContacts = (reprocessResult.contacts || [])
      .filter((_, idx) => reprocessContactsSelected[idx])
      .map(c => ({ ...c, selected: true }));
    reviewResult.contacts = [...(reviewResult.contacts || []), ...newContacts];

    const newTaskUpdates = (reprocessResult.task_updates || [])
      .filter((_, idx) => reprocessTaskUpdatesSelected[idx])
      .map(tu => ({ ...tu, selected: true }));
    reviewResult.task_updates = [...(reviewResult.task_updates || []), ...newTaskUpdates];

    if (reprocessStorySelected) {
      if (reprocessResult.story_entries && Array.isArray(reprocessResult.story_entries)) {
        const newEntries = reprocessResult.story_entries.map(s => ({ ...s, selected: true }));
        reviewResult.story_entries = [...(reviewResult.story_entries || []), ...newEntries];
      } else if (reprocessResult.story_entry) {
        const newEntry = {
          title: reprocessResult.story_entry.title || 'Meeting Summary Narrative',
          body: reprocessResult.story_entry.body || '',
          selected: true
        };
        reviewResult.story_entries = [...(reviewResult.story_entries || []), newEntry];
      }
    }

    if (reprocessNotesSelected && reprocessResult.meeting_note?.summary_additions) {
      const additions = reprocessResult.meeting_note.summary_additions;
      notes += (notes ? '\n\n' : '') + additions;
      reviewResult.meeting_note.summary = notes;
    }

    showReprocessPrompt = false;
    showReviewModal = true;
    notify('EDI: Missed items added to ingestion proposal.');
  }

  async function handleConfirmReview(reviewData) {
    isProcessing = true;
    processingError = '';
    try {
      let currentNoteId = noteId;
      const targetProjectId = projectId || null;
      if (!currentNoteId) {
        const url = targetProjectId 
          ? `/operations/projects/${targetProjectId}/meeting-notes`
          : `/operations/clients/${clientId}/meeting-notes`;
        const createRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            meeting_date: meetingDate,
            project_id: targetProjectId,
            notes: reviewData.notesText || notes,
            transcript: transcript
          })
        });
        if (!createRes.ok) throw new Error('Failed to create meeting note.');
        const newNote = await createRes.json();
        currentNoteId = newNote.id;
      }
      const ingestUrl = targetProjectId
        ? `/operations/projects/${targetProjectId}/meeting-notes/ingest`
        : `/operations/clients/${clientId}/meeting-notes/ingest`;
      const ingestRes = await fetch(ingestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNoteId: currentNoteId,
          tasks: reviewData.tasks,
          contacts: reviewData.contacts,
          storyEntries: reviewData.storyEntries,
          taskUpdates: reviewData.taskUpdates,
          notesText: reviewData.notesText,
          clientId: clientId,
          projectId: targetProjectId
        })
      });
      if (!ingestRes.ok) throw new Error('Ingestion failed');
      const ingestResult = await ingestRes.json();
      notify(`Commander: ${ingestResult.message}`);
      showReviewModal = false;
      onSave({
        title: title.trim(),
        meeting_date: meetingDate,
        project_id: targetProjectId,
        notes: reviewData.notesText,
        transcript: transcript
      });
    } catch (err) {
      processingError = err.message || 'Ingestion failed';
    } finally {
      isProcessing = false;
    }
  }
</script>

<form data-section="meeting-note-modal" class="modal-form" style="position: relative;" onsubmit={handleSubmit}>
  {#if isProcessing}
    <div class="processing-overlay" data-section="processing-indicator">
      <div class="processing-spinner"></div>
      <div class="processing-text">EDI is analyzing transcript...</div>
    </div>
  {/if}
  <div class="modal-grid">
    <div class="left-col">
      <div class="field">
        <span class="field-label">Title</span>
        <input type="text" class="input" placeholder="Meeting title" bind:value={title} required />
      </div>
      <div class="field">
        <span class="field-label">Date</span>
        <DatePicker value={meetingDate} onchange={(v) => meetingDate = v} />
      </div>
      {#if projects.length > 0}
        <div class="field">
          <span class="field-label">Project</span>
          <select class="input select-input" bind:value={projectId}>
            <option value={null}>No project</option>
            {#each projects as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      <MeetingNoteTaskList bind:this={taskListEl} {noteId} {projectId} {clientId} {onEditTask} {onOpenTask} {taskReloadTrigger} />
    </div>
    <div class="right-col">
      <div class="tab-headers">
        <button type="button" class="tab-btn" class:active={activeTab === 'notes'} onclick={() => activeTab = 'notes'}>Notes</button>
        <button type="button" class="tab-btn" class:active={activeTab === 'transcript'} onclick={() => activeTab = 'transcript'}>Transcript</button>
      </div>
      {#if activeTab === 'notes'}
        <div class="field field-notes">
          <div class="editor-wrap">
            <DocumentForgeEditor bind:contentMarkdown={notes} class="notes-inline-editor" />
          </div>
        </div>
      {:else}
        <div class="field field-notes">
          {#if !isKeyConfigured}
            <div class="warning-banner">
              âš ï¸ Warning: API Key for provider ({ediConfig?.agentProvider || 'gemini'}) is not configured.
              Please configure it in <a href="/settings/edi" class="settings-link">EDI AI Settings</a>.
            </div>
          {/if}
          {#if processingError}
            <div class="error-banner">
              âŒ {processingError}
            </div>
          {/if}
          {#if reviewResult || processedOnce}
            <div class="processed-status-row" data-section="processed-status">
              <span class="processed-badge">âœ“ Transcript Processed</span>
              {#if reviewResult}
                <button type="button" class="btn btn-review-reopen" onclick={() => showReviewModal = true}>
                  Open Ingestion Review
                </button>
              {/if}
            </div>
          {/if}
          <textarea class="textarea notes-textarea" placeholder="Paste meeting transcript here..." bind:value={transcript}></textarea>
          {#if processedOnce}
            <button type="button" class="btn btn-process" onclick={reprocessTranscript} disabled={isProcessing || !transcript.trim()}>
              {isProcessing ? 'Reprocessing...' : 'Reprocess Transcript'}
            </button>
          {:else}
            <button type="button" class="btn btn-process" onclick={processTranscript} disabled={isProcessing || !transcript.trim()}>
              {isProcessing ? 'Processing...' : 'Process Transcript'}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={onCancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!title.trim()}>Save</button>
  </div>
</form>

{#if showReviewModal && reviewResult}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => showReviewModal = false}>
    <div data-section="modal" class="modal review-modal-large" style="position: relative;" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      {#if isProcessing}
        <div class="processing-overlay" data-section="processing-indicator">
          <div class="processing-spinner"></div>
          <div class="processing-text">EDI is performing deep review...</div>
        </div>
      {/if}
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Review Ingestion Proposal</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn-deep-review" onclick={deepReviewTranscript} disabled={isProcessing} title="Run Deep Review">
            <RefreshCw size={12} class={isProcessing ? 'animate-spin' : ''} />
            <span>Deep Review</span>
          </button>
          <button type="button" data-label="modal-close" class="close-btn" onclick={() => showReviewModal = false}><X size={18} /></button>
        </div>
      </div>
      <div data-label="modal-body" class="modal-body">
        <MeetingNoteAiReview result={reviewResult} {clients} {clientId} {projectId} onConfirm={handleConfirmReview} onCancel={() => showReviewModal = false} />
      </div>
    </div>
  </div>
{/if}

{#if showReprocessPrompt && reprocessResult}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={() => showReprocessPrompt = false}>
    <div data-section="modal" class="modal reprocess-prompt-modal" style="position: relative;" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      {#if isProcessing}
        <div class="processing-overlay" data-section="processing-indicator">
          <div class="processing-spinner"></div>
          <div class="processing-text">EDI is merging items...</div>
        </div>
      {/if}
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">EDI Reprocess Proposal</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showReprocessPrompt = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body scrollable-body">
        <div class="edi-prompt-box">
          <span class="edi-prefix">EDI:</span>
          <p class="edi-message">{reprocessResult.explanation || "Okay, I have identified some missed information in the transcript."}</p>
        </div>

        {#if reprocessResult.tasks && reprocessResult.tasks.length > 0}
          <div class="reprocess-section box-tasks">
            <span class="section-label">Missed Tasks</span>
            <div class="reprocess-list">
              {#each reprocessResult.tasks as task, idx}
                <label class="reprocess-item" class:unselected={!reprocessTasksSelected[idx]}>
                  <input type="checkbox" bind:checked={reprocessTasksSelected[idx]} />
                  <div class="item-text">
                    <span class="item-title">{task.title}</span>
                    {#if task.description}
                      <span class="item-desc">{task.description}</span>
                    {/if}
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        {#if reprocessResult.contacts && reprocessResult.contacts.length > 0}
          <div class="reprocess-section box-contacts">
            <span class="section-label">Missed Contacts</span>
            <div class="reprocess-list">
              {#each reprocessResult.contacts as contact, idx}
                <label class="reprocess-item" class:unselected={!reprocessContactsSelected[idx]}>
                  <input type="checkbox" bind:checked={reprocessContactsSelected[idx]} />
                  <div class="item-text">
                    <span class="item-title">{contact.name}</span>
                    {#if contact.designation}
                      <span class="item-desc">{contact.designation}</span>
                    {/if}
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        {#if reprocessResult.task_updates && reprocessResult.task_updates.length > 0}
          <div class="reprocess-section box-tasks">
            <span class="section-label">Missed Task Updates</span>
            <div class="reprocess-list">
              {#each reprocessResult.task_updates as tu, idx}
                <label class="reprocess-item" class:unselected={!reprocessTaskUpdatesSelected[idx]}>
                  <input type="checkbox" bind:checked={reprocessTaskUpdatesSelected[idx]} />
                  <div class="item-text">
                    <span class="item-title">{tu.title} âž” <span class="status-badge-update {tu.status}">{tu.status}</span></span>
                    {#if tu.explanation}
                      <span class="item-desc">{tu.explanation}</span>
                    {/if}
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        {#if (reprocessResult.story_entries && reprocessResult.story_entries.length > 0) || (reprocessResult.story_entry && reprocessResult.story_entry.body)}
          <div class="reprocess-section box-subtasks">
            <span class="section-label">Missed Story Milestone</span>
            <label class="reprocess-item" class:unselected={!reprocessStorySelected}>
              <input type="checkbox" bind:checked={reprocessStorySelected} />
              <div class="item-text">
                {#if reprocessResult.story_entries && reprocessResult.story_entries.length > 0}
                  {#each reprocessResult.story_entries as s}
                    <span class="item-title">{s.title || 'Milestone Addition'}</span>
                    <span class="item-desc">{s.body}</span>
                  {/each}
                {:else if reprocessResult.story_entry}
                  <span class="item-title">{reprocessResult.story_entry.title || 'Milestone Addition'}</span>
                  <span class="item-desc">{reprocessResult.story_entry.body}</span>
                {/if}
              </div>
            </label>
          </div>
        {/if}

        {#if reprocessResult.meeting_note?.summary_additions}
          <div class="reprocess-section box-links">
            <span class="section-label">Missed Notes Details</span>
            <label class="reprocess-item" class:unselected={!reprocessNotesSelected}>
              <input type="checkbox" bind:checked={reprocessNotesSelected} />
              <div class="item-text">
                <span class="item-desc">{reprocessResult.meeting_note.summary_additions}</span>
              </div>
            </label>
          </div>
        {/if}
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-cancel" onclick={() => showReprocessPrompt = false}>Dismiss</button>
        <button type="button" class="btn btn-save" onclick={handleConfirmReprocess}>Add to Current Areas</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.review-modal-large) {
    max-width: 70% !important;
    width: 70% !important;
    max-height: 80vh !important;
    height: 80vh !important;
  }
  :global(.review-modal-large .modal-body) {
    padding: 24px !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .btn-deep-review {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 6px 12px;
    height: 32px;
    border-radius: var(--radius);
    border: 1px solid var(--amber);
    background: transparent;
    color: var(--amber);
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s ease-in-out;
  }
  .btn-deep-review:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.1);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
  }
  .btn-deep-review:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .scrollable-body {
    max-height: 55vh;
    overflow-y: auto;
    padding-right: 8px;
  }
  .scrollable-body::-webkit-scrollbar {
    width: 4px;
  }
  .scrollable-body::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }
  .edi-prompt-box {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 12px;
    margin-bottom: 16px;
  }
  .edi-prefix {
    font-family: var(--font-heading-1);
    font-weight: 700;
    font-size: var(--fs-heading-2);
    color: var(--cyan);
    text-shadow: 0 0 10px var(--cyan-glow);
  }
  .edi-message {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    margin: 0;
    line-height: 1.4;
  }
  .reprocess-section {
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 12px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .reprocess-section .section-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-glow);
    padding-bottom: 4px;
  }
  .reprocess-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .reprocess-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .reprocess-item:hover {
    border-color: var(--cyan-dim);
  }
  .reprocess-item.unselected {
    opacity: 0.5;
  }
  .reprocess-item input[type="checkbox"] {
    margin-top: 3px;
    accent-color: var(--cyan);
  }
  .item-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-body);
  }
  .item-title {
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
  }
  .item-desc {
    font-size: var(--fs-body);
    color: var(--text-dim);
    white-space: pre-wrap;
  }
  :global(.reprocess-prompt-modal) {
    max-width: 50% !important;
    width: 50% !important;
    max-height: 80vh !important;
  }
  .box-contacts {
    background: rgba(0, 136, 255, 0.04);
  }
  .status-badge-update { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; display: inline-block; }
  .status-badge-update.completed { background: rgba(34, 197, 94, 0.15); color: var(--success); border-color: var(--success); }
  .status-badge-update.in-progress { background: rgba(0, 212, 255, 0.15); color: var(--cyan); border-color: var(--cyan); }
  .status-badge-update.on-hold { background: rgba(234, 179, 8, 0.15); color: #eab308; border-color: #eab308; }
  .editor-wrap { flex: 1; min-height: 0; border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 5px; }
  :global(.notes-inline-editor) { flex: 1; min-height: 220px; }
  :global(.notes-inline-editor .blocks-list) { padding: 10px; max-width: none; }
  :global(.notes-inline-editor .btn-add-block) { margin-top: 8px; }
</style>
