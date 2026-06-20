<script>
  import { onMount } from 'svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { RefreshCw, Sparkles, Download, ClipboardCopy } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';

  let { client } = $props();

  let loading = $state(true);
  let dossierContent = $state('');
  let dossierUpdatedAt = $state(null);

  async function loadDossier(force = false) {
    loading = true;
    try {
      const url = `/operations/clients/${client.id}/export${force ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load dossier');
      dossierContent = await res.text();
      
      const updatedHeader = res.headers.get('x-dossier-updated-at');
      dossierUpdatedAt = updatedHeader ? new Date(updatedHeader) : null;
    } catch (err) {
      notify('Error loading client dossier: ' + err.message);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadDossier(false);
  });

  function copyToClipboard() {
    navigator.clipboard.writeText(dossierContent);
    notify('Dossier copied to clipboard, Commander.');
  }

  function downloadDossier() {
    const blob = new Blob([dossierContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_dossier.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Dossier download started.');
  }

  function parseMarkdown(md) {
    if (!md) return '';
    let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/^#\s+([^\n]+)/gm, '<h1 class="codex-h1">$1</h1>');
    html = html.replace(/^##\s+([^\n]+)/gm, '<h2 class="codex-h2">$1</h2>');
    html = html.replace(/^###\s+([^\n]+)/gm, '<h3 class="codex-h3">$1</h3>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*[-*]\s+([^\n]+)/gm, '<li class="codex-li">$1</li>');
    const parts = html.split(/\n\n+/);
    html = parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed;
      return `<p class="codex-p">${trimmed}</p>`;
    }).join('\n');
    return html.replace(/\n/g, '<br>');
  }

  let htmlContent = $derived(parseMarkdown(dossierContent));

  let badgeColor = $derived.by(() => {
    if (!dossierUpdatedAt) return 'red';
    const diffTime = Math.abs(new Date() - dossierUpdatedAt);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'green';
    if (diffDays <= 5) return 'yellow';
    return 'red';
  });

  let badgeText = $derived.by(() => {
    if (!dossierUpdatedAt) return 'Stale';
    const diffTime = Math.abs(new Date() - dossierUpdatedAt);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Latest';
    if (diffDays === 1) return '1 Day Old';
    return `${diffDays} Days Old`;
  });
</script>

<div data-section="client-codex-container" class="codex-wrapper">
  {#if loading}
    <Panel title="Dossier Archive" icon={RefreshCw}>
      <div data-section="codex-loading" class="status-box">
        <RefreshCw size={36} class="spinner" />
        <h3 class="status-title">Accessing Client Archive</h3>
        <p class="status-desc">Reading local databanks, logs, and communication archives...</p>
      </div>
    </Panel>
  {:else}
    <Panel title="Client Codex & Dossier" icon={Sparkles}>
      {#snippet headerRight()}
        <div class="actions-group">
          {#if dossierUpdatedAt}
            <span class="age-badge badge-{badgeColor}">{badgeText}</span>
          {/if}
          <button type="button" class="action-btn header-sec-btn" onclick={copyToClipboard} title="Copy dossier">
            <ClipboardCopy size={14} /> Copy
          </button>
          <button type="button" class="action-btn header-sec-btn" onclick={downloadDossier} title="Download dossier">
            <Download size={14} /> Download
          </button>
          <button type="button" class="action-btn header-compile-btn" onclick={() => loadDossier(true)} title="Rebuild Codex Cache">
            <RefreshCw size={14} /> Rebuild Codex
          </button>
        </div>
      {/snippet}
      <div data-section="codex-display" class="codex-display-content">
        {@html htmlContent}
      </div>
    </Panel>
  {/if}
</div>

<style>
  .codex-wrapper { 
    width: 100%; 
    display: flex; 
    flex-direction: column; 
    gap: 16px; 
  }
  .status-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; min-height: 300px; }
  .spinner { color: var(--cyan); animation: spin 2s linear infinite; margin-bottom: 20px; filter: drop-shadow(0 0 8px var(--cyan-glow)); }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .status-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }
  .status-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); max-width: 460px; margin: 0; line-height: 1.5; }
  .actions-group { display: flex; gap: 8px; align-items: center; }
  .action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); background: transparent; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s ease-in-out; }
  .action-btn:hover { color: var(--cyan); border-color: var(--cyan); background: var(--cyan-glow); }
  .header-compile-btn:hover { color: var(--cyan); border-color: var(--cyan); background: var(--cyan-glow); }
  
  .age-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: var(--radius); font-family: var(--font-nav, var(--font-heading-1)); font-size: var(--fs-nav); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid transparent; }
  .badge-green { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
  .badge-yellow { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
  .badge-red { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }

  .codex-display-content :global(.codex-h1) { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 20px 0; text-transform: uppercase; }
  .codex-display-content :global(.codex-h2) { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); margin: 24px 0 14px 0; border-bottom: 1px dashed var(--cyan-glow); padding-bottom: 4px; text-transform: uppercase; }
  .codex-display-content :global(.codex-h3) { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); margin: 18px 0 10px 0; }
  .codex-display-content :global(.codex-p) { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); line-height: 1.6; margin: 0 0 14px 0; }
  .codex-display-content :global(.codex-li) { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0 0 6px 20px; list-style-type: square; line-height: 1.4; }
  .codex-display-content :global(strong) { color: var(--cyan); font-weight: 600; }
</style>
