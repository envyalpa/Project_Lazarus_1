<script>
  import { onMount } from 'svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { RefreshCw, Sparkles, AlertTriangle, FileText, ClipboardCopy, Edit3, Save, X, Trash2 } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';

  let { client } = $props();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2025, 2026, 2027];

  // Initialize selectedMonth and selectedYear from URL search params if present, else default to current date
  let selectedMonth = $state(1);
  let selectedYear = $state(2026);

  let loading = $state(false);
  let compiling = $state(false);
  let editing = $state(false);
  let content = $state('');
  let rawContent = $state('');
  let error = $state('');

  // Read URL query parameters on mount to preserve state
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get('month');
    const y = urlParams.get('year');
    
    // Set default month & year based on local time
    const now = new Date();
    selectedMonth = m ? Number(m) : now.getMonth() + 1;
    selectedYear = y ? Number(y) : now.getFullYear();
    
    loadReport();
  });

  async function loadReport() {
    loading = true;
    error = '';
    editing = false;
    try {
      const res = await fetch(`/operations/clients/${client.id}/monthly-reports?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load report.');
      }
      content = data.content || '';
      rawContent = content;
    } catch (err) {
      error = err.message;
      notify('EDI: Error loading monthly report.');
    } finally {
      loading = false;
    }
  }

  async function generateReport() {
    compiling = true;
    error = '';
    editing = false;
    try {
      const res = await fetch(`/operations/clients/${client.id}/monthly-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compile monthly report.');
      }
      content = data.content || '';
      rawContent = content;
      notify('Monthly status report compiled successfully, Commander.');
    } catch (err) {
      error = err.message;
      notify('EDI: Report synthesis error.');
    } finally {
      compiling = false;
    }
  }

  async function saveReport() {
    try {
      const res = await fetch(`/operations/clients/${client.id}/monthly-reports`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear, content: rawContent })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save monthly report.');
      }
      content = rawContent;
      editing = false;
      notify('Monthly status report saved successfully, Commander.');
    } catch (err) {
      notify('Error saving monthly report: ' + err.message);
    }
  }

  async function saveToClientFiles() {
    try {
      const reportName = `Monthly Status Report - ${monthNames[selectedMonth - 1]} ${selectedYear}`;
      const viewLink = `/operations/clients/${client.id}?tab=monthly-reports&month=${selectedMonth}&year=${selectedYear}`;
      
      const res = await fetch(`/operations/clients/${client.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: reportName,
          file_type: 'FileText',
          link: viewLink
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to create file reference.');
      }
      notify('Report reference added to client files, Commander.');
    } catch (err) {
      notify('Error adding to files: ' + err.message);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(content);
    notify('Report text copied to clipboard, Commander.');
  }

  async function deleteReport() {
    if (!confirm(`Are you sure you want to delete the monthly status report for ${monthNames[selectedMonth - 1]} ${selectedYear}?`)) {
      return;
    }
    try {
      const res = await fetch(`/operations/clients/${client.id}/monthly-reports`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete monthly report.');
      }
      content = '';
      rawContent = '';
      notify('Monthly status report deleted successfully, Commander.');
    } catch (err) {
      notify('Error deleting monthly report: ' + err.message);
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
    html = html.replace(/^#\s+([^\n]+)/gm, '<h1 class="report-h1">$1</h1>');
    html = html.replace(/^##\s+([^\n]+)/gm, '<h2 class="report-h2">$1</h2>');
    html = html.replace(/^###\s+([^\n]+)/gm, '<h3 class="report-h3">$1</h3>');

    // Bold text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    html = html.replace(/^\s*[-*]\s+([^\n]+)/gm, '<li class="report-li">$1</li>');

    // Paragraph split
    const parts = html.split(/\n\n+/);
    html = parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p class="report-p">${trimmed}</p>`;
    }).join('\n');

    // Clean up single newlines inside blocks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  let htmlContent = $derived(parseMarkdown(content));
</script>

<div data-section="client-reports-container" class="reports-container">
  
  <!-- Month and Year Selection Toolbar -->
  <div data-label="report-controls" class="controls-bar">
    <div class="selection-group">
      <div class="select-wrapper">
        <select bind:value={selectedMonth} onchange={loadReport} class="select-input">
          {#each monthNames as month, idx}
            <option value={idx + 1}>{month}</option>
          {/each}
        </select>
      </div>
      <div class="select-wrapper">
        <select bind:value={selectedYear} onchange={loadReport} class="select-input">
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Main Report Panel -->
  {#if compiling}
    <Panel title="EDI Synthesis Engine" icon={Sparkles}>
      <div data-section="report-compiling" class="status-box compiling">
        <RefreshCw size={36} class="spinner" />
        <h3 class="status-title">Generating Monthly Status Report</h3>
        <p class="status-desc">Analyzing meeting minutes, client tasks, logged time, and timeline entries. Synthesizing executive document...</p>
      </div>
    </Panel>
  {:else if loading}
    <Panel title="Data Retrieval System" icon={RefreshCw}>
      <div data-section="report-loading" class="status-box loading">
        <RefreshCw size={36} class="spinner" />
        <h3 class="status-title">Retrieving Report Dossier</h3>
        <p class="status-desc">Accessing local databases for the requested report cycle...</p>
      </div>
    </Panel>
  {:else if error}
    <Panel title="System Diagnostics" icon={AlertTriangle}>
      <div data-section="report-error" class="status-box error">
        <AlertTriangle size={36} class="error-icon" />
        <h3 class="status-title error-title">Synthesis Malfunction</h3>
        <p class="status-desc">{error}</p>
        <button type="button" class="action-btn compile-btn" onclick={loadReport}>
          <RefreshCw size={16} /> Retry Retrieval
        </button>
      </div>
    </Panel>
  {:else if editing}
    <Panel title={`Edit Report — ${monthNames[selectedMonth - 1]} ${selectedYear}`} icon={Edit3}>
      {#snippet headerRight()}
        <div class="editor-header-actions">
          <button type="button" class="action-btn cancel-btn" onclick={() => { editing = false; rawContent = content; }} title="Discard edits">
            <X size={14} /> Cancel
          </button>
          <button type="button" class="action-btn save-btn" onclick={saveReport} title="Save changes to database">
            <Save size={14} /> Save
          </button>
        </div>
      {/snippet}
      <div data-section="report-editor" class="editor-pane">
        <textarea bind:value={rawContent} class="editor-textarea" placeholder="Write report markdown here..."></textarea>
      </div>
    </Panel>
  {:else if content}
    <Panel title={`Monthly Status Report — ${monthNames[selectedMonth - 1]} ${selectedYear}`} icon={FileText}>
      {#snippet headerRight()}
        <div class="report-header-actions">
          <button type="button" class="action-btn action-sec-btn" onclick={copyToClipboard} title="Copy report text to clipboard">
            <ClipboardCopy size={14} /> Copy Text
          </button>
          <button type="button" class="action-btn action-sec-btn" onclick={saveToClientFiles} title="Pin this report to Client Files list">
            <FileText size={14} /> Save to Files
          </button>
          <button type="button" class="action-btn action-sec-btn" onclick={() => editing = true} title="Manually edit this status report">
            <Edit3 size={14} /> Edit
          </button>
          <button type="button" class="action-btn action-refresh-btn" onclick={generateReport} title="Re-compile status report with latest data">
            <RefreshCw size={14} /> Re-compile
          </button>
          <button type="button" class="action-btn action-delete-btn" onclick={deleteReport} title="Delete this status report">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      {/snippet}
      <div data-section="report-display" class="report-display-content">
        {@html htmlContent}
      </div>
    </Panel>
  {:else}
    <Panel title={`Monthly Status Report — ${monthNames[selectedMonth - 1]} ${selectedYear}`} icon={FileText}>
      <div data-section="report-empty" class="status-box empty">
        <Sparkles size={36} class="glow-icon" />
        <h3 class="status-title">Status Report Offline</h3>
        <p class="status-desc">No monthly status report has been generated for {monthNames[selectedMonth - 1]} {selectedYear} yet. Click compile to trigger EDI's synthesis engine.</p>
        <button type="button" class="action-btn compile-btn" onclick={generateReport}>
          <Sparkles size={16} /> Compile Report
        </button>
      </div>
    </Panel>
  {/if}
</div>

<style>
  .reports-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .controls-bar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 12px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
  }

  .selection-group {
    display: flex;
    gap: 12px;
  }

  .select-wrapper {
    position: relative;
  }

  .select-input {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    padding: 6px 36px 6px 12px;
    cursor: pointer;
    appearance: none;
    transition: all 0.2s;
  }

  .select-input:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .select-wrapper::after {
    content: 'â–¾';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-dim);
    pointer-events: none;
    font-size: var(--fs-caption);
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
    font-size: var(--fs-heading-1);
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
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
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

  .report-header-actions, .editor-header-actions {
    display: flex;
    gap: 8px;
  }

  .action-sec-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .action-sec-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
  }

  .action-refresh-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .action-refresh-btn:hover {
    color: var(--amber);
    border-color: var(--amber);
    background: rgba(255, 140, 0, 0.08);
  }

  .action-delete-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .action-delete-btn:hover {
    color: var(--danger);
    border-color: var(--danger);
    background: rgba(239, 68, 68, 0.08);
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .cancel-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
    border-color: var(--danger);
  }

  .save-btn {
    background: var(--cyan);
    color: var(--bg-surface);
    padding: 4px 10px;
    font-size: var(--fs-body);
  }

  .save-btn:hover {
    box-shadow: 0 0 10px var(--cyan-glow);
    background: #33ddff;
  }

  /* Editor Mode styles */
  .editor-pane {
    width: 100%;
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .editor-textarea {
    flex: 1;
    width: 100%;
    min-height: 400px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: var(--fs-body);
    padding: 16px;
    resize: vertical;
    line-height: 1.5;
  }

  .editor-textarea:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2), 0 0 0 2px rgba(0, 200, 255, 0.15);
  }

  /* Markdown Rendering styles */
  .report-display-content :global(.report-h1) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-1);
    font-weight: 700;
    color: var(--cyan);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin: 0 0 20px 0;
    text-transform: uppercase;
  }

  .report-display-content :global(.report-h2) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--amber);
    margin: 24px 0 14px 0;
    border-bottom: 1px dashed rgba(255, 140, 0, 0.2);
    padding-bottom: 4px;
    text-transform: uppercase;
  }

  .report-display-content :global(.report-h3) {
    font-family: var(--font-heading-1);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    margin: 18px 0 10px 0;
  }

  .report-display-content :global(.report-p) {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    line-height: 1.6;
    margin: 0 0 14px 0;
  }

  .report-display-content :global(.report-li) {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    margin: 0 0 6px 20px;
    list-style-type: square;
    line-height: 1.4;
  }

  .report-display-content :global(strong) {
    color: var(--cyan);
    font-weight: 600;
  }
</style>
