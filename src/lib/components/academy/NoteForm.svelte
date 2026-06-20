<script>
  import { Check } from '@lucide/svelte';

  let { note = null, onsave, oncancel } = $props();
</script>

<form onsubmit={onsave} data-section="note-form">
  <div class="note-row">
    <span class="note-label">New Note</span>
    <input type="text" name="title" class="note-input" value={note?.title || ''} required placeholder="Note title" autofocus />
    <button type="submit" class="note-submit" title="Save">
      <Check size={18} />
    </button>
  </div>
</form>

<style>
  form[data-section="note-form"] { padding: 0; }
  .note-row { display: flex; align-items: center; gap: 10px; }
  .note-label {
    font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600;
    color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; white-space: nowrap;
  }
  .note-input {
    flex: 1; padding: 10px 14px; background: var(--bg-surface);
    border: 1px solid var(--modal-border); border-radius: 6px;
    color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body);
    box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2);
    transition: all 0.2s ease-in-out;
  }
  .note-input:focus { outline: none; border-color: var(--accent-cyan); box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.15); }
  .note-submit {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; background: var(--accent-cyan);
    border: none; border-radius: var(--radius); cursor: pointer;
    color: #000; transition: all 0.2s; flex-shrink: 0;
  }
  .note-submit:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); }
</style>
