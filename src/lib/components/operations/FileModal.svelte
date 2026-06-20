<script>
  import { getIconForUrl } from '$lib/links.js';
  import DynamicIcon from './DynamicIcon.svelte';
  import { FileUp, Link } from '@lucide/svelte';

  let { file = null, onSave, onCancel } = $props();

  let uploadMode = $state(file?.is_internal ? 'upload' : 'link');
  let fileName = $state(file?.file_name || '');
  let link = $state(file?.link || '');
  let selectedFile = $state(null);
  let fileInputEl = $state(null);
  let dragging = $state(false);

  let fileTypeIcon = $derived(
    uploadMode === 'upload'
      ? (selectedFile ? selectedFile.name.split('.').pop().toLowerCase() : (file?.file_type || 'FileText'))
      : getIconForUrl(link)
  );

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      if (!fileName.trim()) {
        fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      }
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    dragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      if (!fileName.trim()) {
        fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fileName.trim()) return;
    
    if (uploadMode === 'upload') {
      if (!selectedFile && !file?.is_internal) return;
      
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('file_name', fileName.trim());
      onSave(formData);
    } else {
      onSave({ file_name: fileName.trim(), file_type: fileTypeIcon, link: link.trim(), is_internal: 0 });
    }
  }
</script>

<form data-section="file-modal" class="modal-form" onsubmit={handleSubmit}>
  <!-- Mode Tab Bar -->
  {#if !file}
    <div class="mode-tabs">
      <button type="button" class="tab-btn" class:active={uploadMode === 'link'} onclick={() => uploadMode = 'link'}>
        <Link size={14} /> Link URL
      </button>
      <button type="button" class="tab-btn" class:active={uploadMode === 'upload'} onclick={() => uploadMode = 'upload'}>
        <FileUp size={14} /> Upload File
      </button>
    </div>
  {/if}

  <div class="form-fields">
    <div class="field">
      <span class="field-label">File Name</span>
      <input type="text" class="input" placeholder="e.g. Project Report Q3" bind:value={fileName} required />
    </div>

    {#if uploadMode === 'upload'}
      <div class="field">
        <span class="field-label">Local File</span>
        <div class="dropzone" class:dragging={dragging}
          ondragover={(e) => { e.preventDefault(); dragging = true; }}
          ondragleave={() => dragging = false}
          ondrop={handleFileDrop}
          onclick={() => fileInputEl?.click()}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click(); }}
        >
          <input type="file" bind:this={fileInputEl} accept=".md,.txt,.pdf,.xlsx,.xls,.csv" class="file-input" onchange={handleFileSelect} style="display: none;" />
          <div class="upload-icon"><FileUp size={32} /></div>
          {#if selectedFile}
            <p class="upload-text">{selectedFile.name}</p>
            <p class="upload-hint">{(selectedFile.size / 1024).toFixed(1)} KB — click or drop to change</p>
          {:else if file?.is_internal}
            <p class="upload-text">{file.file_name} (Already Uploaded)</p>
            <p class="upload-hint">Click or drop to replace original file</p>
          {:else}
            <p class="upload-text">Drop a file here or click to browse</p>
            <p class="upload-hint">Supports PDF, XLSX, XLS, CSV, TXT, MD</p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="field">
        <span class="field-label">File Type Icon (Auto-selected)</span>
        <div class="icon-preview-row">
          <div class="icon-preview" class:icon-dim={fileTypeIcon === 'Link'}>
            <DynamicIcon name={fileTypeIcon} size={20} />
          </div>
          <span class="icon-name">{fileTypeIcon}</span>
        </div>
      </div>
      <div class="field">
        <span class="field-label">Link URL</span>
        <input type="url" class="input" placeholder="https://…" bind:value={link} required={uploadMode === 'link'} />
      </div>
    {/if}
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={onCancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!fileName.trim() || (uploadMode === 'upload' && !selectedFile && !file?.is_internal)}>Save</button>
  </div>
</form>

<style>
  .modal-form { display: flex; flex-direction: column; gap: 20px; }
  .mode-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--modal-border); padding-bottom: 8px; }
  .tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); background: transparent; border: 1px solid transparent; border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
  .tab-btn:hover { color: var(--cyan); background: var(--bg-card); }
  .tab-btn.active { color: var(--cyan); border-color: var(--modal-border); background: var(--bg-surface); }
  
  .form-fields { display: flex; flex-direction: column; gap: 14px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 10px 14px; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .input:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  
  .icon-preview-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; }
  .icon-preview { display: flex; align-items: center; color: var(--accent-cyan); }
  .icon-preview.icon-dim { color: var(--text-dim); }
  .icon-name { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  
  .dropzone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px 16px; border: 2px dashed var(--modal-border); border-radius: 6px; background: var(--bg-surface); cursor: pointer; transition: all 0.2s; text-align: center; }
  .dropzone:hover, .dropzone.dragging { border-color: var(--accent-cyan); background: rgba(0,200,255,0.02); }
  .upload-icon { color: var(--text-dim); }
  .dropzone:hover .upload-icon { color: var(--accent-cyan); }
  .upload-text { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--modal-text); margin: 0; }
  .upload-hint { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-dim); margin: 0; }

  .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; border-radius: var(--radius); border: 1px solid var(--modal-border); cursor: pointer; transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
