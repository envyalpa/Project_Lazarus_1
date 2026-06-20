<script>
  import { ClipboardCopy, Download, RotateCcw, Sparkles, Eye, Code, PenTool, Pencil, Contrast, AlignLeft, AlignCenter, AlignRight } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import Panel from '$lib/components/Panel.svelte';
  import DocumentForgeEditor from './DocumentForgeEditor.svelte';
  import DocumentForgePreview from './DocumentForgePreview.svelte';
  import DocumentForgeChat from './DocumentForgeChat.svelte';

  let { 
    documentTitle = $bindable('Untitled Document'), 
    contentMarkdown = $bindable(), 
    compiling = false, 
    messages = [], 
    sidebarCollapsed = false,
    copilotMode = $bindable('edit'),
    onToggleSidebar,
    onRestart,
    onSubmitRefine,
    onRename
  } = $props();

  let activeViewTab = $state('rich'); 
  let rightSidebarCollapsed = $state(false);
  let editorTheme = $state('black');
  let mode = $state('normal');
  const modeItems = [
    { id: 'normal', label: 'Normal', icon: AlignCenter },
    { id: 'wide', label: 'Wide', icon: AlignLeft },
    { id: 'ultrawide', label: 'Ultra', icon: AlignRight }
  ];

  function toggleEditorTheme() {
    editorTheme = editorTheme === 'black' ? 'white' : 'black';
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(contentMarkdown);
    notify('Copied workspace copy to clipboard.');
  }

  function downloadMarkdown() {
    const blob = new Blob([contentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renameDocument() {
    const newTitle = prompt('Enter new document title:', documentTitle);
    if (newTitle && newTitle.trim()) {
      documentTitle = newTitle.trim();
      if (onRename) onRename(documentTitle);
    }
  }

</script>

<div data-section="forge-workspace" class="workspace-container">
  <Panel title={documentTitle} icon={Sparkles} stretch={true} class="document-panel">
    {#snippet headerLeft()}
      <button type="button" class="header-toggle-btn" onclick={onToggleSidebar} title={sidebarCollapsed ? "Show History" : "Hide History"}>
        {#if sidebarCollapsed}
          <ChevronRight size={16} />
        {:else}
          <ChevronLeft size={16} />
        {/if}
      </button>
      <div class="tabs-group">
        <button type="button" class="tab-btn" class:active={activeViewTab === 'rich'} onclick={() => activeViewTab = 'rich'} title="Rich Editor">
          <PenTool size={14} />
        </button>
        <button type="button" class="tab-btn" class:active={activeViewTab === 'preview'} onclick={() => activeViewTab = 'preview'} title="Preview">
          <Eye size={14} />
        </button>
        <button type="button" class="tab-btn" class:active={activeViewTab === 'code'} onclick={() => activeViewTab = 'code'} title="Code">
          <Code size={14} />
        </button>
      </div>
      <div class="mode-group">
        {#each modeItems as mi}
          <button
            type="button"
            class="mode-btn"
            class:active={mode === mi.id}
            onclick={() => mode = mi.id}
            title={mi.label}
          >
            <mi.icon size={13} />
            <span>{mi.label}</span>
          </button>
        {/each}
      </div>

    {/snippet}

    {#snippet headerRight()}
      <div class="header-actions">
        <button type="button" class="btn btn-theme" onclick={toggleEditorTheme} title={editorTheme === 'black' ? "Switch to White Canvas" : "Switch to Black Canvas"}>
          <Contrast size={14} />
        </button>
        <button type="button" class="btn btn-rename" onclick={renameDocument} title="Rename Document">
          <Pencil size={14} />
        </button>
        <button type="button" class="btn" onclick={copyToClipboard} title="Copy to Clipboard">
          <ClipboardCopy size={14} />
        </button>
        <button type="button" class="btn" onclick={downloadMarkdown} title="Download Markdown">
          <Download size={14} />
        </button>
        <button type="button" class="btn btn-restart" onclick={onRestart} title="Restart Session">
          <RotateCcw size={14} />
        </button>
      </div>
      <button type="button" class="header-toggle-btn" onclick={() => rightSidebarCollapsed = !rightSidebarCollapsed} title={rightSidebarCollapsed ? "Show Copilot" : "Hide Copilot"}>
        {#if rightSidebarCollapsed}
          <ChevronLeft size={16} />
        {:else}
          <ChevronRight size={16} />
        {/if}
      </button>
    {/snippet}

    <div class="document-content-pane theme-{editorTheme}">
      {#if activeViewTab === 'rich'}
        <DocumentForgeEditor bind:contentMarkdown theme={editorTheme} bind:mode />
      {:else if activeViewTab === 'preview'}
        <DocumentForgePreview {contentMarkdown} theme={editorTheme} />
      {:else}
        <textarea bind:value={contentMarkdown} class="editor-textarea theme-{editorTheme}" placeholder="# Document Draft..."></textarea>
      {/if}
    </div>
  </Panel>

  <div class="forge-right-sidebar" class:collapsed={rightSidebarCollapsed}>
    <div class="right-sidebar-inner">
      <DocumentForgeChat {messages} {compiling} bind:mode={copilotMode} {onSubmitRefine} />
    </div>
  </div>
</div>

<style>
  .workspace-container { display: flex; gap: 0; width: 100%; height: 100%; min-height: 0; box-sizing: border-box; overflow: hidden; }
  :global(.document-panel) { flex: 1.6; min-width: 0; height: 100%; }
  .tabs-group { display: flex; gap: 4px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 2px; }
  .tab-btn { background: transparent; border: none; border-radius: var(--radius); color: var(--text-dim); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
  .tab-btn.active { background: var(--bg-elevated); color: var(--cyan); }
  .tab-btn:hover:not(.active) { color: var(--text); background: rgba(255, 255, 255, 0.05); }

  .mode-group {
    display: flex;
    gap: 2px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2px;
    margin-left: 6px;
  }
  .mode-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: none;
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-heading);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 3px 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    height: 24px;
  }
  .mode-btn:hover { color: var(--cyan); background: rgba(255, 255, 255, 0.05); }
  .mode-btn.active { background: var(--bg-elevated); color: var(--cyan); }
  .header-actions { display: flex; gap: 8px; }
  .btn { background: transparent; border: 1px solid var(--cyan-dim); border-radius: var(--radius); color: var(--cyan-dim); width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; padding: 0; }

  :global(.document-panel .panel-header),
  :global(.chat-panel .panel-header) {
    height: 52px;
    box-sizing: border-box;
  }

  .forge-right-sidebar {
    flex-shrink: 0;
    width: 320px;
    transition: width 0.2s ease;
    overflow: hidden;
    height: 100%;
  }
  .forge-right-sidebar.collapsed {
    width: 0;
  }
  .right-sidebar-inner {
    width: 320px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    transition: opacity 0.2s ease;
  }
  .forge-right-sidebar.collapsed .right-sidebar-inner {
    opacity: 0;
  }
  :global(.chat-panel) {
    flex: 1 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    --panel-content-bg: var(--bg-surface);
  }
  .header-toggle-btn {
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
  }
  .header-toggle-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
    box-shadow: 0 0 6px var(--cyan-glow);
  }
  .btn:hover { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .btn-theme { border-color: var(--cyan-dim); color: var(--cyan-dim); }
  .btn-theme:hover { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .btn-restart { border-color: var(--danger); color: var(--danger); }
  .btn-restart:hover { background: rgba(239, 68, 68, 0.08); border-color: var(--danger); color: var(--danger); }
  .btn-rename { border-color: var(--amber); color: var(--amber); }
  .btn-rename:hover { background: rgba(255, 140, 0, 0.08); border-color: var(--amber); color: var(--amber); }
  .document-content-pane { display: flex; flex-direction: column; height: 100%; min-height: 0; box-sizing: border-box; }
  .document-content-pane.theme-white { background: #ffffff; color: #1a1a1a; }
  .document-content-pane.theme-black { background: #000000; color: #ffffff; }

  .editor-textarea { flex: 1; border-radius: var(--radius); padding: 20px; font-family: var(--font-mono); font-size: var(--fs-body); resize: none; line-height: 1.5; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
  .editor-textarea.theme-white {
    background: #ffffff;
    color: #1a1a1a;
    border: 1px solid #dddddd;
  }
  .editor-textarea.theme-white:focus {
    border-color: var(--cyan-dark);
    box-shadow: 0 0 8px rgba(0, 136, 179, 0.2);
  }
  .editor-textarea.theme-black {
    background: #000000;
    color: #ffffff;
    border: 1px solid var(--border);
  }
  .editor-textarea.theme-black:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 8px var(--cyan-glow);
  }
  :global(.document-panel .panel-title) {
    max-width: 350px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
