<script>
  let { status, fileName = '', fileSize = 0, elapsed = '', percent = 0 } = $props();

  let formattedSize = $derived(fileSize > 1024 * 1024
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : `${(fileSize / 1024).toFixed(1)} KB`
  );

  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  let progressOffset = $derived(circumference - (percent / 100) * circumference);

  let isActive = $derived(status === 'uploading' || status === 'transcribing');
  let isComplete = $derived(status === 'complete');

  let strokeColor = $derived(isComplete ? 'var(--success)' : 'var(--cyan)');
</script>

<div data-section="transcription-progress" class="progress-panel">
  <div class="progress-grid">
    <div class="circle-col">
      <svg viewBox="0 0 100 100" class="progress-ring">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" stroke-width="6" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={strokeColor} stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={progressOffset}
          transform="rotate(-90 50 50)"
          class:progress-arc={isActive}
        />
        {#if isActive}
          <circle cx="50" cy="12" r="4" fill={strokeColor} class="orbit-dot" />
        {:else if isComplete}
          <circle cx="50" cy="12" r="4" fill={strokeColor} />
        {/if}
      </svg>
      <div class="percent-label" class:pct-complete={isComplete}>{percent.toFixed(0)}%</div>
    </div>
    <div class="info-col">
      <div class="file-name" title={fileName}>{fileName}</div>
      {#if fileSize > 0}
        <div class="file-size">{formattedSize}</div>
      {/if}
    </div>
    <div class="timer-col">
      {#if elapsed}
        <span class="timer-label">{elapsed}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .progress-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
  }

  .progress-grid {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
  }

  .circle-col {
    position: relative;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-ring {
    width: 90px;
    height: 90px;
  }

  .progress-arc {
    transition: stroke-dashoffset 0.4s ease;
  }

  .orbit-dot {
    transform-origin: 50px 50px;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }

  .percent-label {
    position: absolute;
    font-family: var(--font-heading-1);
    font-size: var(--fs-section);
    font-weight: 700;
    color: var(--cyan);
    pointer-events: none;
  }

  .pct-complete {
    color: var(--success);
  }

  .info-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .file-name {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-family: var(--font-body);
    font-size: var(--fs-small);
    color: var(--text-dim);
  }

  .timer-col {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .timer-label {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    white-space: nowrap;
  }
</style>
