<script>
  let { children } = $props();
</script>
<div data-section="settings-page" class="settings-page">
  {@render children()}
</div>
<style>
  .settings-page { flex: 1; display: flex; flex-direction: column; min-height: 0; }
</style>
