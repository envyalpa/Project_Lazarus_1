<script>
  import { MessageSquare, Loader2, Send } from '@lucide/svelte';
  import Panel from '$lib/components/Panel.svelte';

  let { messages = [], compiling = false, mode = $bindable('edit'), onSubmitRefine } = $props();

  let promptText = $state('');
  let chatHistoryEl = $state();

  function handleRefine() {
    if (!promptText.trim() || compiling) return;
    onSubmitRefine(promptText);
    promptText = '';
  }

  // Auto-scroll chat history
  $effect(() => {
    if (messages.length && chatHistoryEl) {
      setTimeout(() => {
        chatHistoryEl.scrollTo({ top: chatHistoryEl.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  });
</script>

<Panel title="EDI Copilot" icon={MessageSquare} stretch={true} class="chat-panel">
  {#snippet headerRight()}
    <div class="mode-toggle-group">
      <button 
        type="button" 
        class="mode-btn" 
        class:active={mode === 'plan'} 
        onclick={() => mode = 'plan'} 
        title="Plan Mode"
      >
        Plan
      </button>
      <button 
        type="button" 
        class="mode-btn" 
        class:active={mode === 'edit'} 
        onclick={() => mode = 'edit'} 
        title="Edit Mode"
      >
        Edit
      </button>
    </div>
  {/snippet}

  <div class="chat-wrapper">
    <div bind:this={chatHistoryEl} class="chat-history-pane">
      {#if messages.length === 0}
        <div class="empty-chat">
          <MessageSquare size={36} class="glow-icon" />
          <p>No conversation history yet. Start instructing EDI to refine the draft.</p>
        </div>
      {:else}
        {#each messages as msg}
          <div class="message-row" class:user-msg={msg.role === 'user'}>
            <div class="message-bubble">
              <div class="bubble-sender">
                {msg.role === 'user' ? 'Commander' : 'EDI'}
              </div>
              <div class="bubble-text">
                {msg.content}
              </div>
            </div>
          </div>
        {/each}
      {/if}
      
      {#if compiling}
        <div class="message-row">
          <div class="message-bubble system-bubble">
            <Loader2 size={16} class="spinner" /> 
            <span>EDI is processing directives...</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="chat-input-pane">
      <div class="input-wrapper">
        <input 
          type="text" 
          bind:value={promptText} 
          placeholder={mode === 'plan' ? 'Ask EDI to outline sections or plan content...' : 'Prompt EDI to edit or rewrite parts...'} 
          onkeydown={(e) => e.key === 'Enter' && handleRefine()}
          disabled={compiling} 
        />
        <button 
          type="button" 
          class="send-btn" 
          onclick={handleRefine} 
          disabled={compiling || !promptText.trim()}
        >
          {#if compiling}
            <Loader2 size={16} class="spinner" />
          {:else}
            <Send size={16} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</Panel>

<style>
  :global(.chat-panel) { flex: 1; min-width: 0; height: 100%; }
  :global(.chat-panel .panel-content) { padding: 0 !important; display: flex; flex-direction: column; }
  .chat-wrapper { display: flex; flex-direction: column; height: 100%; min-height: 0; box-sizing: border-box; padding: 0; }
  .chat-history-pane { flex: 1; overflow-y: auto; background: transparent; border: none; border-radius: 0; padding: 16px; margin-bottom: 0; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; }
  .empty-chat { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-dim); gap: 12px; }
  .glow-icon { color: var(--cyan); opacity: 0.6; filter: drop-shadow(0 0 4px var(--cyan-glow)); }
  .message-row { display: flex; width: 100%; }
  .message-row.user-msg { justify-content: flex-end; }
  .message-bubble { max-width: 85%; background: rgba(0, 136, 255, 0.06); border: 1px solid rgba(0, 136, 255, 0.3); border-radius: var(--radius); padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; }
  .user-msg .message-bubble { background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.3); }
  .bubble-sender { font-family: var(--font-heading-1); font-size: var(--fs-caption); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--cyan); }
  .user-msg .bubble-sender { color: var(--cyan); }
  .bubble-text { font-family: var(--font-body); font-size: var(--fs-caption); color: var(--text); line-height: 1.4; white-space: pre-wrap; }
  .system-bubble { display: flex; flex-direction: row; align-items: center; gap: 10px; border-style: dashed; border-color: var(--cyan); color: var(--text-dim); background: transparent; font-family: var(--font-body); font-size: var(--fs-caption); }
  .chat-input-pane { box-sizing: border-box; border-top: 1px solid var(--border); padding: 12px 16px; background: var(--bg-surface); }
  .input-wrapper { position: relative; display: flex; align-items: center; }
  .input-wrapper input { width: 100%; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 48px 12px 16px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); outline: none; box-sizing: border-box; }
  .input-wrapper input:focus { border-color: var(--cyan); box-shadow: 0 0 8px var(--cyan-glow); }
  .send-btn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--cyan); padding: 4px 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .send-btn:hover:not(:disabled) { color: #fff; }
  .send-btn:disabled { color: var(--text-muted); cursor: not-allowed; }
  .spinner { color: var(--cyan); animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .mode-toggle-group {
    display: flex;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2px;
    gap: 2px;
  }
  .mode-btn {
    background: transparent;
    border: none;
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    padding: 4px 10px;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s;
  }
  .mode-btn.active {
    background: var(--bg-elevated);
    color: var(--cyan);
  }
</style>
