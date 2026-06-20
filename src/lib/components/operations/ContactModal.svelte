<script>
  let { contact = null, onSave, onCancel } = $props();

  let name = $state(contact?.name || '');
  let designation = $state(contact?.designation || '');
  let email = $state(contact?.email || '');
  let phone = $state(contact?.phone || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), designation: designation.trim(), email: email.trim(), phone: phone.trim() });
  }
</script>

<form data-section="contact-modal" class="modal-form" onsubmit={handleSubmit}>
  <div class="form-fields">
    <div class="field">
      <span class="field-label">Name</span>
      <input type="text" class="input" placeholder="Full name" bind:value={name} required />
    </div>
    <div class="field">
      <span class="field-label">Designation</span>
      <input type="text" class="input" placeholder="Job title / role" bind:value={designation} />
    </div>
    <div class="field">
      <span class="field-label">Email Address</span>
      <input type="email" class="input" placeholder="email@example.com" bind:value={email} />
    </div>
    <div class="field">
      <span class="field-label">Phone Number</span>
      <input type="tel" class="input" placeholder="+1 (555) 000-0000" bind:value={phone} />
    </div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-cancel" onclick={onCancel}>Cancel</button>
    <button type="submit" class="btn btn-save" disabled={!name.trim()}>Save</button>
  </div>
</form>

<style>
  .modal-form { display: flex; flex-direction: column; gap: 20px; }
  .form-fields { display: flex; flex-direction: column; gap: 14px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .input { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); padding: 10px 14px; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .input:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .btn { font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; padding: 10px 24px; border-radius: var(--radius); border: 1px solid var(--modal-border); cursor: pointer; transition: all 0.2s ease-in-out; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-cancel { background: transparent; color: var(--text-dim); }
  .btn-cancel:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  .btn-save { background: var(--accent-cyan); color: #fff; border-color: var(--accent-cyan); }
  .btn-save:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); border-color: transparent; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
