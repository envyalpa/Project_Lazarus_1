import { notify } from './notification.js';
import { browser } from '$app/environment';

class TranscriptionStore {
  // Global Svelte 5 reactive states
  queue = $state([]);
  activeItem = $state(null);
  viewedItem = $state(null);
  history = $state([]);
  allLogs = $state([]);
  
  // Settings connectivity and configs
  hfConnected = $state(false);
  colabConnected = $state(false);
  nvidiaConnected = $state(false);
  geminiConnected = $state(false);
  elevenlabsConnected = $state(false);
  config = $state({});

  // Active transcription properties
  elapsed = $state('00:00');
  startTime = $state(null);
  timerId = null;
  abortController = null;

  constructor() {
    if (browser) {
      this.loadHistoryAndConfig();
      setInterval(() => this.loadHistoryAndConfig(), 10000);
    }
  }

  async loadHistoryAndConfig() {
    try {
      const res = await fetch('/settings/engine');
      if (!res.ok) return;
      const data = await res.json();
      this.hfConnected = data.hfConnected || false;
      this.colabConnected = data.colabConnected || false;
      this.nvidiaConnected = data.nvidiaConnected || false;
      this.geminiConnected = data.geminiConnected || false;
      this.elevenlabsConnected = data.elevenlabsConnected || false;
      this.config = data.config || {};
      this.history = data.history || [];
    } catch (err) {
      console.error('[transcriptionStore] Failed to sync status:', err);
    }
  }

  addLog(level, msg) {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    this.allLogs = [...this.allLogs, { time, level, msg }];
  }

  resetLogs() {
    this.allLogs = [];
  }

  startTimer() {
    this.stopTimer();
    this.startTime = Date.now();
    this.elapsed = '00:00';
    this.timerId = setInterval(() => {
      if (!this.activeItem || this.activeItem.status !== 'transcribing') {
        this.stopTimer();
        return;
      }
      const diff = Date.now() - this.startTime;
      const secs = Math.floor(diff / 1000);
      this.elapsed = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async addToQueue(file, mode = 'huggingface') {
    const id = Math.random().toString(36).substring(2, 15);
    const newItem = {
      id,
      filename: file.name,
      fileSize: file.size,
      file,
      mode,
      status: 'pending',
      totalChunks: 0,
      currentChunkIndex: 0,
      progress: 0,
      duration: 0,
      transcription: '',
      segments: [],
      error: ''
    };
    this.queue = [...this.queue, newItem];
    this.addLog('QUEUE', `Added file to queue: "${file.name}"`);

    // If nothing is actively transcribing, start processing this item
    if (!this.activeItem) {
      this.processNext();
    }
  }

  async processNext() {
    // Find first pending item
    const nextItem = this.queue.find(item => item.status === 'pending');
    if (!nextItem) {
      this.activeItem = null;
      return;
    }

    this.activeItem = nextItem;
    this.viewedItem = null; // Auto-focus on active transcription
    this.resetLogs();
    this.activeItem.status = 'uploading';
    this.activeItem.progress = 10;
    this.addLog('UPLOAD', `Uploading "${this.activeItem.filename}"...`);

    const formData = new FormData();
    formData.append('audio', this.activeItem.file);
    formData.append('mode', this.activeItem.mode);
    this.abortController = new AbortController();

    try {
      const res = await fetch('/settings/engine', {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errJson.error || 'Upload failed');
      }

      const initData = await res.json();
      this.activeItem.sessionId = initData.sessionId;
      this.activeItem.totalChunks = initData.totalChunks;
      this.activeItem.duration = initData.duration || 0;
      this.activeItem.currentChunkIndex = 0;
      this.activeItem.progress = 20;
      this.addLog('PROCESS', `Audio uploaded. Total chunks: ${initData.totalChunks}`);
      
      this.startTimer();
      await this.runTranscriptionLoop();
    } catch (err) {
      this.handleItemError(err);
    }
  }

  async runTranscriptionLoop() {
    if (!this.activeItem) return;
    this.activeItem.status = 'transcribing';

    try {
      const total = this.activeItem.totalChunks;
      for (let i = this.activeItem.currentChunkIndex; i < total; i++) {
        if (this.activeItem.status !== 'transcribing') break;
        
        this.activeItem.currentChunkIndex = i;
        this.activeItem.progress = Math.round(20 + (i / total) * 80);
        this.addLog('PROCESS', `Processing chunk ${i + 1}/${total}...`);

        this.abortController = new AbortController();
        const res = await fetch('/settings/engine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transcribe-chunk',
            sessionId: this.activeItem.sessionId,
            chunkIndex: i
          }),
          signal: this.abortController.signal
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errJson.error || `Failed to transcribe chunk ${i + 1}`);
        }

        const data = await res.json();
        const chunk = data.chunk;
        if (chunk.text) {
          const header = `-------------- Chunk ${i + 1}/${total} -------------------\n`;
          this.activeItem.transcription += (this.activeItem.transcription ? '\n\n' : '') + header + chunk.text;
        }
        if (chunk.segments) {
          this.activeItem.segments = [...this.activeItem.segments, ...chunk.segments];
        }
        this.addLog('INFO', `Chunk ${i + 1}/${total} processed successfully.`);
      }

      // Check if finished successfully without pause/cancel
      if (this.activeItem.status === 'transcribing') {
        this.activeItem.status = 'complete';
        this.activeItem.progress = 100;
        this.addLog('DONE', `Transcription complete for: "${this.activeItem.filename}"`);
        this.stopTimer();

        // 1. Save to SQLite database
        await this.saveActiveItem('completed');

        // 2. Cleanup server session files
        await fetch('/settings/engine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cleanup-session',
            sessionId: this.activeItem.sessionId
          })
        }).catch(() => {});

        // 3. Notify and load next item
        notify(`Transcription complete: "${this.activeItem.filename}"`);
        this.loadHistoryAndConfig();
        this.processNext();
      }
    } catch (err) {
      this.handleItemError(err);
    }
  }

  async handleItemError(err) {
    this.stopTimer();
    if (this.activeItem) {
      this.activeItem.status = 'failed';
      this.activeItem.error = err.message || 'Unknown transcription error';
      this.addLog('ERROR', `Error processing "${this.activeItem.filename}": ${this.activeItem.error}`);
      notify(`Transcription failed: "${this.activeItem.filename}"`);
      await this.saveActiveItem('failed');
      await this.loadHistoryAndConfig();
    }
    this.processNext();
  }

  pauseTranscription() {
    if (!this.activeItem || this.activeItem.status !== 'transcribing') return;
    this.activeItem.status = 'paused';
    this.addLog('INFO', `Transcription paused by user.`);
    this.abortController?.abort();
    this.stopTimer();
  }

  async resumeTranscription() {
    if (!this.activeItem || this.activeItem.status !== 'paused') return;
    this.activeItem.status = 'transcribing';
    this.addLog('INFO', `Resuming transcription loop...`);
    this.startTimer();
    await this.runTranscriptionLoop();
  }

  async stopTranscription() {
    if (!this.activeItem) return;
    this.abortController?.abort();
    this.stopTimer();
    this.addLog('INFO', `Transcription cancelled by user.`);

    await this.saveActiveItem('cancelled');
    await this.loadHistoryAndConfig();

    if (this.activeItem.sessionId) {
      await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup-session',
          sessionId: this.activeItem.sessionId
        })
      }).catch(() => {});
    }

    this.activeItem.status = 'cancelled';
    this.processNext();
  }

  async saveActiveItem(status) {
    if (!this.activeItem) return;
    try {
      await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-transcription',
          id: this.activeItem.id,
          filename: this.activeItem.filename,
          fileSize: this.activeItem.fileSize,
          duration: this.activeItem.duration || 0,
          transcribeMode: this.activeItem.mode,
          transcription: this.activeItem.transcription,
          segments: this.activeItem.segments,
          status
        })
      });
    } catch (err) {
      console.error(`[transcriptionStore] Failed to save active item (${status}):`, err);
    }
  }

  async deleteHistoryItem(id) {
    try {
      const res = await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-transcription', id })
      });
      if (res.ok) {
        if (this.viewedItem && this.viewedItem.id === id) {
          this.viewedItem = null;
        }
        await this.loadHistoryAndConfig();
        this.addLog('INFO', `Deleted item from history.`);
      }
    } catch (err) {
      console.error('[transcriptionStore] Delete failed:', err);
    }
  }

  async viewHistoryItem(id) {
    try {
      const res = await fetch('/settings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-transcription-detail', id })
      });
      if (res.ok) {
        const data = await res.json();
        const t = data.transcription;
        this.viewedItem = {
          id: t.id,
          filename: t.filename,
          transcription: t.transcription,
          segments: JSON.parse(t.segments_json || '[]')
        };
      }
    } catch (err) {
      console.error('[transcriptionStore] Load history item failed:', err);
    }
  }
}

export const transcriptionStore = new TranscriptionStore();
