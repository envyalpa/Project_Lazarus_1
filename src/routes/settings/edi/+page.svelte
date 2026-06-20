<script>
  import { onMount } from 'svelte';
  import { ShieldAlert, RefreshCw, Cpu, CheckCircle, Database, Coins, KeyRound, TriangleAlert, History } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';
  import Modal from '$lib/components/operations/Modal.svelte';
  import PromptsManagerModal from '$lib/components/settings/PromptsManagerModal.svelte';
  import AiDebugPanel from '$lib/components/lounge/AiDebugPanel.svelte';

  let config = $state({
    googleApiKey: '',
    deepseekApiKey: '',
    opencodeApiKey: '',
    opencodeBaseUrl: 'https://opencode.ai/zen/go/v1',
    opencodeModel: 'deepseek-v4-flash',
    agentVariant: '',
    monthlyTokenBudget: 5.00,
    agentTemperature: 0.7
  });

  let monthlySpending = $state(0);
  let usageStats = $state([]);
  let pricing = $state({});
  let saveSuccessMessage = $state('');
  let isSaving = $state(false);
  let isUpdatingPricing = $state(false);
  let showPromptsManager = $state(false);
  let showDebugLogs = $state(false);
  let savedConfig = $state({});
  let hasUnsavedChanges = $derived(JSON.stringify(config) !== JSON.stringify(savedConfig));

  let currentModelLabel = $derived.by(() => {
    const opts = modelOptions[config.agentProvider || 'gemini'] || [];
    const found = opts.find(o => o.value === config.agentModel);
    return found ? found.label : config.agentModel || 'Not set';
  });

  const modelOptions = {
    google: [
      { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Latest - High reasoning capability)' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ultra-fast, low VRAM)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (High intelligence)' }
    ],
    gemini: [
      { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Latest - High reasoning capability)' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ultra-fast, low VRAM)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (High intelligence)' }
    ],
    deepseek: [
      { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (New - MoE, highly efficient)' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (New - Flagship reasoning)' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat V3 (Legacy Chat - Deprecating July 2026)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner R1 (Legacy Reasoner - Deprecating July 2026)' }
    ],
    huggingface: [
      { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B Instruct' },
      { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct' }
    ],
    nvidia: [
      { value: 'google/diffusiongemma-26b-a4b-it', label: 'DiffusionGemma 26B (Reasoning Enabled)' },
      { value: 'nvidia/nemotron-3-ultra-550b-a55b', label: 'Nemotron-3 Ultra 550B' },
      { value: 'deepseek-ai/deepseek-v4-pro', label: 'DeepSeek V4 Pro (NVIDIA NIM)' },
      { value: 'deepseek-ai/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
      { value: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
      { value: 'mistralai/mistral-nemotron', label: 'Mistral Nemotron' }
    ],
    ollama: [
      { value: 'llama3', label: 'Llama 3' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'phi3', label: 'Phi 3' }
    ],
    opencode: [
      { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (Fast, low cost)' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (High intelligence)' },
      { value: 'glm-5.2', label: 'GLM-5.2 (Frontier performance)' },
      { value: 'glm-5.1', label: 'GLM-5.1 (High performance)' },
      { value: 'kimi-k2.7-code', label: 'Kimi K2.7 Code (Specialized coding)' },
      { value: 'kimi-k2.6', label: 'Kimi K2.6 (General purpose)' },
      { value: 'mimo-v2.5', label: 'MiMo V2.5 (Lightweight)' },
      { value: 'mimo-v2.5-pro', label: 'MiMo V2.5 Pro (Enhanced)' },
      { value: 'minimax-m3', label: 'MiniMax M3 (Latest)' },
      { value: 'minimax-m2.7', label: 'MiniMax M2.7 (Balanced)' },
      { value: 'qwen3.7-max', label: 'Qwen3.7 Max (Top-tier reasoning)' },
      { value: 'qwen3.7-plus', label: 'Qwen3.7 Plus (Fast, affordable)' },
      { value: 'qwen3.6-plus', label: 'Qwen3.6 Plus (Legacy, stable)' }
    ],
    openrouter: [
      { value: 'openrouter/free', label: 'Auto: Best free model for your request' },
      { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B (Free — frontier reasoning)' },
      { value: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (Free)' },
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
      { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder (Free — strongest coding)' },
      { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free — reasoning)' },
      { value: 'deepseek/deepseek-v3:free', label: 'DeepSeek V3 (Free — general)' },
      { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 405B (Free)' },
      { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (Free)' },
      { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
      { value: 'mistralai/mistral-small-24b-instruct:free', label: 'Mistral Small 24B (Free)' },
      { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (Free)' },
      { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Free — fast/light)' }
    ],
    groq: [
      { value: 'kimi-k2-instruct', label: 'Kimi K2 262K (Free — frontier reasoning)' },

      { value: 'qwen/qwen3-32b', label: 'Qwen3 32B (Free)' },
      { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Free)' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (Free — 750 TPS)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Free — fastest, 840 TPS)' },
      { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (Free)' },
      { value: 'groq/compound', label: 'Groq Compound (Free — agentic)' },
      { value: 'groq/compound-mini', label: 'Groq Compound Mini (Free)' }
    ]
  };

  async function loadSettings() {
    try {
      const res = await fetch('/settings/edi');
      if (res.ok) {
        const data = await res.json();
        config = data.config;
        savedConfig = { ...data.config };
        monthlySpending = data.monthlySpending || 0;
        usageStats = data.usageStats || [];
        pricing = data.pricing || {};
      }
    } catch {}
  }

  async function saveSettings() {
    isSaving = true;
    try {
      const res = await fetch('/settings/edi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', config })
      });
      const data = await res.json();
      if (data.success) {
        savedConfig = { ...config };
        saveSuccessMessage = 'EDI AI Configuration Saved!';
        setTimeout(() => { saveSuccessMessage = ''; }, 3000);
      }
    } catch {}
    isSaving = false;
  }

  async function updatePricing() {
    isUpdatingPricing = true;
    try {
      const res = await fetch('/settings/edi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-pricing' })
      });
      const data = await res.json();
      if (data.success) {
        pricing = data.pricing;
        saveSuccessMessage = data.message || 'Pricing updated.';
        setTimeout(() => { saveSuccessMessage = ''; }, 3000);
      }
    } catch {}
    isUpdatingPricing = false;
  }

  onMount(() => {
    loadSettings();
  });

  let budgetPercent = $derived(Math.min(100, Math.round((monthlySpending / config.monthlyTokenBudget) * 100)));
  let budgetColor = $derived(budgetPercent >= 90 ? 'var(--danger)' : budgetPercent >= 75 ? 'var(--amber)' : 'var(--cyan)');
</script>

<div data-section="settings-edi" class="edi-settings-page">
  <div class="title-row">
    <h1 class="settings-title">EDI AI Settings</h1>
    <div class="title-actions">
      <button class="btn btn-ghost" onclick={() => showDebugLogs = true}>
        <History size={14} /> AI Logs
      </button>
      {#if hasUnsavedChanges}
        <span class="unsaved-badge"><TriangleAlert size={16} /> Unsaved changes</span>
      {/if}
      <button class="btn btn-primary" onclick={saveSettings} disabled={isSaving}>
        {#if isSaving}
          <RefreshCw size={14} class="animate-spin" /> Saving...
        {:else}
          Save
        {/if}
      </button>
      {#if saveSuccessMessage}
        <span class="save-feedback"><CheckCircle size={14} /> {saveSuccessMessage}</span>
      {/if}
    </div>
  </div>

  <!-- Warning Banner -->
  <div class="warning-banner" data-section="security-warning">
    <ShieldAlert size={20} class="warn-icon" />
    <div class="warn-content">
      <h3 class="warn-title">API Key Security Warning</h3>
      <p class="warn-text">API Keys are saved in <code>data/engine-config.json</code> locally. Ensure the <code>data/</code> folder is added to your <code>.gitignore</code> file to prevent keys from leaking to public Git repositories.</p>
    </div>
  </div>

  <div class="settings-grid">
    <div class="left-col">
      <Panel title="Agent Options" icon={Cpu} class="equal-height-panel">
        {#snippet headerRight()}
          <span class="current-model-badge">{currentModelLabel}</span>
        {/snippet}
        <div class="panel-body equal-height-body" data-section="agent-options">
          <div class="field-row">
            <div class="field-compact">
              <label for="agent-provider">Agent Provider</label>
              <select id="agent-provider" bind:value={config.agentProvider} onchange={() => {
                config.agentModel = modelOptions[config.agentProvider || 'gemini']?.[0]?.value || '';
              }}>
                <option value="gemini">Google Gemini API</option>
                <option value="deepseek">DeepSeek AI</option>
                <option value="huggingface">Hugging Face Cloud</option>
                <option value="nvidia">Nvidia NIM Cloud</option>
                <option value="openrouter">OpenRouter (Free Models)</option>
                <option value="groq">Groq (Free Tier)</option>
                <option value="opencode">OpenCode Go (Subscription)</option>
                <option value="ollama">Ollama (Local Host)</option>
              </select>
            </div>

            <div class="field-compact">
              <label for="agent-model">Agent Model</label>
              <select id="agent-model" bind:value={config.agentModel}>
                {#each modelOptions[config.agentProvider || 'gemini'] || [] as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="field-row" style="margin-top: 14px;">
            <div class="field-compact">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label for="agent-temperature">Model Temperature</label>
                <span style="font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 700; color: var(--cyan);">
                  {Number(config.agentTemperature || 0).toFixed(1)} 
                  {Number(config.agentTemperature || 0) === 0 ? '(Strict Grounding)' : Number(config.agentTemperature || 0) >= 0.8 ? '(Creative)' : '(Balanced)'}
                </span>
              </div>
              <input id="agent-temperature" type="range" min="0" max="1" step="0.1" bind:value={config.agentTemperature} style="margin-top: 6px;" />
            </div>
          </div>

          <div class="field-row" style="margin-top: 14px;">
            <div class="field-compact">
              <label for="agent-variant">Reasoning Variant</label>
              <select id="agent-variant" bind:value={config.agentVariant}>
                <option value="">Default (no override)</option>
                <option value="low">Low — Minimal reasoning effort</option>
                <option value="medium">Medium — Balanced reasoning</option>
                <option value="high">High — Maximum reasoning effort</option>
              </select>
              <p class="field-hint" style="margin-top: 2px;">Applied as reasoning_effort for supported providers (OpenCode Go, OpenAI-compatible).</p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="API Credentials" icon={KeyRound} style="margin-top: 14px;">
        <div class="panel-body" data-section="credentials-form">
          <div class="field-compact">
            <label for="google-key">Google Gemini API Key</label>
            <input id="google-key" type="password" placeholder="AIzaSy..." bind:value={config.googleApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="google-books-key">Google Books API Key</label>
            <input id="google-books-key" type="password" placeholder="AIzaSy..." bind:value={config.googleBooksApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="deepseek-key">DeepSeek API Key</label>
            <input id="deepseek-key" type="password" placeholder="sk-..." bind:value={config.deepseekApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="hf-key">Hugging Face Access Token</label>
            <input id="hf-key" type="password" placeholder="hf_..." bind:value={config.hfApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="nvidia-key">Nvidia NIM API Key</label>
            <input id="nvidia-key" type="password" placeholder="nvapi-..." bind:value={config.nvidiaApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="openrouter-key">OpenRouter API Key</label>
            <input id="openrouter-key" type="password" placeholder="sk-or-..." bind:value={config.openrouterApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="groq-key">Groq API Key</label>
            <input id="groq-key" type="password" placeholder="gsk_..." bind:value={config.groqApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="opencode-key">OpenCode Go API Key</label>
            <input id="opencode-key" type="password" placeholder="oc_..." bind:value={config.opencodeApiKey} />
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="opencode-base">OpenCode Go API Base URL</label>
            <input id="opencode-base" type="text" placeholder="https://opencode.ai/zen/go/v1" bind:value={config.opencodeBaseUrl} />
          </div>

        </div>
      </Panel>
    </div>

    <div class="right-col">
      <Panel title="System Prompts" icon={Cpu} class="equal-height-panel">
        <div class="panel-body equal-height-body" data-section="prompts-form" style="align-items: center; gap: 10px;">
          <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 10px 18px;" onclick={() => showPromptsManager = true}>
            Manage System Prompts (Full Screen)
          </button>
          <p class="field-hint" style="margin-top: 4px; text-align: center;">Open the central prompts manager to edit ASR transcription, agent, and document forge system prompts.</p>
        </div>
      </Panel>

      <Panel title="Quota & Budget" icon={Database} style="margin-top: 14px;">
        <div class="panel-body" data-section="budget-panel">
          <div class="budget-compact">
            <div class="budget-labels">
              <span class="budget-label-text">Monthly Token Expenditure</span>
              <span class="budget-value" style="color: {budgetColor}">${monthlySpending.toFixed(4)} / ${config.monthlyTokenBudget.toFixed(2)}</span>
            </div>
            <div class="budget-progress-container">
              <div class="budget-progress-bar" style="width: {budgetPercent}%; background: {budgetColor};"></div>
            </div>
            <p class="budget-hint">Calculated in real-time based on local token counters.</p>
          </div>

          <div class="field-compact" style="margin-top: 14px;">
            <label for="budget-limit">Set Monthly Budget Limit (USD)</label>
            <input id="budget-limit" type="number" min="0.50" step="0.50" bind:value={config.monthlyTokenBudget} />
          </div>
        </div>
      </Panel>

      <Panel title="Model Rates & Pricing" icon={Coins} style="margin-top: 14px;">
        <div class="panel-body" data-section="pricing-panel">
          <div class="pricing-list">
            <div class="price-row header-row">
              <span>Model</span>
              <span>Input / 1M</span>
              <span>Output / 1M</span>
            </div>
            <div class="price-row">
              <span class="model-name">Gemini 3.5 Flash</span>
              <span>$1.50</span>
              <span>$9.00</span>
            </div>
            <div class="price-row">
              <span class="model-name">Gemini 2.5 Flash</span>
              <span>$0.075</span>
              <span>$0.30</span>
            </div>
            <div class="price-row">
              <span class="model-name">DeepSeek V4 Flash</span>
              <span>$0.14</span>
              <span>$0.28</span>
            </div>
            <div class="price-row">
              <span class="model-name">DeepSeek V4 Pro</span>
              <span>$0.435</span>
              <span>$0.87</span>
            </div>
            <div class="price-row">
              <span class="model-name">DeepSeek V4 Pro (NVIDIA)</span>
              <span>$0.435</span>
              <span>$0.87</span>
            </div>
            <div class="price-row">
              <span class="model-name">DiffusionGemma 26B (NVIDIA)</span>
              <span>$0.70</span>
              <span>$0.70</span>
            </div>
            <div class="price-row">
              <span class="model-name">Nemotron-3 Ultra 550B (NVIDIA)</span>
              <span>$0.00 (Free)</span>
              <span>$0.00 (Free)</span>
            </div>
          </div>
          <button class="btn btn-ghost" style="width: 100%; margin-top: 12px; justify-content: center;" onclick={updatePricing} disabled={isUpdatingPricing}>
            {#if isUpdatingPricing}
              <RefreshCw size={14} class="animate-spin" /> Updating...
            {:else}
              <RefreshCw size={14} /> Fetch Real-time Pricing
            {/if}
          </button>
        </div>
      </Panel>
    </div>
  </div>
</div>

{#if showDebugLogs}
  <div class="logs-overlay" onclick={() => showDebugLogs = false}>
    <div class="logs-panel" onclick={(e) => e.stopPropagation()}>
      <AiDebugPanel onclose={() => { showDebugLogs = false; }} />
    </div>
  </div>
{/if}

<Modal fill title="Central System Prompts Manager" open={showPromptsManager} onclose={() => showPromptsManager = false}>
  <PromptsManagerModal
    config={config}
    onchange={(newConfig) => config = newConfig}
    onsave={async (savedConfig) => {
      config = savedConfig;
      await saveSettings();
      showPromptsManager = false;
    }}
  />
</Modal>

<style>
  .edi-settings-page { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
  .settings-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0; }
  .title-row { display: flex; justify-content: space-between; align-items: center; }
  .title-actions { display: flex; align-items: center; gap: 10px; }
  .unsaved-badge { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--amber); padding: 4px 12px; border: 1px solid var(--amber); border-radius: var(--radius); background: rgba(255, 140, 0, 0.1); white-space: nowrap; }
  
  :global(.equal-height-panel) {
    display: flex;
    flex-direction: column;
    height: 220px;
  }
  :global(.equal-height-panel .panel-content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 !important;
  }
  .equal-height-body {
    height: 100%;
    box-sizing: border-box;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .current-model-badge { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--cyan-dim); border: 1px solid var(--cyan-dim); border-radius: var(--radius); padding: 2px 10px; white-space: nowrap; }
  .warning-banner { display: flex; gap: 14px; padding: 14px 18px; background: rgba(239, 68, 68, 0.08); border: 1px solid var(--danger); border-radius: var(--radius); align-items: flex-start; }
  .warn-icon { color: var(--danger); flex-shrink: 0; margin-top: 2px; }
  .warn-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--text); margin: 0 0 4px 0; }
  .warn-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; line-height: 1.5; }
  .warn-text code { font-family: var(--font-mono); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; color: var(--text); }

  .settings-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start; }
  .left-col, .right-col { display: flex; flex-direction: column; gap: 16px; }

  .panel-body { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
  
  .field-row { display: flex; gap: 12px; }
  .field-compact { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .field-compact label { font-family: var(--font-caption); font-size: var(--fs-caption); font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
  .field-compact input, .field-compact select { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); box-sizing: border-box; width: 100%; transition: all 0.2s; }
  .field-compact textarea { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-family: var(--font-mono); font-size: var(--fs-body); color: var(--text); box-sizing: border-box; width: 100%; transition: all 0.2s; resize: vertical; line-height: 1.4; }
  .field-compact input:focus, .field-compact select:focus, .field-compact textarea:focus { border-color: var(--cyan); outline: none; box-shadow: 0 0 8px var(--cyan-glow); }
  .field-hint { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); margin: 4px 0 0 0; }

  .btn { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 16px; border-radius: var(--radius); border: 1px solid; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: var(--cyan); color: var(--bg-surface); border-color: var(--cyan); }
  .btn-primary:hover { box-shadow: 0 0 10px var(--cyan-glow); }
  .btn-ghost { background: transparent; color: var(--text-dim); border-color: var(--border); }
  .btn-ghost:hover { color: var(--cyan); border-color: var(--cyan-dim); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .save-feedback { display: flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--success); font-weight: 600; }

  .budget-compact { display: flex; flex-direction: column; gap: 6px; }
  .budget-labels { display: flex; justify-content: space-between; align-items: center; }
  .budget-label-text { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .budget-value { font-family: var(--font-heading-1); font-size: var(--fs-body); font-weight: 700; }
  .budget-progress-container { width: 100%; height: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  .budget-progress-bar { height: 100%; transition: width 0.3s ease; }
  .budget-hint { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-muted); margin: 4px 0 0 0; }

  .pricing-list { display: flex; flex-direction: column; gap: 2px; }
  .price-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); }
  .price-row.header-row { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--cyan); text-transform: uppercase; border-bottom-width: 2px; }
  .price-row:last-child { border-bottom: none; }
  .model-name { color: var(--text); font-weight: 500; }

  .animate-spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .logs-overlay { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 500; }
  .logs-panel { width: 90vw; max-width: 900px; height: 80vh; background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--radius); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 40px rgba(0, 0, 0, 0.5); }
</style>
