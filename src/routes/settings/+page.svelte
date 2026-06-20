<script>
  import { Wallet, FileAudio, ArrowRight, BrainCircuit, Palette } from '@lucide/svelte';
</script>

<div data-section="settings-home" class="settings-home">
  <h1 class="settings-title">Settings</h1>
  <div class="modules-grid">
    <a href="/settings/treasury" class="module-card">
      <div class="card-icon"><Wallet size={32} /></div>
      <h2 class="card-title">Treasury Settings</h2>
      <p class="card-desc">Manage your financial data. Delete all transactions and reset your transaction history.</p>
      <span class="card-link">Open <ArrowRight size={16} /></span>
    </a>
    <a href="/settings/engine" class="module-card">
      <div class="card-icon"><FileAudio size={32} /></div>
      <h2 class="card-title">Transcription Engine</h2>
      <p class="card-desc">Upload audio files for local AI-powered transcription via whisper.cpp with GPU acceleration.</p>
      <span class="card-link">Open <ArrowRight size={16} /></span>
    </a>
    <a href="/settings/edi" class="module-card">
      <div class="card-icon"><BrainCircuit size={32} /></div>
      <h2 class="card-title">EDI AI Settings</h2>
      <p class="card-desc">Configure Google Gemini and DeepSeek API keys, select models, manage token budgets, and monitor usage.</p>
      <span class="card-link">Open <ArrowRight size={16} /></span>
    </a>
    <a href="/settings/system-design" class="module-card">
      <div class="card-icon"><Palette size={32} /></div>
      <h2 class="card-title">System Design</h2>
      <p class="card-desc">Choose fonts, adjust base sizes, and preview changes. Includes ITC Conduit, Orbitron, Rajdhani, and more.</p>
      <span class="card-link">Open <ArrowRight size={16} /></span>
    </a>

  </div>
</div>

<style>
  .settings-home { flex: 1; padding: 24px; overflow-y: auto; }
  .settings-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0 0 24px 0; }
  .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .module-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 32px 20px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; transition: all 0.2s; }
  .module-card:hover { border-color: var(--accent-cyan); box-shadow: 0 0 16px var(--cyan-glow); }
  .card-icon { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: rgba(0,212,255,0.1); border: 1px solid var(--accent-cyan); border-radius: var(--radius); color: var(--accent-cyan); }
  .card-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--text); margin: 0; }
  .card-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; line-height: 1.5; }
  .card-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px; }
</style>
