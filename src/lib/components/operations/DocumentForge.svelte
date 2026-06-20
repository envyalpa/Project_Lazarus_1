<script>
  import { onMount } from 'svelte';
  import { notify } from '$lib/stores/notification.js';
  import ForgeWorkspace from './ForgeWorkspace.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { Loader2, X, Trash2, User, History } from '@lucide/svelte';
  
  let { client, project = null, onclose } = $props();

  let stage = $state('refine'); 
  let messages = $state([]);
  let compiling = $state(false);
  let documentTitle = $state('Untitled Document');
  let contentMarkdown = $state('# Draft Document\n\nWaiting for build...');
  let sidebarCollapsed = $state(false);
  let selectedPersona = $state('consulting');
  let dropdownOpen = $state(false);
  let copilotMode = $state('edit');

  const personas = [
    { id: 'consulting', label: 'Consulting Expert' },
    { id: 'marketing', label: 'Marketing Expert' },
    { id: 'reports', label: 'Reports Expert' },
    { id: 'technical', label: 'Technical Architect' },
    { id: 'operations', label: 'Operations Expert' },
    { id: 'pm', label: 'Product Manager' },
    { id: 'legal', label: 'Legal Advisor' }
  ];

  let activePersonaLabel = $derived(
    personas.find(p => p.id === selectedPersona)?.label || 'Consulting Expert'
  );

  function handleWindowClick(event) {
    if (dropdownOpen && !event.target.closest('.persona-selector')) {
      dropdownOpen = false;
    }
  }

  async function initializeNewSession() {
    contentMarkdown = '# Draft Document\n\nUse the chat panel on the right to start forging your document...';
    documentTitle = `${client.name} Custom Draft`;
    currentDocumentId = null;
    messages = [];
    stage = 'refine';

    try {
      const res = await fetch(`/operations/clients/${client.id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: documentTitle, messages, project_id: project ? project.id : null })
      });
      if (res.ok) {
        const conv = await res.json();
        currentConversationId = conv.id;
      }
      await loadHistory();
    } catch (e) {
      console.error('Failed to initialize session', e);
    }
  }
  
  let currentConversationId = $state(null);
  let currentDocumentId = $state(null);

  let historyDocs = $state([]);
  let historyConversations = $state([]);

  async function loadHistory() {
    try {
      const projParam = project ? `?project_id=${project.id}` : '';
      const resDocs = await fetch(`/operations/clients/${client.id}/documents${projParam}`);
      if (resDocs.ok) historyDocs = await resDocs.json();
      const resConvs = await fetch(`/operations/clients/${client.id}/conversations${projParam}`);
      if (resConvs.ok) historyConversations = await resConvs.json();
    } catch (e) {
      console.error('History load failed', e);
    }
  }

  async function deleteDoc(docId) {
    if (!confirm('Are you sure you want to delete this draft document, Commander?')) return;
    try {
      const res = await fetch(`/operations/clients/${client.id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId })
      });
      if (res.ok) {
        if (currentDocumentId === docId) {
          currentDocumentId = null;
          contentMarkdown = '';
        }
        notify('Document draft deleted.');
        await loadHistory();
      } else {
        const err = await res.json();
        notify('Delete failed: ' + (err.error || 'unknown error'));
      }
    } catch (e) {
      notify('Delete error: ' + e.message);
    }
  }

  async function deleteConv(convId) {
    if (!confirm('Are you sure you want to delete this active chat session, Commander?')) return;
    try {
      const res = await fetch(`/operations/clients/${client.id}/conversations?id=${convId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (currentConversationId === convId) {
          currentConversationId = null;
          messages = [];
        }
        notify('Conversation session deleted.');
        await loadHistory();
      } else {
        const err = await res.json();
        notify('Delete failed: ' + (err.error || 'unknown error'));
      }
    } catch (e) {
      notify('Delete error: ' + e.message);
    }
  }

  onMount(async () => {
    await loadHistory();
    if (!currentDocumentId && historyDocs.length === 0) {
      await initializeNewSession();
    }
  });

  async function callCompile(payloadStage, customPrompt) {
    compiling = true;
    try {
      const res = await fetch(`/operations/clients/${client.id}/documents/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          history: messages,
          currentDocument: contentMarkdown,
          stage: payloadStage,
          persona: selectedPersona,
          mode: copilotMode
        })
      });
      if (!res.ok) throw new Error('API compile failed');
      return res;
    } catch (err) {
      notify('AI Synthesis Error: ' + err.message);
      compiling = false;
      return null;
    }
  }

  async function persistConversation() {
    if (!currentConversationId) return;
    try {
      await fetch(`/operations/clients/${client.id}/conversations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentConversationId, title: documentTitle, messages })
      });
      await loadHistory();
    } catch (e) {
      console.error('Failed to persist conversation', e);
    }
  }

  async function persistDocumentDraft() {
    try {
      const res = await fetch(`/operations/clients/${client.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDocumentId || undefined,
          title: documentTitle,
          content_markdown: contentMarkdown,
          conversation_id: currentConversationId,
          project_id: project ? project.id : null
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.document?.id) currentDocumentId = data.document.id;
      }
      await loadHistory();
    } catch (e) {
      console.error('Failed to persist document', e);
    }
  }

  async function handleSubmitRefine(refineText) {
    compiling = true;
    messages = [...messages, { role: 'user', content: refineText }];
    await persistConversation();
    const res = await callCompile('refine', refineText);
    if (!res) {
      compiling = false;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    if (copilotMode === 'plan') {
      messages = [...messages, { role: 'assistant', content: '' }];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        messages[messages.length - 1].content += chunk;
      }
    } else {
      contentMarkdown = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        contentMarkdown += chunk;
      }
      await persistDocumentDraft();
      messages = [...messages, { role: 'assistant', content: `Draft updated based on: "${refineText}"` }];
    }

    compiling = false;
    await persistConversation();
  }

  async function handleLoadHistory(doc) {
    documentTitle = doc.title;
    contentMarkdown = doc.content_markdown;
    currentDocumentId = doc.id;
    currentConversationId = doc.conversation_id;
    stage = 'refine';
    if (doc.conversation_id) {
      try {
        const res = await fetch(`/operations/clients/${client.id}/conversations?id=${doc.conversation_id}`);
        if (res.ok) {
          const conv = await res.json();
          messages = JSON.parse(conv.messages_json || '[]');
        }
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  }

  async function handleLoadConversation(conv) {
    currentConversationId = conv.id;
    documentTitle = conv.title;
    messages = JSON.parse(conv.messages_json || '[]');
    const associatedDoc = historyDocs.find(d => d.conversation_id === conv.id);
    if (associatedDoc) {
      currentDocumentId = associatedDoc.id;
      contentMarkdown = associatedDoc.content_markdown;
    } else {
      currentDocumentId = null;
      contentMarkdown = '# Draft Document\n\nUse the chat panel on the right to start forging your document...';
    }
    stage = 'refine';
  }

  function restartForge() {
    initializeNewSession();
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div data-section="document-forge-modal" class="forge-modal-fullscreen">
  <div class="forge-modal-header">
    <div class="header-left">
      <h2 class="forge-title">Document Forge</h2>
      {#if project}
        <span class="scope-badge project-badge">{project.name}</span>
      {:else}
        <span class="scope-badge client-badge">{client.name}</span>
      {/if}
    </div>

    <div class="header-right">
      <div data-section="persona-selector" class="persona-selector">
        <button type="button" class="persona-btn" onclick={(e) => { e.stopPropagation(); dropdownOpen = !dropdownOpen; }} title="Select Persona">
          <User size={14} class="persona-icon" />
          <span>{activePersonaLabel}</span>
        </button>
        {#if dropdownOpen}
          <div data-label="persona-dropdown" class="persona-dropdown">
            {#each personas as persona}
              <button
                type="button"
                class="dropdown-item"
                class:active={selectedPersona === persona.id}
                onclick={() => { selectedPersona = persona.id; dropdownOpen = false; }}
              >
                {persona.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <button type="button" class="close-btn" onclick={onclose} title="Exit Forge">
        <X size={18} />
      </button>
    </div>
  </div>

  <div class="forge-modal-body">
    <div class="forge-sidebar" class:collapsed={sidebarCollapsed}>
      <div class="sidebar-inner">
        <Panel title="History" icon={History} stretch={true} class="history-panel">
          <div class="sidebar-content">
            <button type="button" class="btn-new-session" onclick={restartForge}>
              + New Session
            </button>
            <div class="sidebar-scroll">
              <div class="history-section">
                <h4 class="section-title">Saved Drafts</h4>
                {#if historyDocs.length === 0}
                  <p class="empty-text">No drafts found.</p>
                {:else}
                  {#each historyDocs as doc}
                    {@const isAssigned = historyConversations.some(c => c.id === doc.conversation_id)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="history-item" class:active={currentDocumentId === doc.id} onclick={() => handleLoadHistory(doc)}>
                      <div class="item-header">
                        <div class="item-title" title={doc.title}>{doc.title}</div>
                        <button type="button" class="delete-history-btn" onclick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} title="Delete Draft">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div class="item-meta">
                        <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                        {#if isAssigned}
                          <span class="assigned-badge">Draft Assigned</span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
              <div class="history-section">
                <h4 class="section-title">Active Chats</h4>
                {#if historyConversations.length === 0}
                  <p class="empty-text">No active sessions.</p>
                {:else}
                  {#each historyConversations as conv}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="history-item" class:active={currentConversationId === conv.id && !currentDocumentId} onclick={() => handleLoadConversation(conv)}>
                      <div class="item-header">
                        <div class="item-title" title={conv.title}>{conv.title}</div>
                        <button type="button" class="delete-history-btn" onclick={(e) => { e.stopPropagation(); deleteConv(conv.id); }} title="Delete Chat">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div class="item-meta">
                        <span>{new Date(conv.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <div class="forge-workspace-content">
      <ForgeWorkspace
        bind:documentTitle
        bind:contentMarkdown
        {compiling}
        {messages}
        {sidebarCollapsed}
        bind:copilotMode
        onToggleSidebar={() => sidebarCollapsed = !sidebarCollapsed}
        onRestart={restartForge}
        onSubmitRefine={handleSubmitRefine}
        onRename={() => persistDocumentDraft()}
      />
    </div>
  </div>
</div>

<style>
  .forge-modal-fullscreen { position: fixed; inset: 0; z-index: 1000; width: 100vw; height: 100vh; background: #000; display: flex; flex-direction: column; overflow: hidden; }
  .forge-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px var(--border-glow); background: #0a0a0a; flex-shrink: 0; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .forge-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; margin: 0; letter-spacing: 0.5px; text-shadow: 0 0 8px var(--cyan-glow); }
  .scope-badge { font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; padding: 2px 8px; border-radius: var(--radius); text-transform: uppercase; }
  .project-badge { background: rgba(0, 212, 255, 0.12); color: var(--cyan); }
  .client-badge { background: rgba(0, 212, 255, 0.12); color: var(--cyan); }
  
  .forge-stepper { display: flex; align-items: center; gap: 8px; }
  .step-btn { background: transparent; border: none; font-family: var(--font-heading-1); font-size: var(--fs-body); color: var(--text-dim); text-transform: uppercase; padding: 4px 8px; cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; }
  .step-btn:hover { color: var(--cyan); }
  .step-btn.active { color: var(--cyan); font-weight: bold; border-bottom: 2px solid var(--cyan); }
  .step-arrow { color: var(--text-muted); font-size: var(--fs-caption); }
  
  .header-right { display: flex; align-items: center; gap: 12px; }
  .btn-next-stage { background: var(--cyan); color: #000; font-family: var(--font-body); font-weight: 600; font-size: var(--fs-caption); border: none; border-radius: var(--radius); padding: 8px 16px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
  .btn-next-stage:hover { background: #33ddff; box-shadow: 0 0 10px rgba(0, 212, 255, 0.4); }
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    flex-shrink: 0;
  }
  .close-btn:hover {
    color: var(--danger);
    border-color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  .forge-modal-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }
  .forge-sidebar {
    flex-shrink: 0;
    width: 300px;
    height: 100%;
    transition: width 0.2s ease;
    overflow: hidden;
  }
  .sidebar-inner {
    width: 300px;
    height: 100%;
    background: #050505;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
    overflow: hidden;
    box-sizing: border-box;
    transition: opacity 0.2s ease;
  }
  :global(.history-panel) {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    --panel-content-bg: var(--bg-surface);
  }
  :global(.history-panel .panel-content) {
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .forge-sidebar.collapsed {
    width: 0;
  }
  .forge-sidebar.collapsed .sidebar-inner {
    opacity: 0;
  }
  .btn-new-session { background: transparent; border: 1px dashed var(--cyan); border-radius: var(--radius); color: var(--cyan); font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; padding: 8px; cursor: pointer; width: 100%; text-transform: uppercase; }
  .btn-new-session:hover { background: rgba(0, 212, 255, 0.05); }
  
  .sidebar-content {
    display: flex;
    flex-direction: column;
    padding: 16px 8px;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
  }
  .sidebar-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
  .history-section { display: flex; flex-direction: column; gap: 8px; }
  .section-title { font-family: var(--font-heading-1); font-size: var(--fs-caption); color: var(--text-dim); text-transform: uppercase; margin: 0 0 4px 4px; letter-spacing: 1.5px; }
  
  .history-item { padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; background: rgba(10,10,10,0.5); }
  .history-item:hover { border-color: var(--cyan); background: rgba(0, 212, 255, 0.03); }
  .history-item.active { border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); box-shadow: inset 0 0 4px rgba(0, 212, 255, 0.2); }
  .item-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .item-title { font-family: var(--font-body); font-size: var(--fs-caption); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .delete-history-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; border-radius: var(--radius); opacity: 0; }
  .history-item:hover .delete-history-btn { opacity: 1; }
  .delete-history-btn:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }
  .item-meta { display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-caption); color: var(--text-muted); margin-top: 4px; }
  .assigned-badge { color: var(--cyan); font-weight: 600; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-caption); color: var(--text-muted); font-style: italic; margin-left: 4px; }

  .forge-workspace-content { flex: 1; display: flex; flex-direction: column; padding: 0; min-height: 0; overflow-y: auto; box-sizing: border-box; }
  .build-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; margin: auto; }
  .spinner { color: var(--cyan); animation: spin 1s linear infinite; }
  .forge-label { font-family: var(--font-heading-1); font-size: var(--fs-body); color: var(--cyan); text-transform: uppercase; margin: 0; }
  .forge-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  /* Persona Selector CSS */
  .persona-selector {
    position: relative;
    display: flex;
    align-items: center;
    margin-right: 8px;
  }

  .persona-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    text-transform: uppercase;
  }

  .persona-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan-dim);
    background: var(--bg-elevated);
    box-shadow: 0 0 6px var(--cyan-glow);
  }

  .persona-icon {
    color: var(--cyan-dim);
  }

  .persona-btn:hover .persona-icon {
    color: var(--cyan);
  }

  .persona-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    width: 180px;
    background: #0a0a0a;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8), 0 0 8px var(--border-glow);
    padding: 4px;
  }

  .dropdown-item {
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
  }

  .dropdown-item:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .dropdown-item.active {
    color: #000;
    background: var(--cyan);
    font-weight: 600;
    box-shadow: 0 0 8px var(--cyan-glow);
  }
</style>
