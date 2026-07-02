<script>
  import { X, Plus, Upload } from '@lucide/svelte';
  import CriteriaDropzone from './CriteriaDropzone.svelte';
  
  let { clients = [], onclose, onsave } = $props();

  let runName = $state(''), platformName = $state(''), clientId = $state(''), projectId = $state('');
  let url = $state(''), username = $state(''), password = $state('');
  let uploadedFile = $state(null), error = $state(''), loading = $state(false);
  let creationStep = $state(''), loadingPercent = $state(0);

  // Cascading dropdown projects
  let projects = $derived(clientId ? (clients.find(c => c.id === Number(clientId))?.projects || []) : []);

  $effect(() => {
    if (clientId) {
      if (!projects.some(p => p.id === Number(projectId))) projectId = '';
    } else projectId = '';
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!runName.trim() || !platformName.trim()) {
      error = 'Evaluation Name and Platform Name are required.';
      return;
    }
    loading = true;
    error = '';
    loadingPercent = 0;

    const isPdf = uploadedFile && uploadedFile.name.toLowerCase().endsWith('.pdf');
    const isCsv = uploadedFile && uploadedFile.name.toLowerCase().endsWith('.csv');

    if (isPdf) creationStep = 'Uploading document criteria sheet...';
    else if (isCsv) creationStep = 'Parsing CSV checklist...';
    else creationStep = 'Initializing default verification template...';

    let timers = [];
    if (isPdf) {
      timers.push(setTimeout(() => { creationStep = 'Extracting text from PDF sheet...'; }, 1500));
      timers.push(setTimeout(() => { creationStep = 'Analyzing criteria & mapping test cases with AI (this may take a few seconds)...'; }, 3000));
      timers.push(setTimeout(() => { creationStep = 'Finalizing checklist database...'; }, 7000));
    }

    const targetDuration = isPdf ? 9000 : 1000;
    const intervalStep = 100;
    const increment = (95 / (targetDuration / intervalStep));

    let percentInterval = setInterval(() => {
      if (loadingPercent < 95) {
        loadingPercent = Math.min(95, Math.round(loadingPercent + increment));
      }
    }, intervalStep);

    try {
      const fd = new FormData();
      fd.append('run_name', runName);
      fd.append('platform_name', platformName);
      fd.append('client_id', clientId);
      fd.append('project_id', projectId);
      fd.append('url', url);
      fd.append('username', username);
      fd.append('password', password);
      if (uploadedFile) {
        fd.append('criteria_file', uploadedFile);
        fd.append('import_method', isPdf ? 'pdf' : 'csv');
      } else {
        fd.append('import_method', 'default');
      }
      const res = await fetch('/settings/testing-suite', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        loadingPercent = 100;
        creationStep = 'Created successfully! Loading dashboard...';
        await new Promise(r => setTimeout(r, 400));
        onsave(data.runId);
      } else {
        error = data.error || 'Failed to create evaluation run.';
      }
    } catch (err) {
      error = err.message || 'An error occurred during submission.';
    } finally {
      clearInterval(percentInterval);
      timers.forEach(t => clearTimeout(t));
      loading = false;
    }
  }
</script>

<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <h3 data-label="modal-title" class="modal-header-title">Create New Evaluation</h3>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
    </div>

    <form onsubmit={handleSubmit} class="modal-body">
      {#if error}
        <div class="error-banner">{error}</div>
      {/if}

      {#if loading}
        <div class="loading-state">
          <div class="spinner-container">
            <div class="hologram-spinner"></div>
            <Upload size={32} class="loading-icon" />
          </div>
          
          <div class="loading-text-block">
            <h4 class="loading-title">Creating Evaluation</h4>
            <p class="loading-subtitle">{creationStep}</p>
          </div>

          <div class="loading-progress-bar-wrapper">
            <div class="loading-bar-outer">
              <div class="loading-bar-inner" style="width: {loadingPercent}%"></div>
            </div>
            <span class="loading-percent-text">{loadingPercent}%</span>
          </div>
        </div>
      {:else}
        <div class="form-grid">
          <div class="form-column">
            <div class="form-group">
              <label for="eval-name">Evaluation Name</label>
              <input type="text" id="eval-name" bind:value={runName} placeholder="e.g., Q2 System Evaluation" required />
            </div>

            <div class="form-group">
              <label for="platform-name">Platform / System Name</label>
              <input type="text" id="platform-name" bind:value={platformName} placeholder="e.g., Zoho ERP, HubSpot, Custom Portal" required />
            </div>

            <div class="form-group">
              <label for="client-select">Client (Optional)</label>
              <select id="client-select" bind:value={clientId}>
                <option value="">-- General / Internal --</option>
                {#each clients as c}
                  <option value={c.id}>{c.name}</option>
                {/each}
              </select>
            </div>

            {#if clientId && projects.length > 0}
              <div class="form-group">
                <label for="project-select">Project (Optional)</label>
                <select id="project-select" bind:value={projectId}>
                  <option value="">-- No Project --</option>
                  {#each projects as p}
                    <option value={p.id}>{p.name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div class="form-group">
              <label for="eval-url">Target Login URL</label>
              <input type="url" id="eval-url" bind:value={url} placeholder="e.g., https://bizverse.in/login" />
            </div>

            <div class="form-group">
              <label for="eval-username">Username / Email</label>
              <input type="text" id="eval-username" bind:value={username} placeholder="test_user" />
            </div>

            <div class="form-group">
              <label for="eval-password">Password</label>
              <input type="password" id="eval-password" bind:value={password} placeholder="••••••••" />
            </div>
          </div>

          <div class="form-column selection-box-wrapper">
            <CriteriaDropzone bind:uploadedFile bind:error {loading} />
          </div>
        </div>

        <div class="form-footer">
          <button type="button" class="btn ghost-btn" onclick={onclose}>Cancel</button>
          <button type="submit" class="btn action-btn">
            <Plus size={16} />
            <span>Create Evaluation</span>
          </button>
        </div>
      {/if}
    </form>
  </div>
</div>

<style>
  @import "./TestRunModal.css";
</style>
