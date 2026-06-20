<script>
  import { agentStore } from '$lib/stores/agent.svelte.js';
  import { Send, X, RefreshCw, Sparkles, Check, Trash2, RotateCcw, Pencil, Ban, AlertTriangle, BookOpen, LoaderCircle } from '@lucide/svelte';

  let inputVal = $state('');
  let messagesContainer = $state(null);
  let textareaEl = $state(null);

  let clients = $state([]);
  let projects = $state([]);

  let editingIndex = $state(-1);
  let editText = $state('');

  function startEditing(index, text) {
    editingIndex = index;
    editText = text;
  }

  function cancelEditing() {
    editingIndex = -1;
    editText = '';
  }

  async function saveEditing(index) {
    if (!editText.trim()) return;
    const text = editText;
    editingIndex = -1;
    editText = '';
    await agentStore.retriggerFrom(index, text);
  }

  async function fetchContextData() {
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        fetch('/operations/clients'),
        fetch('/operations/projects')
      ]);
      if (clientsRes.ok) clients = await clientsRes.json();
      if (projectsRes.ok) projects = await projectsRes.json();
    } catch (err) {
      console.error('Failed to fetch clients/projects for EDI sidebar:', err);
    }
  }

  $effect(() => {
    if (agentStore.open) {
      fetchContextData();
    }
  });

  function adjustHeight() {
    if (textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';
    }
  }

  $effect(() => {
    if (inputVal === '') {
      if (textareaEl) {
        textareaEl.style.height = 'auto';
      }
    } else {
      adjustHeight();
    }
  });

  async function handleSend() {
    if (!inputVal.trim() || agentStore.loading) return;
    const txt = inputVal;
    inputVal = '';
    await agentStore.sendMessage(txt);
    scrollToBottom();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
  }

  $effect(() => {
    if (agentStore.open) {
      scrollToBottom();
    }
  });

  // Derived context label
  let contextLabel = $derived.by(() => {
    const path = agentStore.pathname;
    if (path === '/') return 'Bridge Dashboard';
    if (path.startsWith('/operations/projects/')) {
      const proj = agentStore.pageData.project;
      return proj ? `Project: ${proj.name}` : 'Project Detail';
    }
    if (path.startsWith('/operations/clients/')) {
      const client = agentStore.pageData.client;
      return client ? `Client: ${client.name}` : 'Client Detail';
    }
    if (path.startsWith('/operations/tasks/')) {
      const task = agentStore.pageData.task;
      return task ? `Task: ${task.title}` : 'Task Detail';
    }
    return path.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' > ');
  });
</script>

{#if agentStore.open}
  <div data-section="edi-agent-sidebar" class="sidebar-container">
    <div class="sidebar-header">
      <div class="header-top-row">
        <div class="header-title">
          {#if agentStore.loading}
            <div class="edi-avatar-loader"></div>
          {:else}
            <Sparkles size={16} class="glow-icon" />
          {/if}
          <span>EDI AI Assistant</span>
        </div>
        <button class="close-btn" onclick={() => agentStore.toggle()} title="Close Panel">
          <X size={16} />
        </button>
      </div>
      <div class="header-actions-row">
        <span class="context-tag" title="Active page context tracking">
          Context: {contextLabel}
        </span>
        <button class="reset-btn" onclick={() => agentStore.resetChat()} title="New Chat">
          <RotateCcw size={12} />
          <span>New Chat</span>
        </button>
      </div>
    </div>

    <div class="sidebar-messages" bind:this={messagesContainer}>
      {#each agentStore.messages as msg, i}
        <div class="message-row {msg.sender}" class:editing={editingIndex === i}>
          {#if msg.type === 'processing-card'}
            <div class="pc-card">
              <div class="pc-task">"{msg.title}" {msg.taskLabel}</div>
              <span class="pc-badge" class:pc-proc={msg.status === 'processing'} class:pc-done={msg.status === 'complete'} class:pc-fail={msg.status === 'failed'}>{msg.statusText}</span>
              <div class="pc-icon-area">
                {#if msg.status === 'processing'}
                  {#if msg.animIdx === 0}
                    <div class="pc-wave"></div>
                  {:else if msg.animIdx === 1}
                    <div class="pc-ring">
                      <svg viewBox="0 0 100 100" width="100" height="100">
                        <defs>
                          <clipPath id="clip-{i}">
                            <polygon points="50 0, 100 50, 50 100, 0 50" />
                            <polygon points="50 10, 100 60, 50 110, 0 60" />
                            <polygon points="45 5, 95 45, 45 85, -5 45" />
                            <polygon points="55 5, 105 55, 55 105, 5 55" />
                            <polygon points="50 -5, 100 45, 50 95, 0 45" />
                            <polygon points="50 15, 110 65, 50 115, -10 65" />
                            <polygon points="45 -10, 95 40, 45 90, -5 40" />
                          </clipPath>
                        </defs>
                      </svg>
                      <div class="box" style="mask: url(#clip-{i}); -webkit-mask: url(#clip-{i});"></div>
                    </div>
                  {:else}
                    <div class="pc-spin-ring"></div>
                  {/if}
                {:else if msg.status === 'complete'}
                  <div class="pc-check-bg"><Check size="50%" /></div>
                {:else if msg.status === 'failed'}
                  <div class="pc-fail-bg"><X size="50%" /></div>
                {/if}
              </div>
              {#if msg.message}
                <p class="pc-message">{msg.message}</p>
              {/if}
            </div>
          {:else}
            <div class="message-bubble">
              <span class="sender-prefix">{msg.sender === 'edi' ? 'EDI:' : 'YOU:'}</span>
            {#if editingIndex === i}
              <div class="inline-edit-form">
                <textarea bind:value={editText} class="edit-textarea"></textarea>
                <div class="edit-actions">
                  <button type="button" class="btn-save-edit" onclick={() => saveEditing(i)}>Save</button>
                  <button type="button" class="btn-cancel-edit" onclick={cancelEditing}>Cancel</button>
                </div>
              </div>
            {:else}
              <p class="message-text">{msg.text}</p>
              <div class="bubble-actions">
                {#if msg.sender === 'user'}
                  <button type="button" class="action-icon-btn" onclick={() => startEditing(i, msg.text)} title="Edit Message">
                    <Pencil size={12} />
                  </button>
                {/if}
                <button type="button" class="action-icon-btn delete" onclick={() => agentStore.deleteMessage(i)} title="Delete Message">
                  <Trash2 size={12} />
                </button>
              </div>

              {#if msg.proposal}
                <div class="proposal-card">
                  <div class="proposal-header">
                    PROPOSED: {msg.proposal.actionType.replace('create_', '').toUpperCase().replace('_', ' ')}
                  </div>
                  <div class="proposal-details">
                    {#if msg.proposal.actionType === 'create_task'}
                      <div class="field"><strong>Task Name:</strong> {msg.proposal.data.title || msg.proposal.data.name}</div>
                      <div class="field"><strong>Client:</strong> {clients.find(c => String(c.id) === String(msg.proposal.data.client_id || msg.proposal.data.clientId))?.name || 'Unknown Client'}</div>
                      {#if msg.proposal.data.project_id || msg.proposal.data.projectId}
                        <div class="field"><strong>Project:</strong> {projects.find(p => String(p.id) === String(msg.proposal.data.project_id || msg.proposal.data.projectId))?.name || 'Unknown Project'}</div>
                      {/if}
                      {#if msg.proposal.data.description}
                        <div class="field"><strong>Details:</strong> {msg.proposal.data.description}</div>
                      {/if}
                      {#if msg.proposal.data.due_date || msg.proposal.data.dueDate}
                        <div class="field"><strong>Due Date:</strong> {msg.proposal.data.due_date || msg.proposal.data.dueDate}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'update_task'}
                      <div class="field"><strong>Update Task:</strong> {msg.proposal.data.title || `Task #${msg.proposal.data.id}`}</div>
                      {#if msg.proposal.data.notes}
                        <div class="field"><strong>Notes to Update:</strong> {msg.proposal.data.notes}</div>
                      {/if}
                      {#if msg.proposal.data.status}
                        <div class="field"><strong>Status:</strong> {msg.proposal.data.status}</div>
                      {/if}
                      {#if msg.proposal.data.description}
                        <div class="field"><strong>Description:</strong> {msg.proposal.data.description}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'create_time_entry'}
                      <div class="field"><strong>Time Log:</strong> {msg.proposal.data.title || 'Tracked Time'}</div>
                      <div class="field"><strong>Client:</strong> {clients.find(c => String(c.id) === String(msg.proposal.data.client_id || msg.proposal.data.clientId))?.name || 'Unknown Client'}</div>
                      {#if msg.proposal.data.project_id || msg.proposal.data.projectId}
                        <div class="field"><strong>Project:</strong> {projects.find(p => String(p.id) === String(msg.proposal.data.project_id || msg.proposal.data.projectId))?.name || 'Unknown Project'}</div>
                      {/if}
                      <div class="field"><strong>Start Time:</strong> {msg.proposal.data.start_time || msg.proposal.data.startTime || ''}</div>
                      <div class="field"><strong>End Time:</strong> {msg.proposal.data.end_time || msg.proposal.data.endTime || ''}</div>
                      {#if msg.proposal.data.duration_minutes || msg.proposal.data.durationMinutes}
                        <div class="field"><strong>Duration:</strong> {msg.proposal.data.duration_minutes || msg.proposal.data.durationMinutes} mins</div>
                      {/if}
                      {#if msg.proposal.data.description}
                        <div class="field"><strong>Details:</strong> {msg.proposal.data.description}</div>
                      {/if}
                      {#if msg.proposal.data.date}
                        <div class="field"><strong>Date:</strong> {msg.proposal.data.date}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'create_project'}
                      <div class="field"><strong>Project Name:</strong> {msg.proposal.data.name || msg.proposal.data.title}</div>
                      <div class="field"><strong>Client:</strong> {clients.find(c => String(c.id) === String(msg.proposal.data.client_id || msg.proposal.data.clientId))?.name || 'Unknown Client'}</div>
                      {#if msg.proposal.data.description}
                        <div class="field"><strong>Description:</strong> {msg.proposal.data.description}</div>
                      {/if}
                      {#if msg.proposal.data.status}
                        <div class="field"><strong>Status:</strong> {msg.proposal.data.status}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'create_client'}
                      <div class="field"><strong>Client Name:</strong> {msg.proposal.data.name || msg.proposal.data.title}</div>
                      {#if msg.proposal.data.description}
                        <div class="field"><strong>Description:</strong> {msg.proposal.data.description}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'auto_fetch_author'}
                      <div class="field"><strong>Author:</strong> {msg.proposal.data.name}</div>
                      {#if !msg.proposal.data.found}
                        <div class="wiki-notice"><AlertTriangle size={14} /> No Wikipedia page found for this author.</div>
                      {/if}
                      {#if msg.proposal.data.wiki_link}
                        <div class="field"><strong>Wiki:</strong> <a href={msg.proposal.data.wiki_link} target="_blank" class="wiki-link" rel="noreferrer">{msg.proposal.data.wiki_link}</a></div>
                      {/if}
                      {#if msg.proposal.data.image_url}
                        <div class="author-img-wrap"><img src={msg.proposal.data.image_url} alt={msg.proposal.data.name} class="author-thumb" /></div>
                      {/if}
                      {#if msg.proposal.data.summary}
                        <div class="field"><strong>Summary:</strong></div>
                        <div class="summary-text">{msg.proposal.data.summary}</div>
                      {/if}
                    {:else if msg.proposal.actionType === 'regenerate_author_summary'}
                      <div class="field"><strong>Author:</strong> {msg.proposal.data.existingData.name}</div>
                      <div class="field"><strong>Regenerated Summary:</strong></div>
                      <div class="summary-text">{msg.proposal.data.summary}</div>
                    {/if}
                  </div>
                  {#if !msg.proposal.status || msg.proposal.status === 'pending'}
                    {#if msg.proposal.actionType === 'auto_fetch_author'}
                      <div class="proposal-actions">
                        <button class="btn-confirm" onclick={() => agentStore.continueAutoFetch(msg.proposal.data, i)}>
                          <Sparkles size={14} /> Continue
                        </button>
                        <button class="btn-cancel" onclick={() => agentStore.cancelAutoFetch(i)}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    {:else if msg.proposal.actionType === 'regenerate_author_summary'}
                      <div class="proposal-actions">
                        <button class="btn-confirm" onclick={() => agentStore.continueRegenerate(msg.proposal.data, i)}>
                          <Sparkles size={14} /> Continue
                        </button>
                        <button class="btn-cancel" onclick={() => agentStore.cancelProposal(i)}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    {:else}
                      <div class="proposal-actions">
                        <button class="btn-confirm" onclick={() => agentStore.confirmProposal(i)}>
                          <Check size={14} /> Confirm
                        </button>
                        <button class="btn-cancel" onclick={() => agentStore.cancelProposal(i)}>
                          <Trash2 size={14} /> Cancel
                        </button>
                      </div>
                    {/if}
                  {:else}
                    <div class="proposal-status-badge {msg.proposal.status}">
                      {#if msg.proposal.status === 'confirmed'}
                        <Check size={14} />
                        <span>Committed to Database</span>
                      {:else}
                        <X size={14} />
                        <span>Proposal Cancelled</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>
        {/if}
        </div>
      {/each}

      {#if agentStore.loading}
        <div class="loading-indicator">
          <RefreshCw size={16} class="spinner" />
          <span>{agentStore.loadingLabel}</span>
          <button type="button" class="btn-abort" onclick={() => agentStore.stopProcessing()} title="Cancel request">
            <Ban size={12} /> Stop
          </button>
        </div>
      {/if}
    </div>

    <div class="sidebar-input-row">
      <textarea
        bind:this={textareaEl}
        placeholder="Ask EDI or type a command..."
        bind:value={inputVal}
        onkeydown={handleKeydown}
        oninput={adjustHeight}
        disabled={agentStore.loading}
        rows="1"
      ></textarea>
      <button onclick={handleSend} disabled={agentStore.loading || !inputVal.trim()} title="Send command">
        <Send size={16} />
      </button>
    </div>
  </div>
{/if}

<style>
  .sidebar-container {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-glow);
    box-shadow: -5px 0 25px rgba(0, 212, 255, 0.15);
    z-index: 150;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out forwards;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .sidebar-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-card);
  }

  .header-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-actions-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 700;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .glow-icon {
    filter: drop-shadow(0 0 5px var(--cyan-glow));
  }

  .context-tag {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    background: rgba(0, 212, 255, 0.08);
    border: 1px solid var(--cyan-dim);
    padding: 2px 8px;
    border-radius: var(--radius);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reset-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 2px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan-dim);
    background: rgba(0, 212, 255, 0.04);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--danger);
  }

  .sidebar-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scroll-behavior: smooth;
  }

  .message-row {
    display: flex;
    width: 100%;
  }

  .message-row.user {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    line-height: 1.4;
    border: 1px solid var(--border);
  }

  .message-row.edi .message-bubble {
    background: var(--bg-card);
    border-left: 3px solid var(--cyan);
  }

  .message-row.user .message-bubble {
    background: rgba(0, 212, 255, 0.06);
    border-right: 3px solid var(--cyan);
    border-color: var(--cyan-dim);
  }

  .sender-prefix {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 700;
    color: var(--cyan);
    display: block;
    margin-bottom: 4px;
  }

  .message-text {
    margin: 0;
    color: var(--text);
    white-space: pre-line;
  }

  /* Proposal Card inside chat bubble */
  .proposal-card {
    margin-top: 10px;
    background: var(--bg-surface);
    border: 1px dashed var(--cyan);
    border-radius: var(--radius);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .proposal-header {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 700;
    color: var(--amber);
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }

  .proposal-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--fs-body);
  }

  .proposal-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .btn-confirm {
    flex: 1;
    background: var(--cyan);
    color: var(--bg-surface);
    border: none;
    padding: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: var(--radius);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .btn-cancel {
    flex: 1;
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--danger);
    padding: 6px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: var(--radius);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .btn-cancel:hover {
    background: rgba(239, 68, 68, 0.08);
  }

  .proposal-status-badge {
    margin-top: 4px;
    padding: 6px 10px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
  }

  .proposal-status-badge.confirmed {
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid var(--success);
    color: var(--success);
  }

  .proposal-status-badge.cancelled {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid var(--danger);
    color: var(--danger);
  }

  .pc-card {
    margin-top: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .pc-task {
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--amber);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.3;
  }
  .pc-badge {
    display: inline-block;
    padding: 2px 14px;
    border-radius: var(--radius);
    font-family: var(--font-caption);
    font-size: var(--fs-caption);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .pc-badge.pc-proc { background: rgba(0, 212, 255, 0.12); border: 1px solid var(--cyan); color: var(--cyan); }
  .pc-badge.pc-done { background: rgba(34, 197, 94, 0.12); border: 1px solid var(--success); color: var(--success); }
  .pc-badge.pc-fail { background: rgba(239, 68, 68, 0.12); border: 1px solid var(--danger); color: var(--danger); }
  .pc-icon-area {
    width: 40%;
    aspect-ratio: 1;
    margin: 4px auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pc-ring {
    --color-one: var(--cyan);
    --color-two: var(--cyan-dim);
    --color-three: rgba(0,212,255,0.5);
    --color-four: rgba(0,136,179,0.5);
    --color-five: rgba(0,212,255,0.25);
    --time-animation: 2s;
    position: relative;
    border-radius: 50%;
    width: 100%;
    height: 100%;
    box-shadow: 0 0 25px 0 var(--color-three), 0 20px 50px 0 var(--color-four);
    animation: colorize calc(var(--time-animation) * 3) ease-in-out infinite;
  }
  .pc-ring::before {
    content: "";
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border-top: solid 1px var(--color-one);
    border-bottom: solid 1px var(--color-two);
    background: linear-gradient(180deg, var(--color-five), var(--color-four));
    box-shadow: inset 0 10px 10px 0 var(--color-three), inset 0 -10px 10px 0 var(--color-four);
  }
  .pc-ring .box {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, var(--color-one) 30%, var(--color-two) 70%);
  }
  .pc-ring svg {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }
  .pc-ring svg #clipping {
    filter: contrast(15);
    animation: roundness calc(var(--time-animation) / 2) linear infinite;
  }
  .pc-ring svg #clipping polygon { filter: blur(7px); }
  .pc-ring svg #clipping polygon:nth-child(1) { transform-origin: 75% 25%; transform: rotate(90deg); }
  .pc-ring svg #clipping polygon:nth-child(2) { transform-origin: 50% 50%; animation: rotation var(--time-animation) linear infinite reverse; }
  .pc-ring svg #clipping polygon:nth-child(3) { transform-origin: 50% 60%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -3); }
  .pc-ring svg #clipping polygon:nth-child(4) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; }
  .pc-ring svg #clipping polygon:nth-child(5) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; animation-delay: calc(var(--time-animation) / -2); }
  .pc-ring svg #clipping polygon:nth-child(6) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; }
  .pc-ring svg #clipping polygon:nth-child(7) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -1.5); }

  .edi-avatar-loader {
    width: 36px;
    height: 36px;
    background-color: var(--cyan);
    border-radius: 50%;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .edi-avatar-loader::before,
  .edi-avatar-loader::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 45%;
    top: -40%;
    background-color: rgba(255,255,255,0.15);
    animation: wave 5s linear infinite;
  }
  .edi-avatar-loader::before {
    border-radius: 30%;
    background: rgba(255,255,255,0.08);
  }
  .pc-wave {
    width: 100%;
    height: 100%;
    background-color: var(--cyan-dim);
    border-radius: 50%;
    position: relative;
    overflow: hidden;
  }
  .pc-wave::before,
  .pc-wave::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 45%;
    top: -40%;
    background-color: rgba(255,255,255,0.12);
    animation: wave 5s linear infinite;
  }
  .pc-wave::before {
    border-radius: 30%;
    background: rgba(255,255,255,0.06);
  }
  .pc-spin-ring {
    width: 100%;
    height: 100%;
    border: 4px solid var(--border);
    border-top-color: var(--cyan);
    border-radius: 50%;
    box-sizing: border-box;
    animation: spin 1s linear infinite;
  }
  .pc-check-bg {
    width: 100%;
    height: 100%;
    background: var(--success);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    animation: scaleIn 0.4s ease-out forwards;
  }
  .pc-fail-bg {
    width: 100%;
    height: 100%;
    background: var(--danger);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    animation: scaleIn 0.4s ease-out forwards;
  }
  .pc-message {
    margin: 2px 0 0;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  @keyframes scaleIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes roundness {
    0% { filter: contrast(15); }
    20% { filter: contrast(3); }
    40% { filter: contrast(3); }
    60% { filter: contrast(15); }
    100% { filter: contrast(15); }
  }
  @keyframes colorize {
    0% { filter: hue-rotate(0deg); }
    20% { filter: hue-rotate(-30deg); }
    40% { filter: hue-rotate(-60deg); }
    60% { filter: hue-rotate(-90deg); }
    80% { filter: hue-rotate(-45deg); }
    100% { filter: hue-rotate(0deg); }
  }
  @keyframes wave {
    0% { transform: rotate(0); }
    100% { transform: rotate(360deg); }
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
  }

  .spinner {
    animation: spin 1.5s linear infinite;
    color: var(--cyan);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .sidebar-input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border);
    background: var(--bg-card);
  }

  .sidebar-input-row textarea {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    resize: none;
    max-height: 120px;
    min-height: 36px;
    line-height: 1.4;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .sidebar-input-row textarea:focus {
    border-color: var(--cyan);
    outline: none;
    box-shadow: inset 0 0 5px var(--cyan-glow);
  }

  .sidebar-input-row button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--cyan);
    color: var(--bg-surface);
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .sidebar-input-row button:hover:not(:disabled) {
    box-shadow: 0 0 10px var(--cyan-glow);
  }

  .sidebar-input-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .message-bubble {
    position: relative;
  }

  .bubble-actions {
    position: absolute;
    top: -10px;
    right: 10px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2px;
    z-index: 10;
  }

  .message-bubble:hover .bubble-actions {
    opacity: 1;
  }

  .action-icon-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: var(--radius);
    transition: all 0.15s ease;
  }

  .action-icon-btn:hover {
    color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  .action-icon-btn.delete:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  .inline-edit-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }

  .edit-textarea {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    resize: vertical;
    min-height: 60px;
    width: 100%;
    box-sizing: border-box;
    line-height: 1.4;
  }

  .edit-textarea:focus {
    border-color: var(--cyan);
    outline: none;
    box-shadow: inset 0 0 5px var(--cyan-glow);
  }

  .edit-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .btn-save-edit {
    background: var(--cyan);
    color: var(--bg-surface);
    border: none;
    padding: 4px 10px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
  }

  .btn-save-edit:hover {
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .btn-cancel-edit {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
  }

  .btn-cancel-edit:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .btn-abort {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    transition: all 0.2s ease;
  }

  .btn-abort:hover {
    background: rgba(239, 68, 68, 0.08);
  }

  .author-img-wrap {
    display: flex;
    justify-content: center;
    margin: 6px 0;
  }

  .author-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 50%;
    border: 2px solid var(--cyan-dim);
  }

  .summary-text {
    font-size: var(--fs-body);
    line-height: 1.4;
    color: var(--text-dim);
    max-height: 120px;
    overflow-y: auto;
    padding: 4px 0;
  }

  .wiki-link {
    color: var(--cyan);
    font-size: var(--fs-body);
    word-break: break-all;
  }

  .wiki-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    margin: 4px 0;
    background: rgba(255, 140, 0, 0.08);
    border: 1px solid rgba(255, 140, 0, 0.25);
    border-radius: var(--radius);
    color: var(--amber);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
  }
</style>
