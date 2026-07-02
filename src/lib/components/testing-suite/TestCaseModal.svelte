<script>
  import { X, Image, Upload, Trash2 } from '@lucide/svelte';
  
  let { runId, item, onclose, onsave } = $props();

  let status = $state(item.status || 'pending'), notesGap = $state(item.notes_gap || '');
  let screenshotPath = $state(item.screenshot_path || ''), uploading = $state(false), saving = $state(false), error = $state('');

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    uploading = true;
    error = '';

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: fd
      });

      const data = await res.json();
      if (res.ok && data.url) {
        screenshotPath = data.url;
      } else {
        error = data.error || 'Failed to upload screenshot.';
      }
    } catch (err) {
      error = err.message || 'Error uploading file.';
    } finally {
      uploading = false;
    }
  }

  async function handleSave() {
    saving = true;
    error = '';
    try {
      const res = await fetch(`/settings/testing-suite/${runId}/result`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status,
          notes_gap: notesGap,
          screenshot_path: screenshotPath
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onsave();
      } else {
        error = data.error || 'Failed to save changes.';
      }
    } catch (err) {
      error = err.message || 'Error saving changes.';
    } finally {
      saving = false;
    }
  }
</script>

<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <div class="header-titles">
        <span class="modal-subtitle">{item.stage} ▸ Case #{item.criteria_id}</span>
        <h3 data-label="modal-title" class="modal-header-title">Log Test Findings</h3>
      </div>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
    </div>

    <div class="modal-body">
      {#if error}
        <div class="error-banner">{error}</div>
      {/if}

      <div class="case-details">
        <div class="details-group">
          <span class="detail-label">Verification Step</span>
          <p class="detail-content">{item.what_to_test}</p>
        </div>
        <div class="details-group">
          <span class="detail-label">Expected Outcome</span>
          <p class="detail-content">{item.expected_outcome}</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-column">
          <div class="form-group">
            <label class="section-label">Test Status</label>
            <div class="status-buttons">
              <button 
                type="button" 
                class="status-choice passed" 
                class:active={status === 'passed'} 
                onclick={() => status = 'passed'}
                disabled={saving}
              >
                Passed
              </button>
              <button 
                type="button" 
                class="status-choice failed" 
                class:active={status === 'failed'} 
                onclick={() => status = 'failed'}
                disabled={saving}
              >
                Failed
              </button>
              <button 
                type="button" 
                class="status-choice gaps" 
                class:active={status === 'gaps'} 
                onclick={() => status = 'gaps'}
                disabled={saving}
              >
                Gaps
              </button>
              <button 
                type="button" 
                class="status-choice pending" 
                class:active={status === 'pending'} 
                onclick={() => status = 'pending'}
                disabled={saving}
              >
                Pending
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="notes-gap">Notes / Gap Description</label>
            <textarea 
              id="notes-gap" 
              bind:value={notesGap} 
              placeholder="Describe findings, deviations, configuration requirements, or bugs..."
              disabled={saving}
            ></textarea>
          </div>
        </div>

        <div class="form-column">
          <div class="form-group screenshot-group">
            <label class="section-label">Screenshot Evidence</label>
            
            <div class="screenshot-area">
              {#if screenshotPath}
                <div class="screenshot-preview-container">
                  <img src={screenshotPath} alt="Evidence Screenshot" class="screenshot-preview" />
                  <div class="screenshot-overlay">
                    <button type="button" class="action-btn delete-btn" onclick={() => screenshotPath = ''} title="Remove Screenshot">
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              {:else}
                <input type="file" accept="image/*" id="evidence-upload" style="display: none;" onchange={handleFileUpload} disabled={uploading || saving} />
                <button 
                  type="button" 
                  class="upload-box" 
                  onclick={() => document.getElementById('evidence-upload').click()}
                  disabled={uploading || saving}
                >
                  {#if uploading}
                    <div class="spinner"></div>
                    <span>Uploading Image...</span>
                  {:else}
                    <Upload size={24} />
                    <span class="upload-title">Upload Screenshot</span>
                    <span class="upload-desc">Select PNG, JPG, or WebP</span>
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="form-footer">
        <button type="button" class="btn ghost-btn" onclick={onclose} disabled={saving}>Cancel</button>
        <button type="button" class="btn save-btn" onclick={handleSave} disabled={saving || uploading}>
          <span>{saving ? 'Saving...' : 'Save Findings'}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @import "./TestCaseModal.css";
</style>
