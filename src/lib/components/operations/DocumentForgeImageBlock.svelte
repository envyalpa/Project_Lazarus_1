<script>
  import { AlignStartVertical, AlignCenterVertical, AlignEndVertical, ImageUp, Upload, ImageOff, Trash2, Link2 } from '@lucide/svelte';
  import DocumentForgeCropModal from './DocumentForgeCropModal.svelte';

  let { block, theme = 'black', onupdate } = $props();

  let imgEl = $state();
  let originalWidth = $state(null);
  let originalHeight = $state(null);
  let showCropModal = $state(false);
  let showLinkPopover = $state(false);
  let urlInput = $state('');
  let loadError = $state(false);

  let alignment = $derived(block.alignment || 'center');
  let displayWidth = $derived(block.width || null);
  let isLocalImage = $derived(block.imageUrl?.startsWith('/images/'));

  let resizeState = $state(null);

  function handleImgLoad() {
    if (imgEl && !originalWidth) {
      originalWidth = imgEl.naturalWidth;
      originalHeight = imgEl.naturalHeight;
      loadError = false;
    }
  }

  function handleImgError() {
    loadError = true;
  }

  function updateAlign(align) {
    onupdate({ ...block, alignment: align });
  }

  function startResize(e, side) {
    e.preventDefault();
    e.stopPropagation();
    if (!originalWidth) return;
    resizeState = {
      side, startX: e.clientX,
      startWidth: block.width || originalWidth,
      originWidth: originalWidth
    };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    const delta = resizeState.side === 'right'
      ? e.clientX - resizeState.startX
      : resizeState.startX - e.clientX;
    const newWidth = resizeState.startWidth + delta;
    const minW = 50;
    const clamped = Math.max(minW, newWidth);
    const pct = clamped / resizeState.originWidth;
    const snapped = Math.round(pct / 0.1) * 0.1;
    const snappedPx = Math.round(snapped * resizeState.originWidth);
    onupdate({ ...block, width: Math.max(minW, snappedPx) });
  }

  function onResizeEnd() {
    resizeState = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  function applyUrl() {
    const url = urlInput.trim();
    if (!url) return;
    onupdate({ ...block, imageUrl: url, imageAlt: '' });
    urlInput = '';
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
    const d = await res.json();
    if (d.url) onupdate({ ...block, imageUrl: d.url, imageAlt: '', localPath: d.localPath || '' });
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const fd = new FormData();
      fd.append('file', file);
      fetch('/api/upload/image', { method: 'POST', body: fd }).then(r => r.json()).then(d => {
        if (d.url) onupdate({ ...block, imageUrl: d.url, imageAlt: '', localPath: d.localPath || '' });
      });
    }
  }

  function handlePaste(e) {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text && /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(\?|$)/i.test(text)) {
      e.preventDefault();
      onupdate({ ...block, imageUrl: text.trim(), imageAlt: '' });
    }
  }

  function openCrop() { showCropModal = true; }

  function handleCrop(url, localPath = '') {
    onupdate({ ...block, imageUrl: url, width: null, localPath: localPath || block.localPath });
    showCropModal = false;
    originalWidth = null;
    originalHeight = null;
    loadError = false;
  }

  let alignValue = $derived(alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center');

  $effect(() => {
    if (!showLinkPopover) return;
    const handler = (e) => {
      if (!e.target.closest('.link-popover') && !e.target.closest('.link-trigger')) {
        showLinkPopover = false;
      }
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  });
</script>

<div data-section="image-block" class="image-block theme-{theme}" onpaste={handlePaste} role="presentation">
  {#if block.imageUrl && !loadError}
    <div class="image-container" style="justify-content: {alignValue};">
      <div class="image-wrap" style="width: {displayWidth ? displayWidth + 'px' : '100%'}; max-width: 100%; position: relative;">
        <img
          bind:this={imgEl}
          src={block.imageUrl}
          alt={block.imageAlt || ''}
          onload={handleImgLoad}
          onerror={handleImgError}
          ondblclick={openCrop}
          style="width: 100%; height: auto; display: block;"
          draggable="false"
        />

        <div class="image-toolbar">
          <div class="align-pill">
            <button type="button" class="pill-btn" class:active={alignment === 'left'} onclick={() => updateAlign('left')} title="Align Left">
              <AlignStartVertical size={16} />
            </button>
            <button type="button" class="pill-btn" class:active={alignment === 'center'} onclick={() => updateAlign('center')} title="Align Center">
              <AlignCenterVertical size={16} />
            </button>
            <button type="button" class="pill-btn" class:active={alignment === 'right'} onclick={() => updateAlign('right')} title="Align Right">
              <AlignEndVertical size={16} />
            </button>
            <span class="pill-sep"></span>
            <button type="button" class="pill-btn link-trigger" onclick={() => showLinkPopover = !showLinkPopover} title="Image Info">
              <Link2 size={16} />
            </button>

            {#if showLinkPopover}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div class="link-popover" role="presentation" onclick={(e) => e.stopPropagation()}>
                <div class="popover-row">
                  <span class="popover-label">URL</span>
                  <code class="popover-value">{block.imageUrl}</code>
                </div>
                {#if isLocalImage && block.localPath}
                  <div class="popover-row">
                    <span class="popover-label">Local Path</span>
                    <code class="popover-value">{block.localPath}</code>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <div class="resize-handle left" onmousedown={(e) => startResize(e, 'left')} title="Resize"></div>
        <div class="resize-handle right" onmousedown={(e) => startResize(e, 'right')} title="Resize"></div>
      </div>
    </div>

  {:else if loadError}
    <div class="image-error">
      <ImageOff size={32} />
      <span>Failed to load image</span>
      <button type="button" class="error-clear" onclick={() => onupdate({ ...block, imageUrl: '', imageAlt: '' })}>
        <Trash2 size={14} /> Remove
      </button>
    </div>

  {:else}
    <div class="image-empty" ondrop={handleDrop} ondragover={(e) => e.preventDefault()}>
      <ImageUp size={24} />
      <p>Paste image URL, drop a file, or choose one</p>
      <div class="url-row">
        <input type="text" bind:value={urlInput} placeholder="https://example.com/image.jpg" class="url-input" onkeydown={(e) => { if (e.key === 'Enter') applyUrl(); }} />
        <button type="button" class="url-apply" onclick={applyUrl} disabled={!urlInput.trim()}><Upload size={16} /></button>
      </div>
      <label class="file-label">
        <Upload size={14} /> Upload File
        <input type="file" accept="image/*" onchange={handleFileSelect} hidden />
      </label>
    </div>
  {/if}
</div>

{#if showCropModal}
  <DocumentForgeCropModal imageUrl={block.imageUrl} onCrop={handleCrop} onClose={() => showCropModal = false} />
{/if}

<style>
  .image-block { padding: 4px 0; }

  .image-container { display: flex; width: 100%; }

  .image-wrap { position: relative; border-radius: 4px; overflow: hidden; line-height: 0; }

  .image-wrap img { border-radius: 4px; user-select: none; -webkit-user-drag: none; }

  /* Centered pill toolbar — visible on hover */
  .image-toolbar {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 20;
    pointer-events: none;
  }
  .image-wrap:hover .image-toolbar {
    opacity: 1;
    pointer-events: auto;
  }

  .align-pill {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 5px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    position: relative;
  }

  .pill-btn {
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 5px;
    display: flex;
    transition: all 0.15s;
  }
  .pill-btn:hover { color: var(--cyan); background: var(--bg-elevated); }
  .pill-btn.active { color: var(--cyan); background: rgba(0,212,255,0.15); }

  .pill-sep {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 5px;
    flex-shrink: 0;
  }

  /* Link popover */
  .link-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    min-width: 280px;
    max-width: 400px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 30;
  }

  .popover-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .popover-label {
    font-family: var(--font-heading);
    font-size: 10px;
    color: var(--cyan-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .popover-value {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    word-break: break-all;
    background: rgba(0,0,0,0.3);
    padding: 4px 8px;
    border-radius: 4px;
    line-height: 1.4;
  }

  /* Resize handles */
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 10px;
    cursor: ew-resize;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
    background: rgba(0,212,255,0.3);
    border-left: 1px solid var(--cyan);
    border-right: 1px solid var(--cyan);
  }
  .image-wrap:hover .resize-handle { opacity: 1; }
  .resize-handle:hover { background: rgba(0,212,255,0.5); }
  .resize-handle.left { left: 0; border-radius: 0 3px 3px 0; }
  .resize-handle.right { right: 0; border-radius: 3px 0 0 3px; }

  /* Error state */
  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: rgba(239,68,68,0.04);
  }
  .image-error :global(svg) { color: var(--danger); }

  .error-clear {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    padding: 4px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }
  .error-clear:hover { color: var(--danger); border-color: var(--danger); }

  /* Empty state */
  .image-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: rgba(0,212,255,0.03);
    cursor: default;
    font-family: var(--font-body);
  }
  .image-empty :global(svg) { color: var(--cyan-dim); }
  .image-empty p { margin: 0; font-size: var(--fs-body); color: var(--text-dim); }

  .url-row { display: flex; gap: 6px; width: 100%; max-width: 480px; }

  .url-input {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 8px 12px;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .url-input:focus { border-color: var(--cyan-dim); }

  .url-apply {
    background: rgba(0,212,255,0.12);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
    color: var(--cyan);
    cursor: pointer;
    padding: 8px 12px;
    display: flex;
    transition: all 0.15s;
  }
  .url-apply:hover { background: rgba(0,212,255,0.25); }
  .url-apply:disabled { opacity: 0.4; cursor: not-allowed; }

  .file-label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px dashed var(--cyan-dim);
    border-radius: var(--radius);
    color: var(--cyan-dim);
    font-size: var(--fs-caption);
    cursor: pointer;
    transition: all 0.15s;
  }
  .file-label:hover { background: rgba(0,212,255,0.06); border-color: var(--cyan); color: var(--cyan); }

  /* Theme overrides */
  .theme-white .image-empty { background: rgba(0,136,255,0.03); }
  .theme-white .url-input { background: #fff; border-color: #ccc; color: #333; }
  .theme-white .url-input:focus { border-color: var(--cyan-dark); }
  .theme-white .url-apply { background: rgba(0,136,255,0.1); border-color: var(--cyan-dark); color: var(--cyan-dark); }
  .theme-white .file-label { border-color: var(--cyan-dark); color: var(--cyan-dark); }
  .theme-white .file-label:hover { background: rgba(0,136,255,0.06); }
  .theme-white .image-error { background: rgba(239,68,68,0.03); border-color: #ccc; }
</style>
