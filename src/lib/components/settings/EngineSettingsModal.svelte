<script>
  import { AudioLines, Sparkles } from '@lucide/svelte';

  let {
    config,
    onconfigchange,
    onsave,
    onopenprompts
  } = $props();

  function update(key, value) {
    onconfigchange?.({ ...config, [key]: value });
  }
</script>

<div data-section="engine-settings-modal" class="modal-body-inner">
  <div class="settings-grid">
    <div class="settings-col">
      <div class="settings-section">
        <div class="section-header">
          <AudioLines size={16} />
          <span>ElevenLabs API Configuration</span>
        </div>
        <div class="section-body">
          <div class="field-compact-row">
            <input
              type="checkbox"
              id="elevenlabs-enabled-chk"
              checked={config.elevenlabsEnabled !== false}
              onchange={(e) => update('elevenlabsEnabled', e.target.checked)}
            />
            <label for="elevenlabs-enabled-chk">Enable ElevenLabs API Connector</label>
          </div>
          <div class="field-compact">
            <label>ElevenLabs API Key</label>
            <input
              type="password"
              placeholder="Enter your xi-api-key"
              value={config.elevenlabsApiKey || ''}
              oninput={(e) => update('elevenlabsApiKey', e.target.value)}
            />
          </div>

          <div class="field-compact">
            <label>Scribe Model ID</label>
            <select
              value={config.elevenlabsModel || 'scribe_v2'}
              onchange={(e) => update('elevenlabsModel', e.target.value)}
            >
              <option value="scribe_v2">Scribe V2 (Recommended - High accuracy & diarization)</option>
              <option value="scribe_v1">Scribe V1 (Legacy)</option>
            </select>
          </div>

          <div class="field-compact">
            <label>Language Code (Optional)</label>
            <input
              type="text"
              placeholder="e.g. ml, en (leave empty for auto-detect)"
              value={config.elevenlabsLanguageCode || ''}
              oninput={(e) => update('elevenlabsLanguageCode', e.target.value)}
            />
            <span class="field-hint-inline">Provide an ISO language code hint to guide the transcription model.</span>
          </div>

          <div class="action-bar">
            <button class="btn-sm btn-primary" onclick={onsave}>
              Save Configuration
            </button>
            <button class="btn-sm btn-secondary" onclick={onopenprompts}>
              <Sparkles size={14} /> Manage System Prompts
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-body-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: var(--fs-body);
  }

  .settings-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;
  }
  .settings-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .settings-section {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .section-body {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field-compact {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .field-compact-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
    margin-bottom: 4px;
  }
  .field-compact-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--cyan);
    cursor: pointer;
    margin: 0;
  }
  .field-compact-row label {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    margin: 0;
    letter-spacing: 0.5px;
  }
  .field-compact label {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .field-compact input,
  .field-compact select {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text);
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }
  .field-compact input:focus,
  .field-compact select:focus {
    border-color: var(--cyan);
    outline: none;
    box-shadow: 0 0 8px var(--cyan-glow);
  }
  .field-hint-inline {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    color: var(--text-muted);
    margin-top: 2px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
  }
  .btn-sm {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 600;
    text-transform: uppercase;
    padding: 8px 16px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid;
    flex: 1;
    justify-content: center;
  }
  .btn-primary {
    background: var(--cyan);
    color: var(--bg-surface);
    border-color: var(--cyan);
  }
  .btn-primary:hover {
    box-shadow: 0 0 10px var(--cyan-glow);
  }
  .btn-secondary {
    background: transparent;
    color: var(--cyan);
    border-color: var(--cyan);
  }
  .btn-secondary:hover {
    background: rgba(0, 212, 255, 0.08);
    box-shadow: 0 0 10px var(--cyan-glow);
  }
</style>
