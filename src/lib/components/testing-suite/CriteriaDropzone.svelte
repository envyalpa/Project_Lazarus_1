<script>
  import { Upload, FileSpreadsheet, HelpCircle } from '@lucide/svelte';
  
  let { uploadedFile = $bindable(null), error = $bindable(''), loading = false } = $props();
  
  let fileInput = $state(null);
  let isDragging = $state(false);

  function validateAndSetFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv' || ext === 'pdf') {
      uploadedFile = file;
      error = '';
    } else {
      error = 'Unsupported file type. Please upload a CSV or PDF file.';
    }
  }

  function handleFileChange(e) { validateAndSetFile(e.target.files?.[0]); }
  function handleDragOver(e) { e.preventDefault(); isDragging = true; }
  function handleDragLeave(e) { e.preventDefault(); isDragging = false; }
  
  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    validateAndSetFile(e.dataTransfer?.files?.[0]);
  }

  function downloadTemplate() {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
      'Stage,Pain Point,What to Test,Expected Outcome,Role,Severity\n' +
      'Authentication,,Verify login with correct credentials,Dashboard is displayed,User,Important\n' +
      'User Management,,Create new user account,New user is added successfully,Admin,Critical\n'
    );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'testing_criteria_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="section-box box-subtasks">
  <span class="box-label">Criteria Settings</span>
  
  <div 
    class="dropzone" 
    class:dragging={isDragging}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="button"
    tabindex="0"
    onclick={() => { if (!loading) fileInput.click(); }}
    onkeydown={(e) => { if (!loading && (e.key === 'Enter' || e.key === ' ')) fileInput.click(); }}
  >
    <input type="file" bind:this={fileInput} accept=".csv,.pdf" onchange={handleFileChange} style="display: none;" disabled={loading} />
    
    {#if uploadedFile}
      <div class="file-info-box" onclick={(e) => e.stopPropagation()}>
        <FileSpreadsheet size={24} class="file-icon" />
        <div class="file-details">
          <span class="file-name">{uploadedFile.name}</span>
          <span class="file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
        </div>
        <button type="button" class="remove-file-btn" onclick={(e) => { e.stopPropagation(); uploadedFile = null; if (fileInput) fileInput.value = ''; }} title="Remove" disabled={loading}>✕</button>
      </div>
    {:else}
      <div class="dropzone-prompt">
        <Upload size={24} class="upload-icon" />
        <span class="prompt-title">Drag & drop CSV or PDF checklist</span>
        <span class="prompt-subtitle">or click to browse local files</span>
      </div>
    {/if}
  </div>

  <div class="template-download-row">
    <button type="button" class="template-link-btn" onclick={downloadTemplate} disabled={loading}>
      <FileSpreadsheet size={14} />
      <span>Download CSV Template</span>
    </button>
  </div>
  
  <div class="criteria-help">
    <HelpCircle size={12} />
    <span>Leaves as default template if empty. CSV requires columns: <em>Stage</em>, <em>What to Test</em>, <em>Expected Outcome</em>.</span>
  </div>
</div>

<style>
  @import "./TestRunModal.css";
</style>
