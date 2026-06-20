<script>
  import DocumentForgeEditor from './DocumentForgeEditor.svelte';

  let { taskId, notes = $bindable() } = $props();
</script>

<div data-section="task-notes-editor" class="notes-editor">
  <DocumentForgeEditor bind:contentMarkdown={notes} class="notes-inline-editor" />
</div>

<style>
  .notes-editor { display: flex; flex-direction: column; gap: 12px; width: 100%; flex: 1; border: 1px solid var(--border); border-radius: 6px; }
  :global(.notes-inline-editor) { flex: 1; min-height: 250px; }
  :global(.notes-inline-editor .blocks-list) { padding: 10px; max-width: none; }
  :global(.notes-inline-editor .btn-add-block) { margin-top: 8px; }
</style>
