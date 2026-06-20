<script>
  import Panel from '$lib/components/Panel.svelte';
  import { RefreshCw, Sparkles, AlertTriangle } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';

  let { project, oncompile } = $props();

  let compiling = $state(false);
  let error = $state('');

  async function compileCodex() {
    compiling = true;
    error = '';
    try {
      const res = await fetch(`/operations/projects/${project.id}/codex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compile codex.');
      }
      notify('Project Codex compiled and synchronized successfully, Commander.');
      if (oncompile) await oncompile();
    } catch (err) {
      error = err.message;
      notify('EDI: Synthesis error encountered.');
    } finally {
      compiling = false;
    }
  }

  function parseMarkdown(md) {
    if (!md) return '';
    // Basic sanitization
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^#\s+([^\n]+)/gm, '<h1 class="codex-h1">$1</h1>');
    html = html.replace(/^##\s+([^\n]+)/gm, '<h2 class="codex-h2">$1</h2>');
    html = html.replace(/^###\s+([^\n]+)/gm, '<h3 class="codex-h3">$1</h3>');

    // Bold text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    html = html.replace(/^\s*[-*]\s+([^\n]+)/gm, '<li class="codex-li">$1</li>');

    // Paragraph split
    const parts = html.split(/\n\n+/);
    html = parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p class="codex-p">${trimmed}</p>`;
    }).join('\n');

    // Clean up single newlines inside blocks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  let htmlContent = $derived(parseMarkdown(project?.codex_markdown));
</script>

<div data-section="project-codex-container" class="codex-wrapper">
  {#if compiling}
    <Panel title="EDI Synthesis Engine" icon={Sparkles}>
      <div data-section="codex-compiling" class="status-box compiling">
        <RefreshCw size={36} class="spinner" />
        <h3 class="status-title">Reconstructing Project Codex</h3>
        <p class="status-desc">Gathering meetings, contacts, narrative entries, and roadmap tasks. Formatting intelligence dossier...</p>
      </div>
    </Panel>
  {:else if error}
    <Panel title="System Diagnostics" icon={AlertTriangle}>
      <div data-section="codex-error" class="status-box error">
        <AlertTriangle size={36} class="error-icon" />
        <h3 class="status-title error-title">Synthesis Malfunction</h3>
        <p class="status-desc">{error}</p>
        <button type="button" class="action-btn compile-btn" onclick={compileCodex}>
          <RefreshCw size={16} /> Retry Compilation
        </button>
      </div>
    </Panel>
  {:else if project?.codex_markdown}
    <Panel title="Project Master Codex" icon={Sparkles}>
      {#snippet headerRight()}
        <button type="button" class="action-btn header-compile-btn" onclick={compileCodex} title="Re-compile Codex with updated data">
          <RefreshCw size={14} /> Refresh Codex
        </button>
      {/snippet}
      <div data-section="codex-display" class="codex-display-content">
        {@html htmlContent}
      </div>
    </Panel>
  {:else}
    <Panel title="Project Master Codex" icon={Sparkles}>
      <div data-section="codex-empty" class="status-box empty">
        <Sparkles size={36} class="glow-icon" />
        <h3 class="status-title">Dossier Offline</h3>
        <p class="status-desc">No Project Codex has been compiled yet. Trigger EDI's synthesis engine to build a consolidated master dossier of all tasks, story records, meetings, and contacts for this project.</p>
        <button type="button" class="action-btn compile-btn" onclick={compileCodex}>
          <Sparkles size={16} /> Compile Codex
        </button>
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

  .status-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    text-align: center;
    min-height: 300px;
  }

  .spinner {
    color: var(--cyan);
    animation: spin 2s linear infinite;
    margin-bottom: 20px;
    filter: drop-shadow(0 0 8px var(--cyan-glow));
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .status-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan);
    margin: 0 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .error-title {
    color: var(--danger);
  }

  .status-desc {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    max-width: 460px;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: #fff;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .compile-btn {
    background: var(--cyan);
    color: var(--bg-surface);
  }

  .compile-btn:hover {
    box-shadow: 0 0 15px var(--cyan-glow);
    background: #33ddff;
  }

  .error-icon {
    color: var(--danger);
    margin-bottom: 20px;
  }

  .glow-icon {
    color: var(--text-dim);
    opacity: 0.6;
    margin-bottom: 20px;
  }

  .header-compile-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .header-compile-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  /* Markdown Rendering styles */
  .codex-display-content :global(.codex-h1) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin: 0 0 20px 0;
    text-transform: uppercase;
  }

  .codex-display-content :global(.codex-h2) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    margin: 24px 0 14px 0;
    border-bottom: 1px dashed var(--cyan-glow);
    padding-bottom: 4px;
    text-transform: uppercase;
  }

  .codex-display-content :global(.codex-h3) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text);
    margin: 18px 0 10px 0;
  }

  .codex-display-content :global(.codex-p) {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    line-height: 1.6;
    margin: 0 0 14px 0;
  }

  .codex-display-content :global(.codex-li) {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    margin: 0 0 6px 20px;
    list-style-type: square;
    line-height: 1.4;
  }

  .codex-display-content :global(strong) {
    color: var(--cyan);
    font-weight: 600;
  }
</style>
