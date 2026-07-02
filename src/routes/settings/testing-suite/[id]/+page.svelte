<script>
  import { Play, Eye, FileText, Pencil, Trash2, X, Search, ChevronRight, ClipboardCheck, Terminal } from '@lucide/svelte';
  import { invalidateAll, goto } from '$app/navigation';
  import Panel from '$lib/components/Panel.svelte';
  import DeleteConfirm from '$lib/components/operations/DeleteConfirm.svelte';
  
  import ChecklistTable from '$lib/components/testing-suite/ChecklistTable.svelte';
  import TestCaseModal from '$lib/components/testing-suite/TestCaseModal.svelte';
  import ReportModal from '$lib/components/testing-suite/ReportModal.svelte';
  import AgentConfigModal from '$lib/components/testing-suite/AgentConfigModal.svelte';
  import EditRunModal from '$lib/components/testing-suite/EditRunModal.svelte';
  import TestingDashboard from '$lib/components/testing-suite/TestingDashboard.svelte';
  import AiDebugPanel from '$lib/components/lounge/AiDebugPanel.svelte';

  let { data } = $props();
  let run = $derived(data.run), results = $derived(data.results || []), clients = $derived(data.clients || []);

  // Filter states
  let searchQuery = $state(''), filterStage = $state(''), filterStatus = $state(''), filterSeverity = $state('');

  // Selection states
  let selectedCriteriaIds = $state([]);
  let activeRunIds = $state([]);
  let runHeaded = $state(false);
  let showLogsOnly = $state(false);
  let showDebugLogs = $state(false);
  let showResearchModal = $state(false);
  let playDisabled = $derived(!run.research_notes || !run.is_running);

  // Modals
  let showEditModal = $state(false), showDeleteModal = $state(false), showTestCaseModal = $state(false);
  let showAgentModal = $state(false), showReportModal = $state(false), activeTestCase = $state(null);

  function handleRunSelected(ids = null, headed = false) {
    activeRunIds = (ids && Array.isArray(ids)) ? ids : selectedCriteriaIds;
    runHeaded = headed;
    showAgentModal = true;
  }

  function openLogsViewer() {
    showLogsOnly = true;
    showAgentModal = true;
  }

  // Computed lists
  let stages = $derived([...new Set(results.map(r => r.stage))]);
  let filteredResults = $derived.by(() => {
    let arr = [...results];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(r => r.what_to_test.toLowerCase().includes(q) || r.stage.toLowerCase().includes(q));
    }
    if (filterStage) arr = arr.filter(r => r.stage === filterStage);
    if (filterStatus) arr = arr.filter(r => r.status === filterStatus);
    if (filterSeverity) arr = arr.filter(r => r.severity === filterSeverity);
    return arr;
  });

  async function handleDeleteRun() {
    try {
      const res = await fetch(`/settings/testing-suite/${run.id}`, { method: 'DELETE' });
      if (res.ok) { showDeleteModal = false; goto('/settings/testing-suite'); }
      else { const err = await res.json(); alert(err.error || 'Failed to delete evaluation.'); }
    } catch (e) { alert('Error occurred during deletion.'); }
  }

  function handleTestCaseEdit(item) {
    activeTestCase = item;
    showTestCaseModal = true;
  }
</script>

<div data-section="testing-suite-detail" class="testing-suite-detail">
  <!-- Breadcrumbs & Navigation -->
  <div class="breadcrumbs-row"><a href="/settings/testing-suite" class="crumb-link">TESTING SUITE</a><span class="sep"><ChevronRight size={14} /></span><span class="active-crumb">{run.run_name.toUpperCase()}</span></div>

  <!-- Header -->
  <div class="header-row">
    <div class="header-main">
      <h1 class="run-name-heading">{run.run_name}</h1>
      <p class="run-metadata-text">Platform: <span class="highlight">{run.platform_name}</span>{#if run.client_name} • Client: <span class="highlight">{run.client_name}</span>{/if}</p>
    </div>
    
    <div class="header-actions">
      {#if run.is_running}
        <button type="button" class="btn browser-ready-btn" disabled title="Browser is logged in and ready"><Eye size={16} /><span>Browser Ready</span></button>
      {:else}
        <button type="button" class="btn engage-btn" onclick={() => handleRunSelected(null, true)} title="Engage headed browser window"><Eye size={16} /><span>Engage Browser</span></button>
      {/if}
      <button type="button" class="btn run-agent-btn" onclick={() => handleRunSelected(selectedCriteriaIds, false)} disabled={selectedCriteriaIds.length === 0 || playDisabled} title="Run QA Agent"><Play size={16} /><span>Run Agent ({selectedCriteriaIds.length})</span></button>
      <button type="button" class="btn log-btn" onclick={openLogsViewer} title="View Logs"><Terminal size={16} /><span>View Logs</span></button>
      <button type="button" class="btn debug-btn" onclick={() => showDebugLogs = true} title="AI Logs"><FileText size={16} /><span>AI Logs</span></button>
      <button type="button" class="btn research-btn" onclick={() => showResearchModal = true} title="Research"><Search size={16} /><span>Research</span></button>
      <button type="button" class="btn report-btn" onclick={() => showReportModal = true} title="Report"><FileText size={16} /><span>Report</span></button>
      <button type="button" class="btn icon-btn edit-run-btn" onclick={() => showEditModal = true} title="Edit"><Pencil size={16} /></button>
      <button type="button" class="btn icon-btn delete-run-btn" onclick={() => showDeleteModal = true} title="Delete"><Trash2 size={16} /></button>
    </div>
  </div>

  <!-- Mini Progress Dashboard -->
  <TestingDashboard {run} />

  <!-- Filters Toolbar -->
  <div class="toolbar">
    <div class="search-input-wrapper">
      <span class="search-icon"><Search size={16} /></span>
      <input type="text" bind:value={searchQuery} placeholder="Search test cases or process stages..." />
    </div>

    <div class="filters-row">
      <select bind:value={filterStage} class="filter-select">
        <option value="">All Stages</option>
        {#each stages as s}<option value={s}>{s}</option>{/each}
      </select>
      <select bind:value={filterStatus} class="filter-select">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="gaps">Gaps</option>
      </select>
      <select bind:value={filterSeverity} class="filter-select">
        <option value="">All Severities</option>
        <option value="Critical">Critical</option><option value="Important">Important</option><option value="Good to Have">Good to Have</option>
      </select>
    </div>
  </div>

  <!-- Checklist Checklist Panel -->
  <Panel title="Verification Criteria Checklist" icon={ClipboardCheck}>
    <ChecklistTable results={filteredResults} bind:selectedIds={selectedCriteriaIds} playDisabled={playDisabled} onedit={handleTestCaseEdit} onrun={handleRunSelected} />
  </Panel>
</div>

<!-- Modals Rendering -->
{#if showTestCaseModal && activeTestCase}<TestCaseModal runId={run.id} item={activeTestCase} onclose={() => showTestCaseModal = false} onsave={() => { showTestCaseModal = false; invalidateAll(); }} />{/if}
{#if showReportModal}<ReportModal {run} results={results} onclose={() => showReportModal = false} />{/if}
{#if showAgentModal}
  <AgentConfigModal 
    runId={run.id} platformName={run.platform_name} 
    defaultUrl={run.url || ''} defaultUsername={run.username || ''} defaultPassword={run.password || ''}
    criteriaIds={activeRunIds} headed={runHeaded} viewOnlyLogs={showLogsOnly}
    onclose={() => { showAgentModal = false; activeRunIds = []; runHeaded = false; showLogsOnly = false; }} 
    oncomplete={() => { showAgentModal = false; activeRunIds = []; selectedCriteriaIds = []; runHeaded = false; showLogsOnly = false; invalidateAll(); }} 
  />
{/if}

{#if showDebugLogs}
  <div data-section="modal-backdrop" class="logs-overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDebugLogs = false; }}>
    <div data-section="modal" class="logs-panel" role="dialog" aria-modal="true"><AiDebugPanel onclose={() => { showDebugLogs = false; }} /></div>
  </div>
{/if}

{#if showResearchModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showResearchModal = false; }}>
    <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Platform Documentation Research</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showResearchModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        {#if run.research_notes}
          <div class="research-container"><pre class="research-pre">{run.research_notes}</pre></div>
        {:else}
          <div class="research-empty">No platform research is currently available. Engage the browser to automatically search and build references.</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showEditModal}<EditRunModal {run} {clients} onclose={() => showEditModal = false} onsave={async () => { showEditModal = false; await invalidateAll(); }} />{/if}

{#if showDeleteModal}
  <div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showDeleteModal = false; }}>
    <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
      <div data-label="modal-header" class="modal-header">
        <h3 data-label="modal-title" class="modal-header-title">Delete Evaluation</h3>
        <button type="button" data-label="modal-close" class="close-btn" onclick={() => showDeleteModal = false}><X size={18} /></button>
      </div>
      <div data-label="modal-body" class="modal-body">
        <DeleteConfirm title="Delete Evaluation" item={{ name: run.run_name }} onconfirm={handleDeleteRun} oncancel={() => showDeleteModal = false} />
      </div>
    </div>
  </div>
{/if}

<style>
  @import "./+page.css";
</style>
