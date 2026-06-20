<script>
  import { onMount } from 'svelte';
  import { X, Save, Plus, Trash2, Upload, AlertTriangle } from '@lucide/svelte';
  import { notify } from '$lib/stores/notification.js';

  let { client, onclose } = $props();

  let brands = $state([]);
  let activeBrand = $state(null); // The brand being edited

  // Brand Form Fields
  let profileName = $state('');
  let logoDataUri = $state('');
  let colors = $state({
    primary: '#00d4ff',
    secondary: '#0088ff',
    text: '#1e293b',
    background: '#ffffff',
    tableHeaderBg: '#0f172a',
    tableBorder: '#cbd5e1'
  });
  let typography = $state({
    headingFont: 'Arial',
    bodyFont: 'Arial',
    baseSize: '14px',
    lineHeight: '1.6'
  });
  let layout = $state({
    pagePadding: '20mm',
    headerTemplate: 'Corporate Proposal',
    footerTemplate: 'Confidential | Page {page} of {pages}'
  });
  let isDefault = $state(false);

  const fontOptions = ['Arial', 'Inter', 'Exo', 'Lexend', 'Rajdhani', 'Orbitron', 'Georgia', 'Times New Roman'];

  onMount(() => {
    loadBrands();
  });

  async function loadBrands() {
    try {
      const res = await fetch(`/operations/clients/${client.id}/brands`);
      if (!res.ok) throw new Error('Failed to load brand profiles.');
      brands = await res.json();
      
      // Auto-select first or default brand
      if (brands.length > 0) {
        const def = brands.find(b => b.is_default) || brands[0];
        selectBrand(def);
      } else {
        createNewBrand();
      }
    } catch (err) {
      notify('Error loading brands: ' + err.message);
    }
  }

  function selectBrand(brand) {
    activeBrand = brand;
    profileName = brand.profile_name;
    logoDataUri = brand.logo_data_uri || '';
    isDefault = brand.is_default === 1;
    
    try {
      colors = { ...colors, ...JSON.parse(brand.colors_json) };
    } catch (e) {}
    try {
      typography = { ...typography, ...JSON.parse(brand.typography_json) };
    } catch (e) {}
    try {
      layout = { ...layout, ...JSON.parse(brand.layout_json) };
    } catch (e) {}
  }

  function createNewBrand() {
    activeBrand = { id: null };
    profileName = 'New Brand Profile';
    logoDataUri = '';
    colors = {
      primary: '#0052cc',
      secondary: '#0088ff',
      text: '#1e293b',
      background: '#ffffff',
      tableHeaderBg: '#0f172a',
      tableBorder: '#cbd5e1'
    };
    typography = {
      headingFont: 'Arial',
      bodyFont: 'Arial',
      baseSize: '14px',
      lineHeight: '1.6'
    };
    layout = {
      pagePadding: '20mm',
      headerTemplate: 'Corporate Proposal',
      footerTemplate: 'Confidential | Page {page} of {pages}'
    };
    isDefault = false;
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify('Logo size must be under 2MB, Commander.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      logoDataUri = reader.result;
    };
    reader.onerror = () => {
      notify('Error reading image file.');
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!profileName.trim()) {
      notify('Profile name is required.');
      return;
    }

    const payload = {
      id: activeBrand.id,
      profile_name: profileName,
      logo_data_uri: logoDataUri,
      colors_json: JSON.stringify(colors),
      typography_json: JSON.stringify(typography),
      layout_json: JSON.stringify(layout),
      is_default: isDefault
    };

    try {
      const res = await fetch(`/operations/clients/${client.id}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save brand profile.');
      notify('Brand profile saved successfully, Commander.');
      loadBrands();
    } catch (err) {
      notify('Error saving brand: ' + err.message);
    }
  }

  async function handleDelete(brandId) {
    if (!confirm('Are you sure you want to delete this brand profile? This cannot be undone.')) return;
    try {
      const res = await fetch(`/operations/clients/${client.id}/brands`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      });
      if (!res.ok) throw new Error('Failed to delete brand profile.');
      notify('Brand profile deleted, Commander.');
      loadBrands();
    } catch (err) {
      notify('Error deleting brand: ' + err.message);
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="modal" class="modal modal-wide brand-modal" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <h3 data-label="modal-title" class="modal-header-title">Brand Manager: {client.name}</h3>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose} title="Close Brand Manager">
        <X size={18} />
      </button>
    </div>

    <div data-label="modal-body" class="brand-body-split">
      <!-- Left List Panel -->
      <div class="brands-list-panel">
        <button type="button" class="new-brand-btn" onclick={createNewBrand}>
          <Plus size={14} /> New Brand Set
        </button>
        <div class="brands-scroll-list">
          {#each brands as b}
            <div class="brand-list-item" class:active={activeBrand?.id === b.id} onclick={() => selectBrand(b)}>
              <div class="brand-item-info">
                <span class="brand-item-name">{b.profile_name}</span>
                {#if b.is_default}
                  <span class="default-badge">DEFAULT</span>
                {/if}
              </div>
              <button type="button" class="item-delete-btn" onclick={(e) => { e.stopPropagation(); handleDelete(b.id); }} title="Delete Brand">
                <Trash2 size={14} />
              </button>
            </div>
          {/each}
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="brand-form-panel">
        {#if activeBrand}
          <div class="form-scroll-container">
            <!-- Basic Details -->
            <div class="form-group-section">
              <h4 class="section-title">Brand Settings</h4>
              <div class="input-field">
                <label for="profileName">Profile Name</label>
                <input type="text" id="profileName" bind:value={profileName} class="text-input" placeholder="e.g. Q4 Corporate Standard" />
              </div>
              <div class="checkbox-field">
                <input type="checkbox" id="isDefault" bind:checked={isDefault} />
                <label for="isDefault">Set as default brand for {client.name}</label>
              </div>
            </div>

            <!-- Logo Upload -->
            <div class="form-group-section">
              <h4 class="section-title">Logo Configuration</h4>
              <div class="logo-uploader-row">
                <div class="logo-preview-box">
                  {#if logoDataUri}
                    <img src={logoDataUri} alt="Brand Logo Preview" class="logo-img-preview" />
                  {:else}
                    <div class="logo-placeholder">NO LOGO</div>
                  {/if}
                </div>
                <div class="logo-upload-controls">
                  <label class="file-upload-btn">
                    <Upload size={14} /> Choose Image...
                    <input type="file" accept="image/*" onchange={handleLogoUpload} style="display: none;" />
                  </label>
                  {#if logoDataUri}
                    <button type="button" class="remove-logo-btn" onclick={() => logoDataUri = ''}>Remove Logo</button>
                  {/if}
                  <span class="upload-tip">Supports PNG, JPG (Max 2MB). Stored securely as Base64.</span>
                </div>
              </div>
            </div>

            <!-- Visual Design Tokens -->
            <div class="form-group-section">
              <h4 class="section-title">Design Tokens (Colors)</h4>
              <div class="color-grid">
                <div class="color-picker-item">
                  <label for="primaryColor">Primary Color</label>
                  <div class="picker-row">
                    <input type="color" id="primaryColor" bind:value={colors.primary} />
                    <input type="text" class="color-hex-text" bind:value={colors.primary} />
                  </div>
                </div>
                <div class="color-picker-item">
                  <label for="secondaryColor">Secondary Color</label>
                  <div class="picker-row">
                    <input type="color" id="secondaryColor" bind:value={colors.secondary} />
                    <input type="text" class="color-hex-text" bind:value={colors.secondary} />
                  </div>
                </div>
                <div class="color-picker-item">
                  <label for="textColor">Text Color</label>
                  <div class="picker-row">
                    <input type="color" id="textColor" bind:value={colors.text} />
                    <input type="text" class="color-hex-text" bind:value={colors.text} />
                  </div>
                </div>
                <div class="color-picker-item">
                  <label for="bgColor">Background</label>
                  <div class="picker-row">
                    <input type="color" id="bgColor" bind:value={colors.background} />
                    <input type="text" class="color-hex-text" bind:value={colors.background} />
                  </div>
                </div>
                <div class="color-picker-item">
                  <label for="headerBg">Table Header</label>
                  <div class="picker-row">
                    <input type="color" id="headerBg" bind:value={colors.tableHeaderBg} />
                    <input type="text" class="color-hex-text" bind:value={colors.tableHeaderBg} />
                  </div>
                </div>
                <div class="color-picker-item">
                  <label for="tableBorder">Table Border</label>
                  <div class="picker-row">
                    <input type="color" id="tableBorder" bind:value={colors.tableBorder} />
                    <input type="text" class="color-hex-text" bind:value={colors.tableBorder} />
                  </div>
                </div>
              </div>
            </div>

            <!-- Typography & Margins -->
            <div class="form-group-section">
              <h4 class="section-title">Typography & Page Configuration</h4>
              <div class="typography-row">
                <div class="input-field select-field">
                  <label for="headingFont">Heading Font</label>
                  <select id="headingFont" bind:value={typography.headingFont}>
                    {#each fontOptions as font}
                      <option value={font}>{font}</option>
                    {/each}
                  </select>
                </div>
                <div class="input-field select-field">
                  <label for="bodyFont">Body Font</label>
                  <select id="bodyFont" bind:value={typography.bodyFont}>
                    {#each fontOptions as font}
                      <option value={font}>{font}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <div class="typography-row" style="margin-top: 12px;">
                <div class="input-field">
                  <label for="headerTemplate">Header Title Template</label>
                  <input type="text" id="headerTemplate" bind:value={layout.headerTemplate} class="text-input" />
                </div>
                <div class="input-field">
                  <label for="footerTemplate">Footer Title Template</label>
                  <input type="text" id="footerTemplate" bind:value={layout.footerTemplate} class="text-input" />
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions-panel">
            <button type="button" class="save-brand-submit" onclick={handleSave}>
              <Save size={16} /> Save Brand Profile
            </button>
          </div>
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
    z-index: 200;
  }

  .brand-modal {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    width: 950px;
    max-width: 95vw;
    max-height: 90vh;
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.15);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: #0b1a30;
  }

  .modal-header-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 700;
    color: var(--cyan);
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

  .brand-body-split {
    display: flex;
    flex: 1;
    height: 60vh;
    min-height: 450px;
    overflow: hidden;
  }

  .brands-list-panel {
    width: 240px;
    border-right: 1px solid var(--border);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    padding: 16px;
    box-sizing: border-box;
    gap: 12px;
  }

  .new-brand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 8px;
    background: transparent;
    border: 1px dashed var(--cyan-dim);
    border-radius: var(--radius);
    color: var(--cyan);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .new-brand-btn:hover {
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.05);
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .brands-scroll-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .brand-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .brand-list-item:hover {
    border-color: var(--cyan-dim);
    background: rgba(0, 212, 255, 0.02);
  }

  .brand-list-item.active {
    border-color: var(--cyan);
    background: rgba(0, 212, 255, 0.08);
    box-shadow: inset 0 0 6px var(--cyan-glow);
  }

  .brand-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .brand-item-name {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .default-badge {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--amber);
    letter-spacing: 0.5px;
  }

  .item-delete-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .item-delete-btn:hover {
    color: var(--danger);
  }

  .brand-form-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .form-scroll-container {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
  }

  .form-group-section {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-surface);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: var(--cyan);
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-field label {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-dim);
    font-weight: 600;
  }

  .text-input {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 8px 12px;
    outline: none;
  }

  .text-input:focus {
    border-color: var(--cyan);
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .checkbox-field label {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    cursor: pointer;
  }

  .logo-uploader-row {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .logo-preview-box {
    width: 100px;
    height: 100px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .logo-img-preview {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .logo-placeholder {
    font-family: var(--font-heading-1);
    font-size: var(--fs-caption);
    color: var(--text-muted);
    font-weight: 700;
  }

  .logo-upload-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--cyan);
    color: var(--bg-surface);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 700;
    border-radius: var(--radius);
    cursor: pointer;
    width: max-content;
  }

  .remove-logo-btn {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    padding: 4px 10px;
    border-radius: var(--radius);
    cursor: pointer;
    width: max-content;
  }

  .upload-tip {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-dim);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .color-picker-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .color-picker-item label {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-dim);
    font-weight: 600;
  }

  .picker-row {
    display: flex;
    gap: 8px;
  }

  .picker-row input[type='color'] {
    width: 40px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  .color-hex-text {
    flex: 1;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: var(--fs-caption);
    text-align: center;
    padding: 4px;
    outline: none;
  }

  .typography-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .select-field select {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 8px 12px;
    outline: none;
    cursor: pointer;
  }

  .form-actions-panel {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    background: var(--bg-surface);
  }

  .save-brand-submit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--cyan);
    color: var(--bg-surface);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 700;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-brand-submit:hover {
    box-shadow: 0 0 15px var(--cyan-glow);
    background: #33ddff;
  }
</style>
