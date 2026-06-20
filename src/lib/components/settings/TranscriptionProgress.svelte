<script>
  import { CircleCheck, LoaderCircle, FileAudio } from '@lucide/svelte';

  let { status, fileName = '', fileSize = 0, stagePercent = {}, stageLabels = {}, elapsed = '', infoText = '', llmEnabled = false } = $props();

  let formattedSize = $derived(fileSize > 1024 * 1024
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : `${(fileSize / 1024).toFixed(1)} KB`
  );

  let uploadPct = $derived(stagePercent.upload ?? 0);
  let transcribePct = $derived(stagePercent.transcribe ?? 0);
  let llmPct = $derived(stagePercent.llm ?? 0);
  let cleanupPct = $derived(stagePercent.cleanup ?? 0);

  let overallPercent = $derived.by(() => {
    if (status === 'complete' || cleanupPct >= 100) return 100;
    if (cleanupPct > 0) return 95 + (cleanupPct * 0.05);
    if (llmPct > 0 && llmEnabled) return 75 + (llmPct * 0.2);
    if (transcribePct > 0) return 20 + (transcribePct * 0.75);
    if (uploadPct > 0) return uploadPct * 0.2;
    return 0;
  });

  let statusLabelText = $derived.by(() => {
    if (status === 'ready') return 'Ready';
    if (status === 'uploading') return stageLabels.upload || 'Uploading and converting audio...';
    if (status === 'transcribing') return stageLabels.transcribe || 'Transcribing via ElevenLabs Scribe...';
    if (status === 'llm') return stageLabels.llm || 'LLM post-processing...';
    if (status === 'cleanup') return stageLabels.cleanup || 'Cleaning up files...';
    if (status === 'complete') return 'Transcription Completed';
    return 'Processing...';
  });
</script>

<div data-section="transcription-progress" class="progress-panel">
  <div class="progress-header">
    <div class="status-icon" class:icon-active={status !== 'complete' && status !== 'ready'} class:icon-done={status === 'complete'}>
      {#if status === 'complete'}
        <CircleCheck size={20} />
      {:else}
        <LoaderCircle size={20} />
      {/if}
    </div>
    <span class="progress-title">ElevenLabs Transcription</span>
    {#if elapsed}
      <span class="elapsed-badge">{elapsed}</span>
    {/if}
  </div>

  {#if infoText || statusLabelText}
    <div data-section="progress-info" class="info-banner">
      <span class="info-text">{infoText || statusLabelText}</span>
    </div>
  {/if}

  <div class="file-details">
    <FileAudio size={16} />
    <span class="file-name" title={fileName}>{fileName}</span>
    {#if fileSize > 0}
      <span class="file-size">({formattedSize})</span>
    {/if}
  </div>

  <div class="progress-track-container">
    <div class="progress-track">
      <div
        class="progress-fill"
        class:fill-done={status === 'complete'}
        class:fill-active={status !== 'complete' && status !== 'ready'}
        style="width: {overallPercent}%"
      ></div>
    </div>
    <div class="progress-labels">
      <span class="progress-status-text">{statusLabelText}</span>
      <span class="progress-percent-text">{overallPercent.toFixed(0)}%</span>
    </div>
  </div>
</div>

<style>
  .progress-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .progress-header {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--cyan);
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: color 0.3s;
  }
  .icon-active {
    color: var(--cyan);
    animation: spin 2s linear infinite;
  }
  .icon-done {
    color: var(--success);
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  .progress-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    flex: 1;
  }

  .elapsed-badge {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: var(--success);
    padding: 2px 10px;
    border: 1px solid var(--success);
    border-radius: var(--radius);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .file-details {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.01);
    padding: 8px 12px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .file-name {
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 450px;
  }

  .file-size {
    color: var(--text-muted);
  }

  .progress-track-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
    width: 100%;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .progress-fill.fill-active {
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan-glow);
  }
  .progress-fill.fill-done {
    background: var(--success);
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    text-transform: uppercase;
  }
  .progress-status-text {
    color: var(--cyan);
  }
  .progress-percent-text {
    color: var(--text-dim);
  }

  .info-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: rgba(0, 212, 255, 0.06);
    border: 1px solid var(--cyan-dim);
    border-radius: var(--radius);
  }
  .info-text {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--cyan);
  }
</style>
