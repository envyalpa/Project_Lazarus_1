<script>
  import { FileAudio, Copy, RefreshCw, CircleCheck, Upload, AudioLines, FileText, Terminal, Square, Settings, RotateCcw, Pause, Play, Trash2 } from '@lucide/svelte';
  import TranscriptionProgress from '$lib/components/settings/TranscriptionProgress.svelte';
  import EngineSettingsModal from '$lib/components/settings/EngineSettingsModal.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import PromptsManagerModal from '$lib/components/settings/PromptsManagerModal.svelte';
  import { browser } from '$app/environment';
  import { transcriptionStore } from '$lib/stores/transcription.svelte.js';
  import { notify } from '$lib/stores/notification.js';

  let { data } = $props();

  let copied = $state(false);
  let dragging = $state(false);
  let activeTab = $state('transcription');
  let logContainer = $state(null);
  let showSettings = $state(false);
  let showPromptsManager = $state(false);
  
  let localConfig = $state({});
  $effect(() => {
    if (showSettings || showPromptsManager) {
      localConfig = { ...transcriptionStore.config };
    }
  });

  $effect(() => {
    if (browser) {
      transcriptionStore.loadHistoryAndConfig();
    }
  });

  // Dereferences from store
  let activeItem = $derived(transcriptionStore.activeItem);
  let config = $derived(transcriptionStore.config);
  let elevenlabsConnected = $derived(
    transcriptionStore.elevenlabsConnected || 
    (activeItem && activeItem.mode === 'elevenlabs' && (status === 'transcribing' || status === 'uploading'))
  );

  let status = $derived(activeItem?.status || 'ready');
  let fileName = $derived(activeItem?.filename || '');
  let fileSize = $derived(activeItem?.fileSize || 0);
  let elapsed = $derived(transcriptionStore.elapsed);
  
  let stagePercent = $derived({
    upload: status === 'uploading' ? 50 : (status === 'transcribing' || status === 'complete' ? 100 : 0),
    transcribe: activeItem?.progress || 0,
    llm: 0,
    cleanup: 0
  });

  let stageLabels = $derived({
    upload: status === 'uploading' ? 'Uploading file...' : (status === 'ready' ? '' : 'Upload complete'),
    transcribe: status === 'transcribing' ? `Processing chunk ${activeItem?.currentChunkIndex + 1} of ${activeItem?.totalChunks}` : (status === 'complete' ? 'Transcription complete' : ''),
    llm: '',
    cleanup: ''
  });

  let infoText = $derived(activeItem ? `Processing chunk ${activeItem.currentChunkIndex + 1} of ${activeItem.totalChunks}` : '');
  let error = $derived(activeItem?.error || '');
  let transcription = $derived(transcriptionStore.viewedItem ? transcriptionStore.viewedItem.transcription : (activeItem?.transcription || ''));
  let segments = $derived(transcriptionStore.viewedItem ? transcriptionStore.viewedItem.segments : (activeItem?.segments || []));
  let allLogs = $derived(transcriptionStore.allLogs);

  let statusConfig = $derived.by(() => {
    if (status === 'paused') return { icon: Pause, label: 'Transcription Paused', color: 'var(--amber)' };
    const map = {
      ready: { icon: CircleCheck, label: 'Ready', color: 'var(--success)' },
      uploading: { icon: Upload, label: 'File Uploading', color: 'var(--cyan)' },
      transcribing: { icon: AudioLines, label: 'Transcription in Progress', color: 'var(--amber)' },
      complete: { icon: CircleCheck, label: 'Transcription Complete', color: 'var(--success)' }
    };
    return map[status] || map.ready;
  });

  async function saveConfig() {
    try {
      const res = await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-config', config: localConfig })
      });
      const j = await res.json();
      if (j.success) {
        transcriptionStore.addLog('INFO', 'Configuration saved.');
        notify('Configuration saved.');
        await transcriptionStore.loadHistoryAndConfig();
      }
    } catch (err) {
      transcriptionStore.addLog('ERROR', `Save failed: ${err.message}`);
      notify(`Save failed: ${err.message}`);
    }
  }

  function resetLogs() { transcriptionStore.resetLogs(); }
  function requestFile(file) { if (!file) return; transcriptionStore.addToQueue(file, 'elevenlabs'); }

  function pauseTranscription() { transcriptionStore.pauseTranscription(); }
  function resumeTranscription() { transcriptionStore.resumeTranscription(); }
  function stopTranscription() { transcriptionStore.stopTranscription(); }

  function handleDrop(e) {
    e.preventDefault();
    dragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        transcriptionStore.addToQueue(files[i], 'elevenlabs');
      }
    }
  }

  // Handle file select via browsing
  function handleChange(e) {
    const files = e.target?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        transcriptionStore.addToQueue(files[i], 'elevenlabs');
      }
    }
  }

  function formatTime(secs) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  async function copyText() {
    const text = segments.length > 0 ? segments.map(s => `[${formatTime(s.start)}] ${s.text}`).join('\n') : transcription;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => copied = false, 2000); } catch {}
  }

  async function copyHistoryItemText(id) {
    try {
      const res = await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-transcription-detail', id })
      });
      if (res.ok) {
        const data = await res.json();
        const t = data.transcription;
        const segments = JSON.parse(t.segments_json || '[]');
        const text = segments.length > 0 ? segments.map(s => `[${formatTime(s.start)}] ${s.text}`).join('\n') : t.transcription;
        await navigator.clipboard.writeText(text);
        notify(`Transcription for "${t.filename}" copied to clipboard.`);
      } else {
        notify('Failed to copy transcription.');
      }
    } catch (err) {
      console.error('[copyHistoryItemText] failed:', err);
      notify('Failed to copy transcription.');
    }
  }

  $effect(() => { if (logContainer) logContainer.scrollTop = logContainer.scrollHeight; });
</script>

<div data-section="settings-engine" class="engine-page">
  <div class="toolbar-upload-group">
    <div data-section="engine-toolbar" class="engine-toolbar">
      <h1 class="toolbar-title">Transcription Engine</h1>
      <div class="toolbar-right">
        <!-- ElevenLabs API Status -->
        <div class="status-indicator-box" style="color: {elevenlabsConnected ? '#a855f7' : 'var(--text-dim)'}; border-color: {elevenlabsConnected ? '#a855f7' : 'var(--border)'}; background: {elevenlabsConnected ? 'rgba(168,85,247,0.06)' : 'transparent'};">
          <AudioLines size={14} />
          <span class="status-label">ElevenLabs: {elevenlabsConnected ? 'Connected' : config.elevenlabsApiKey ? 'Disconnected' : 'Not configured'}</span>
        </div>

        <button data-label="settings-gear" class="gear-btn" onclick={() => showSettings = true} title="Engine Settings">
          <Settings size={18} />
        </button>
      </div>
    </div>
    <div data-section="file-upload" class="upload-section">
      {#if status === 'uploading' || status === 'transcribing' || status === 'complete'}
        <TranscriptionProgress {status} {fileName} {fileSize} {stagePercent} {stageLabels} {elapsed} {infoText} llmEnabled={false} />
      {:else}
        <div class="dropzone" class:dragging={dragging} role="button" tabindex="0"
          ondragover={(e) => { e.preventDefault(); dragging = true; }}
          ondragleave={() => dragging = false}
          ondrop={handleDrop}
          onclick={() => { document.getElementById('audio-input')?.click(); }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('audio-input')?.click(); }}>
          <input id="audio-input" type="file" accept=".mp3,.wav,.ogg,.m4a,.webm" class="file-input" onchange={handleChange} />
          <div class="upload-icon"><FileAudio size={48} /></div>
          <p class="upload-text">Drop an audio file here or click to browse</p>
          <p class="upload-hint">Supports MP3, WAV, OGG, M4A, WebM &mdash; no size limit</p>
        </div>
      {/if}
    </div>
  </div>

  <div data-section="engine-tabs" class="tabs-container">
    <div class="tab-bar">
      <button class="tab" class:active={activeTab === 'transcription'} onclick={() => { transcriptionStore.viewedItem = null; activeTab = 'transcription'; }}><FileText size={16} /> Live Transcription</button>
      <button class="tab" class:active={activeTab === 'history'} onclick={() => activeTab = 'history'}><RotateCcw size={16} /> History</button>
      <button class="tab" class:active={activeTab === 'console'} onclick={() => activeTab = 'console'}><Terminal size={16} /> App Logs</button>
      
      {#if activeItem && activeItem.status === 'transcribing'}
        <button class="tab tab-stop" style="color: var(--amber)" onclick={pauseTranscription}><Pause size={16} /> Pause</button>
      {/if}
      {#if activeItem && activeItem.status === 'paused'}
        <button class="tab" style="color: var(--success)" onclick={resumeTranscription}><Play size={16} /> Resume</button>
      {/if}
      {#if activeItem && (activeItem.status === 'uploading' || activeItem.status === 'transcribing' || activeItem.status === 'paused')}
        <button class="tab tab-stop" onclick={stopTranscription}><Square size={16} /> Cancel</button>
      {/if}
      {#if allLogs.length > 0}
        <button class="tab tab-reset" onclick={resetLogs} title="Clear App Logs"><RotateCcw size={16} /> Reset</button>
      {/if}
    </div>

    {#if activeTab === 'transcription'}
      <div data-section="transcription-output" class="output-section">
        {#if error}
          <div class="error-box"><p class="error-text">Error: {error}</p></div>
        {:else if transcription}
          <div class="output-header">
            <h2 class="output-title">
              {#if transcriptionStore.viewedItem}
                ðŸ“‚ Viewed: {transcriptionStore.viewedItem.filename}
              {:else}
                ðŸŽ™ï¸ Transcription ({status})
              {/if}
            </h2>
            <button class="btn-icon" onclick={copyText} title={copied ? 'Copied' : 'Copy'}><Copy size={16} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div class="transcript-text" class:streaming={status === 'transcribing' && !transcriptionStore.viewedItem}>
            {#if segments && segments.length > 0}
              {#each segments as seg, i}
                <div class="segment-line" data-index={i}>
                  <span class="timestamp">[{formatTime(seg.start || 0)}]</span>
                  <span>{seg.text}</span>
                </div>
              {/each}
            {:else}
              {transcription}
            {/if}
          </div>
          {#if status === 'complete' && !transcriptionStore.viewedItem}
            <div class="output-actions">
              <button class="btn-ghost-small" onclick={() => document.getElementById('audio-input')?.click()}><RefreshCw size={16} /> Transcribe Another</button>
            </div>
          {/if}
        {:else}
          <div class="empty-box"><p class="empty-text">Upload an audio file or select an item from History to view transcription.</p></div>
        {/if}
      </div>
    {:else if activeTab === 'history'}
      <div class="history-section" data-section="transcription-history">
        {#if transcriptionStore.history.length === 0}
          <div class="empty-box"><p class="empty-text">No transcriptions in history yet.</p></div>
        {:else}
          <div class="history-list">
            {#each transcriptionStore.history as item}
              <div class="history-item" onclick={() => { transcriptionStore.viewHistoryItem(item.id); activeTab = 'transcription'; }}>
                <div class="history-item-details">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="history-filename">{item.filename}</span>
                    <span class="history-status-badge {item.status || 'completed'}">{item.status || 'completed'}</span>
                  </div>
                  <span class="history-meta">{(item.file_size / 1024).toFixed(1)} KB | Mode: {item.transcribe_mode} | {new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div class="history-item-actions">
                  <button class="history-action-btn" onclick={(e) => { e.stopPropagation(); copyHistoryItemText(item.id); }} title="Copy Transcription Text">
                    <Copy size={14} />
                  </button>
                  <button class="history-action-btn delete-btn" onclick={(e) => { e.stopPropagation(); transcriptionStore.deleteHistoryItem(item.id); }} title="Delete History Entry">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === 'console'}
      <div class="console-section">
        {#if allLogs.length === 0}
          <div class="empty-box"><p class="empty-text">No log entries yet.</p></div>
        {:else}
          <div class="console-logs" bind:this={logContainer}>
            {#each allLogs as log}
              <div class="log-entry">
                <span class="log-time">[{log.time}]</span>
                <span class="log-level" style="color: var(--text-dim);">[{log.level}]</span>
                <span class="log-msg">{log.msg}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if transcriptionStore.queue.length > 0}
    <div class="queue-panel" data-section="transcription-queue">
      <div class="queue-header">
        <AudioLines size={16} />
        <span>Transcription Queue ({transcriptionStore.queue.filter(i => i.status !== 'complete' && i.status !== 'failed' && i.status !== 'cancelled').length} Active/Pending)</span>
      </div>
      <div class="queue-list">
        {#each transcriptionStore.queue as item}
          <div class="queue-item status-{item.status}">
            <span class="queue-filename">{item.filename}</span>
            <div class="queue-meta">
              <span class="queue-status-badge">{item.status}</span>
              {#if item.status === 'transcribing' || item.status === 'uploading'}
                <span class="queue-progress">{item.progress}%</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<Modal wider title="Transcription Engine Settings" open={showSettings} onclose={() => showSettings = false}>
  <EngineSettingsModal
    config={localConfig}
    onconfigchange={(newConfig) => localConfig = newConfig}
    onsave={saveConfig}
    onopenprompts={() => { showSettings = false; showPromptsManager = true; }}
  />
</Modal>

<Modal fill title="Central System Prompts Manager" open={showPromptsManager} onclose={() => { showPromptsManager = false; showSettings = true; }}>
  <PromptsManagerModal
    config={localConfig}
    onchange={(newConfig) => localConfig = newConfig}
    onsave={async (savedConfig) => {
      localConfig = savedConfig;
      await saveConfig();
      showPromptsManager = false;
      showSettings = true;
    }}
  />
</Modal>

<style>
  .engine-page { flex: 1; padding: 5px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }

  .toolbar-upload-group { display: flex; flex-direction: column; gap: 0; }
  .engine-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius) var(--radius) 0 0; border-bottom: none; }
  .toolbar-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; letter-spacing: 1px; }
  .toolbar-right { display: flex; align-items: center; gap: 10px; }
  .status-indicator-box { display: flex; align-items: center; gap: 8px; padding: 4px 10px; border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .status-label { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
  .gear-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .gear-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); background: var(--bg-card); }
  .status-model { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text-dim); padding: 2px 8px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); }

  .upload-section { width: 100%; }
  .dropzone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 36px 20px; border: 2px dashed var(--border); border-radius: 0 0 var(--radius) var(--radius); background: var(--bg-card); cursor: pointer; transition: all 0.2s; }
  .dropzone:hover:not([style*="not-allowed"]), .dropzone.dragging { border-color: var(--cyan); background: rgba(0,212,255,0.04); box-shadow: 0 0 20px var(--cyan-glow); }
  .file-input { display: none; }
  .upload-icon { color: var(--cyan-dim); pointer-events: none; }
  .dropzone:hover:not([style*="not-allowed"]) .upload-icon { color: var(--cyan); }
  .upload-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); margin: 0; pointer-events: none; }
  .upload-hint { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; pointer-events: none; }



  .tabs-container { width: 100%; display: flex; flex-direction: column; gap: 0; flex: 1; min-height: 200px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 16px 12px; }
  .tab-bar { display: flex; gap: 0; border-bottom: 2px solid var(--border); flex-wrap: wrap; }
  .tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--text-dim); background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .tab:hover { color: var(--cyan); background: var(--bg-card); }
  .tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
  .tab-stop { margin-left: auto; color: var(--danger); border-bottom-color: transparent !important; }
  .tab-stop:hover { color: white !important; background: var(--danger) !important; }
  .tab-reset { margin-left: auto; color: var(--amber); border-bottom-color: transparent !important; }
  .tab-reset:hover { color: white !important; background: var(--amber) !important; }

  .output-section { padding: 14px 0 0 0; flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .error-box { padding: 16px; background: rgba(239,68,68,0.08); border: 1px solid var(--danger); border-radius: var(--radius); }
  .error-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--danger); margin: 0; }
  .output-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .output-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 1.5px; margin: 0; display: flex; align-items: center; gap: 10px; }
  .segment-line { padding: 2px 0; line-height: 1.6; }
  .segment-line:hover { background: rgba(0,212,255,0.03); border-radius: 2px; }
  .timestamp { font-family: var(--font-mono); font-size: var(--fs-body); color: var(--text-muted); margin-right: 8px; user-select: none; }
  .btn-icon { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 5px 12px; background: transparent; color: var(--cyan); border: 1px solid var(--cyan-dim); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .btn-icon:hover { background: rgba(0,212,255,0.1); }
  .transcript-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); line-height: 1.7; padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); white-space: pre-wrap; word-wrap: break-word; min-height: 100px; flex: 1; overflow-y: auto; }
  .transcript-text.streaming { border-color: var(--amber); box-shadow: 0 0 12px rgba(255,140,0,0.12); }
  .output-actions { margin-top: 12px; display: flex; gap: 10px; }
  .btn-ghost-small { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 6px 14px; background: transparent; color: var(--text-dim); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .btn-ghost-small:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .empty-box { padding: 36px 24px; text-align: center; }
  .empty-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; }

  .console-section { padding: 14px 0 0 0; flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .console-logs { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; font-family: var(--font-mono); font-size: var(--fs-body); line-height: 1.6; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
  .log-entry { display: flex; gap: 8px; align-items: baseline; padding: 2px 0; }
  .log-time { color: var(--text-muted); flex-shrink: 0; }
  .log-level { flex-shrink: 0; font-weight: 700; min-width: 56px; }
  .log-msg { color: var(--text-dim); }

  /* New Queue styling */
  .queue-panel { margin-top: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
  .queue-header { display: flex; align-items: center; gap: 8px; font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .queue-list { display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; }
  .queue-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-body); }
  .queue-filename { font-size: var(--fs-body); color: var(--text); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 70%; }
  .queue-meta { display: flex; align-items: center; gap: 10px; }
  .queue-status-badge { font-size: var(--fs-caption); text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: var(--radius); border: 1px solid; }
  .queue-progress { font-size: var(--fs-caption); font-weight: 700; color: var(--cyan); }

  .status-pending .queue-status-badge { color: var(--text-dim); border-color: var(--border); }
  .status-uploading .queue-status-badge { color: var(--cyan); border-color: var(--cyan-dim); background: rgba(0,212,255,0.06); }
  .status-transcribing .queue-status-badge { color: var(--amber); border-color: var(--amber); background: rgba(255,140,0,0.06); }
  .status-complete .queue-status-badge { color: var(--success); border-color: var(--success); background: rgba(34,197,94,0.06); }
  .status-failed .queue-status-badge { color: var(--danger); border-color: var(--danger); background: rgba(239,68,68,0.06); }

  /* New History styling */
  .history-section { padding: 14px 0 0 0; flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .history-list { display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; }
  .history-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; }
  .history-item:hover { border-color: var(--cyan); background: rgba(0,212,255,0.02); }
  .history-item-details { display: flex; flex-direction: column; gap: 4px; font-family: var(--font-body); }
  .history-filename { font-size: var(--fs-body); font-weight: 600; color: var(--text); }
  .history-meta { font-size: var(--fs-caption); color: var(--text-dim); }
  .history-status-badge { font-size: var(--fs-caption); text-transform: uppercase; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid; display: inline-flex; align-items: center; }
  .history-status-badge.completed { color: var(--success); border-color: var(--success); background: rgba(34,197,94,0.06); }
  .history-status-badge.failed { color: var(--danger); border-color: var(--danger); background: rgba(239,68,68,0.06); }
  .history-status-badge.cancelled { color: var(--text-dim); border-color: var(--border); background: rgba(255,255,255,0.03); }
  .history-item-actions { display: flex; gap: 8px; align-items: center; }
  .history-action-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .history-action-btn:hover { color: var(--cyan); border-color: var(--cyan-dim); background: rgba(0,212,255,0.06); }
  .history-action-btn.delete-btn:hover { color: var(--danger); border-color: var(--danger); background: rgba(239,68,68,0.06); }
</style>
