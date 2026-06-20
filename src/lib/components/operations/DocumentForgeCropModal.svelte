<script>
  import { X, Check, Crop } from '@lucide/svelte';

  let { imageUrl, onCrop, onClose } = $props();

  let canvasEl = $state();
  let img = $state();
  let loaded = $state(false);
  let cropX = $state(0);
  let cropY = $state(0);
  let cropW = $state(0);
  let cropH = $state(0);
  let dragging = $state(null);
  let dragStart = $state({ x: 0, y: 0 });
  let imgNatural = $state({ w: 0, h: 0 });
  let scale = $state(1);

  const MIN_CROP = 50;

  function init() {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      img = image;
      imgNatural = { w: image.naturalWidth, h: image.naturalHeight };
      loaded = true;

      const canvas = canvasEl;
      const maxW = Math.min(window.innerWidth * 0.9, image.naturalWidth);
      const maxH = Math.min(window.innerHeight * 0.75, image.naturalHeight);
      scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1);
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;

      cropX = canvas.width * 0.1;
      cropY = canvas.height * 0.1;
      cropW = canvas.width * 0.8;
      cropH = canvas.height * 0.6;

      draw();
    };
    image.src = imageUrl;
  }

  import { onMount } from 'svelte';

  onMount(init);

  function draw() {
    if (!canvasEl || !img) return;
    const ctx = canvasEl.getContext('2d');
    const cw = canvasEl.width;
    const ch = canvasEl.height;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.clearRect(cropX, cropY, cropW, cropH);

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    const handleSize = 10;
    const corners = [
      { x: cropX, y: cropY },
      { x: cropX + cropW, y: cropY },
      { x: cropX, y: cropY + cropH },
      { x: cropX + cropW, y: cropY + cropH }
    ];
    ctx.fillStyle = '#00d4ff';
    for (const c of corners) {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    }
  }

  function getHandle(pos) {
    const h = 8;
    const corners = [
      { name: 'nw', x: cropX, y: cropY },
      { name: 'ne', x: cropX + cropW, y: cropY },
      { name: 'sw', x: cropX, y: cropY + cropH },
      { name: 'se', x: cropX + cropW, y: cropY + cropH }
    ];
    for (const c of corners) {
      if (Math.abs(pos.x - c.x) < h && Math.abs(pos.y - c.y) < h) return c.name;
    }
    if (pos.x >= cropX && pos.x <= cropX + cropW && pos.y >= cropY && pos.y <= cropY + cropH) {
      return 'move';
    }
    return null;
  }

  function onPointerDown(e) {
    const rect = canvasEl.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const handle = getHandle(pos);
    if (!handle) return;
    dragging = handle;
    dragStart = { x: pos.x, y: pos.y, cx: cropX, cy: cropY, cw: cropW, ch: cropH };
    canvasEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const rect = canvasEl.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;

    let nx = cropX, ny = cropY, nw = cropW, nh = cropH;

    if (dragging === 'move') {
      nx = Math.max(0, Math.min(canvasEl.width - cropW, dragStart.cx + dx));
      ny = Math.max(0, Math.min(canvasEl.height - cropH, dragStart.cy + dy));
    } else if (dragging === 'se') {
      nw = Math.max(MIN_CROP, dragStart.cw + dx);
      nh = Math.max(MIN_CROP, dragStart.ch + dy);
    } else if (dragging === 'ne') {
      nw = Math.max(MIN_CROP, dragStart.cw + dx);
      ny = Math.min(dragStart.cy + dragStart.ch - MIN_CROP, dragStart.cy + dy);
      nh = Math.max(MIN_CROP, dragStart.ch - dy);
    } else if (dragging === 'sw') {
      nx = Math.min(dragStart.cx + dragStart.cw - MIN_CROP, dragStart.cx + dx);
      nw = Math.max(MIN_CROP, dragStart.cw - dx);
      nh = Math.max(MIN_CROP, dragStart.ch + dy);
    } else if (dragging === 'nw') {
      nx = Math.min(dragStart.cx + dragStart.cw - MIN_CROP, dragStart.cx + dx);
      nw = Math.max(MIN_CROP, dragStart.cw - dx);
      ny = Math.min(dragStart.cy + dragStart.ch - MIN_CROP, dragStart.cy + dy);
      nh = Math.max(MIN_CROP, dragStart.ch - dy);
    }

    cropX = Math.max(0, nx);
    cropY = Math.max(0, ny);
    cropW = Math.min(canvasEl.width - cropX, nw);
    cropH = Math.min(canvasEl.height - cropY, nh);
    draw();
  }

  function onPointerUp() {
    dragging = null;
  }

  async function confirmCrop() {
    if (cropW < MIN_CROP || cropH < MIN_CROP) return;

    const srcCanvas = canvasEl;
    const srcCtx = srcCanvas.getContext('2d');

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW / scale;
    cropCanvas.height = cropH / scale;
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(
      img,
      cropX / scale, cropY / scale, cropW / scale, cropH / scale,
      0, 0, cropCanvas.width, cropCanvas.height
    );

    const blob = await new Promise(resolve => cropCanvas.toBlob(resolve, 'image/png', 0.92));
    if (!blob) return;

    const formData = new FormData();
    formData.append('file', blob, 'cropped.png');
    const urlObj = new URL(imageUrl, window.location.origin);
    formData.append('replace', urlObj.pathname);

    const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) onCrop(data.url, data.localPath || '');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose();
  }

  import { browser } from '$app/environment';
  if (browser) {
    window.addEventListener('keydown', handleKeydown);
    import('svelte').then(m => {
      const destroy = $effect.root(() => {
        $effect(() => {
          return () => window.removeEventListener('keydown', handleKeydown);
        });
      });
    });
  }
</script>

<div class="crop-overlay" data-section="crop-modal" role="presentation" onclick={onClose}>
  <div class="crop-panel" role="presentation" onclick={(e) => e.stopPropagation()}>
    <div class="crop-header">
      <span class="crop-title"><Crop size={16} /> Crop Image</span>
      <button type="button" class="crop-close" onclick={onClose}><X size={18} /></button>
    </div>
    <div class="crop-canvas-wrap">
      {#if loaded}
        <canvas bind:this={canvasEl} onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerup={onPointerUp} style="cursor: {dragging ? (dragging === 'move' ? 'grabbing' : 'nwse-resize') : 'crosshair'};" />
      {:else}
        <div class="crop-loading">Loading image...</div>
      {/if}
    </div>
    <div class="crop-footer">
      <button type="button" class="btn-ghost" onclick={onClose}>Cancel</button>
      <button type="button" class="btn-primary" onclick={confirmCrop} disabled={!loaded || cropW < MIN_CROP || cropH < MIN_CROP}>
        <Check size={16} /> Apply Crop
      </button>
    </div>
  </div>
</div>

<style>
  .crop-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .crop-panel {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    max-width: 90vw;
    max-height: 90vh;
    box-shadow: 0 0 40px rgba(0,212,255,0.15);
  }

  .crop-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .crop-title {
    font-family: var(--font-heading);
    font-size: var(--fs-section);
    color: var(--cyan);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .crop-close {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px;
    display: flex;
    transition: all 0.15s;
  }
  .crop-close:hover { color: var(--cyan); border-color: var(--cyan-dim); }

  .crop-canvas-wrap {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .crop-canvas-wrap canvas {
    max-width: 100%;
    max-height: 65vh;
    border-radius: 4px;
    touch-action: none;
  }

  .crop-loading {
    padding: 60px;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
  }

  .crop-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body);
    padding: 6px 16px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-ghost:hover { color: var(--cyan); border-color: var(--cyan-dim); }

  .btn-primary {
    background: var(--cyan);
    border: none;
    border-radius: var(--radius);
    color: #000;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    padding: 6px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .btn-primary:hover { background: #33ddff; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
