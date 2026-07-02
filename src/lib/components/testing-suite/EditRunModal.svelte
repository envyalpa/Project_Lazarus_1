<script>
  import { X } from '@lucide/svelte';
  import { invalidateAll } from '$app/navigation';
  
  let { run, clients = [], onclose, onsave } = $props();

  let runNameInput = $state(run.run_name);
  let platformNameInput = $state(run.platform_name);
  let clientIdInput = $state(run.client_id || '');
  let projectIdInput = $state(run.project_id || '');
  let urlInput = $state(run.url || '');
  let usernameInput = $state(run.username || '');
  let passwordInput = $state(run.password || '');
  let updateError = $state('');
  let updating = $state(false);

  let projects = $derived(clientIdInput ? (clients.find(c => c.id === Number(clientIdInput))?.projects || []) : []);

  async function handleEditSave(e) {
    e.preventDefault();
    updating = true;
    updateError = '';
    try {
      const res = await fetch(`/settings/testing-suite/${run.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_name: runNameInput,
          platform_name: platformNameInput,
          client_id: clientIdInput ? Number(clientIdInput) : null,
          project_id: projectIdInput ? Number(projectIdInput) : null,
          url: urlInput,
          username: usernameInput,
          password: passwordInput
        })
      });
      if (res.ok) {
        onsave();
      } else {
        const err = await res.json();
        updateError = err.error || 'Failed to update evaluation details.';
      }
    } catch (e) {
      updateError = 'Error saving changes.';
    } finally {
      updating = false;
    }
  }
</script>

<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="modal" class="modal compact" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <h3 data-label="modal-title" class="modal-header-title">Edit Evaluation Info</h3>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
    </div>
    <form onsubmit={handleEditSave} class="modal-body">
      {#if updateError}
        <div class="error-banner">{updateError}</div>
      {/if}
      <div class="form-group">
        <label for="edit-name">Evaluation Name</label>
        <input type="text" id="edit-name" bind:value={runNameInput} required />
      </div>
      <div class="form-group">
        <label for="edit-platform">Platform Name</label>
        <input type="text" id="edit-platform" bind:value={platformNameInput} required />
      </div>
      <div class="form-group">
        <label for="edit-client">Client</label>
        <select id="edit-client" bind:value={clientIdInput}>
          <option value="">-- General / Internal --</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>
      {#if clientIdInput && projects.length > 0}
        <div class="form-group">
          <label for="edit-project">Project</label>
          <select id="edit-project" bind:value={projectIdInput}>
            <option value="">-- No Project --</option>
            {#each projects as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div class="form-group">
        <label for="edit-url">Target Login URL</label>
        <input type="url" id="edit-url" bind:value={urlInput} placeholder="e.g., https://bizverse.in/login" />
      </div>
      <div class="form-group">
        <label for="edit-username">Username / Email</label>
        <input type="text" id="edit-username" bind:value={usernameInput} placeholder="test_user" />
      </div>
      <div class="form-group">
        <label for="edit-password">Password</label>
        <input type="password" id="edit-password" bind:value={passwordInput} placeholder="••••••••" />
      </div>
      <div class="form-footer">
        <button type="button" class="btn ghost-btn" onclick={onclose} disabled={updating}>Cancel</button>
        <button type="submit" class="btn save-btn" disabled={updating}>Save Changes</button>
      </div>
    </form>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal.compact { max-width: 480px; }
  
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .modal-header-title { font-family: var(--font-heading); font-size: var(--fs-heading); font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-family: var(--font-heading); font-size: var(--fs-small); color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; }
  .form-group input, .form-group select { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; padding: 10px 12px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--text); outline: none; }
  
  .form-footer { display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--modal-border); padding-top: 18px; margin-top: 8px; }
  .ghost-btn { background: none; border-color: var(--border); color: var(--text-dim); }
  .ghost-btn:hover { background: rgba(255,255,255,0.03); border-color: var(--text-dim); color: var(--text); }
  .save-btn { background: var(--accent-cyan); color: #000; }
  .save-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; }
  .error-banner { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); padding: 10px 16px; font-family: var(--font-body); font-size: var(--fs-body); }
</style>
