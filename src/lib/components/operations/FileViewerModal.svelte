<script>
  import { onMount } from 'svelte';
  import { Eye, Code, Contrast, Copy, Download, X } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';
  import DocumentForgePreview from './DocumentForgePreview.svelte';

  let { file, clientId, onclose } = $props();

  let viewContent = $state('');
  let loadingContent = $state(true);
  let viewTab = $state('formatted'); // 'formatted' or 'source'
  let viewTheme = $state('black'); // 'black' or 'white'

  onMount(async () => {
    try {
      const res = await fetch(`/operations/clients/${clientId}/files/${file.id}`);
      if (res.ok) {
        const fileData = await res.json();
        viewContent = fileData.content_markdown || '*No markdown content found*';
      } else {
        viewContent = '*Failed to retrieve file content*';
      }
    } catch (err) {
      viewContent = 'Error loading content: ' + err.message;
    } finally {
      loadingContent = false;
    }
  });

  function copyViewContent() {
    navigator.clipboard.writeText(viewContent);
    notify('Copied markdown content to clipboard.');
  }

  function downloadViewContent() {
    const blob = new Blob([viewContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.file_name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div data-section="file-viewer-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="file-viewer-modal" class="modal modal-wide" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <h3 data-label="modal-title" class="modal-header-title">{file.file_name}</h3>
      
      <div class="viewer-actions">
        <div class="tabs-group">
          <button type="button" class="tab-btn" class:active={viewTab === 'formatted'} onclick={() => viewTab = 'formatted'} title="Formatted Preview">
            <Eye size={14} /> Formatted
          </button>
          <button type="button" class="tab-btn" class:active={viewTab === 'source'} onclick={() => viewTab = 'source'} title="Markdown Source">
            <Code size={14} /> Source
          </button>
        </div>
        <button type="button" class="action-btn" onclick={() => viewTheme = viewTheme === 'black' ? 'white' : 'black'} title="Toggle Theme">
          <Contrast size={14} />
        </button>
        <button type="button" class="action-btn" onclick={copyViewContent} title="Copy to Clipboard" disabled={loadingContent}>
          <Copy size={14} />
        </button>
        <button type="button" class="action-btn" onclick={downloadViewContent} title="Download Markdown" disabled={loadingContent}>
          <Download size={14} />
        </button>
      </div>
      
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
    </div>
    
    <div data-label="modal-body" class="modal-body theme-{viewTheme}">
      {#if loadingContent}
        <div class="loading-state">
          <div class="spinner"></div>
          <span class="loading-text">Decrypting and compiling file content...</span>
        </div>
      {:else if viewTab === 'formatted'}
        <div class="formatted-scroll-wrap">
          <DocumentForgePreview contentMarkdown={viewContent} theme={viewTheme} />
        </div>
      {:else}
        <textarea readonly class="source-textarea" value={viewContent}></textarea>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 210; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal-wide { width: 80vw; height: 80vh; max-width: 80vw; max-height: 80vh; }
  
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; gap: 16px; }
  .modal-header-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
  
  .viewer-actions { display: flex; align-items: center; gap: 8px; }
  .tabs-group { display: flex; gap: 4px; background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: var(--radius); padding: 2px; }
  .tab-btn { background: transparent; border: none; border-radius: var(--radius); color: var(--text-dim); padding: 4px 10px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
  .tab-btn.active { background: var(--bg-elevated); color: var(--cyan); }
  .tab-btn:hover:not(.active) { color: var(--text); background: rgba(255, 255, 255, 0.05); }
  
  .action-btn { background: transparent; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; padding: 0; }
  .action-btn:hover:not(:disabled) { color: var(--cyan); border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  
  .modal-body { padding: 0; overflow: hidden; flex: 1; display: flex; flex-direction: column; }
  .modal-body.theme-white { background: #ffffff; color: #1a1a1a; }
  .modal-body.theme-black { background: var(--bg-surface); color: var(--text); }
  
  .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; flex: 1; padding: 48px; }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 212, 255, 0.1); border-top-color: var(--cyan); border-radius: 50%; animation: spin 1s linear infinite; }
  .loading-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--cyan); letter-spacing: 0.5px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .formatted-scroll-wrap { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  .formatted-scroll-wrap :global(.preview-scroll-wrapper) { border: none; border-radius: 0; height: 100%; }
  
  .source-textarea { flex: 1; width: 100%; border: none; padding: 24px; font-family: var(--font-mono); font-size: var(--fs-caption); line-height: 1.5; resize: none; outline: none; box-sizing: border-box; }
  .modal-body.theme-white .source-textarea { background: #ffffff; color: #1a1a1a; }
  .modal-body.theme-black .source-textarea { background: var(--bg-surface); color: var(--text); }
</style>
