<script>
  import { onMount } from 'svelte';
  import { X, BookOpen, Sparkles, ChevronLeft } from '@lucide/svelte';
  import ClientCodex from './ClientCodex.svelte';
  import DocumentForge from './DocumentForge.svelte';
  import ForgeSidebar from './ForgeSidebar.svelte';
  import { notify } from '$lib/stores/notification.js';

  let { client, onclose, oncompile } = $props();

  let activeTab = $state('codex'); // 'codex', 'forge'
  let sidebarCollapsed = $state(false);

  let selectedCards = $state([]);
  let documentType = $state('');
  let answers = $state([]);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <div data-section="modal" class="modal modal-wide tools-modal" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <h3 data-label="modal-title" class="modal-header-title">Client Tools: {client.name}</h3>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose} title="Close Tools">
        <X size={18} />
      </button>
    </div>
    
    <div data-label="modal-body" class="modal-body-split">
      <!-- Left Sidebar Nav -->
      <div data-label="tools-sidebar" class="tools-sidebar" class:collapsed={sidebarCollapsed}>
        <button type="button" class="tab-btn" class:active={activeTab === 'codex'} onclick={() => activeTab = 'codex'}>
          <BookOpen size={16} />
          {#if !sidebarCollapsed}<span>Client Codex</span>{/if}
        </button>
        <button type="button" class="tab-btn" class:active-orange={activeTab === 'forge'} onclick={() => activeTab = 'forge'}>
          <Sparkles size={16} />
          {#if !sidebarCollapsed}<span>Document Forge</span>{/if}
        </button>

        {#if activeTab === 'forge' && !sidebarCollapsed}
          <div data-section="sidebar-context" style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px; overflow-y: auto; flex: 1;">
            <ForgeSidebar {selectedCards} {documentType} {answers} />
          </div>
        {/if}
      </div>

      <!-- Collapse Toggle Divider -->
      <div data-label="sidebar-divider" class="sidebar-divider">
        <button type="button" class="collapse-toggle" onclick={() => sidebarCollapsed = !sidebarCollapsed} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ChevronLeft size={14} style={sidebarCollapsed ? 'transform: rotate(180deg)' : ''} />
        </button>
      </div>

      <!-- Right Content Pane -->
      <div data-label="tools-content" class="tools-content" class:builder-mode={activeTab === 'forge'}>
        {#if activeTab === 'codex'}
          <ClientCodex {client} oncompile={oncompile} />
        {:else if activeTab === 'forge'}
          <DocumentForge {client} onclose={() => activeTab = 'codex'} />
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(1, 4, 12, 0.85);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .tools-modal {
    background: #000000;
    border: 1px solid var(--amber);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    height: calc(100vh - 20px);
    max-height: calc(100vh - 20px);
    box-shadow: 0 0 30px rgba(255, 140, 0, 0.15);
    overflow: hidden;

    /* Override global theme vars locally for child components */
    --border: #222222;
    --border-glow: var(--amber);
    --cyan: var(--amber);
    --cyan-glow: rgba(255, 140, 0, 0.25);
    --bg-surface: #0a0a0a;
    --bg-card: #0d0d0d;
    --bg-bar: #0d0d0d;
    --bg-nav: #050505;
    --bg-primary: #000000;
    --bg-panel: #0d0d0d;
    --bg-elevated: #151515;
    --panel-header-bg: #121212;
    --panel-content-bg: #000000;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--amber);
    background: #0a0a0a;
  }

  .modal-header-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--amber);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--danger);
  }

  .modal-body-split {
    display: flex;
    flex: 1;
    height: calc(100vh - 74px);
    min-height: 0;
    overflow: hidden;
  }

  .tools-sidebar {
    width: 220px;
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 8px;
    box-sizing: border-box;
    transition: width 0.25s ease, padding 0.25s ease;
    overflow: hidden;
    flex-shrink: 0;
  }

  .tools-sidebar.collapsed {
    width: 48px;
    padding: 16px 4px;
  }

  .tools-sidebar.collapsed .tab-btn {
    padding: 10px 0;
    justify-content: center;
  }

  .sidebar-divider {
    position: relative;
    width: 0;
    min-width: 0;
    border-left: 1px solid var(--border);
    z-index: 10;
  }

  .collapse-toggle {
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 20px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .collapse-toggle:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.1);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 16px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: var(--amber);
    background: rgba(255, 140, 0, 0.05);
    border-color: var(--amber);
  }

  .tab-btn.active,
  .tab-btn.active-orange {
    color: var(--amber);
    background: rgba(255, 140, 0, 0.1);
    border-color: var(--amber);
    box-shadow: 0 0 8px rgba(255, 140, 0, 0.25);
  }

  .tools-content {
    flex: 1;
    padding: 20px;
    background: var(--bg-primary);
    overflow-y: auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .export-tool-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-height: 0;
  }

  .tool-title {
    font-family: var(--font-heading-1);
    color: var(--cyan);
    font-size: var(--fs-heading-2);
    margin: 0 0 8px 0;
    text-transform: uppercase;
  }

  .tool-desc {
    font-family: var(--font-body);
    color: var(--text-dim);
    font-size: var(--fs-body);
    margin: 0 0 20px 0;
    line-height: 1.5;
  }

  .export-actions {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 700;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .download-btn {
    background: var(--cyan);
    color: #000;
  }

  .download-btn:hover:not(:disabled) {
    box-shadow: 0 0 15px var(--cyan-glow);
    background: var(--amber-light);
  }

  .copy-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
  }

  .copy-btn:hover:not(:disabled) {
    border-color: var(--cyan);
    color: var(--cyan);
    background: rgba(255, 140, 0, 0.05);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .preview-title {
    font-family: var(--font-heading-1);
    color: var(--text);
    font-size: var(--fs-heading-2);
    margin: 0 0 12px 0;
    text-transform: uppercase;
  }

  .preview-box {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    overflow: auto;
    min-height: 0;
  }

  .loading-state {
    font-family: var(--font-body);
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px;
  }

  .spinner {
    color: var(--cyan);
    animation: spin 2s linear infinite;
    filter: drop-shadow(0 0 8px var(--cyan-glow));
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .preview-text {
    font-family: var(--font-mono);
    font-size: var(--fs-caption);
    color: var(--text-dim);
    margin: 0;
    white-space: pre-wrap;
  }

  .tools-content.builder-mode {
    padding: 0;
    overflow: hidden;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

</style>
