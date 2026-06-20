<script>
  let { title = '', class: className = '', icon: Icon = null, children, stretch = false, headerLeft = null, headerRight = null } = $props();
</script>

<div data-component="panel" class="panel {className}" class:stretch>
  {#if title}
    <div data-label="panel-header" class="panel-header">
      {#if headerLeft}
        <div class="panel-header-left">{@render headerLeft()}</div>
      {/if}
      {#if Icon}
        <Icon size={18} />
      {/if}
      <h2 data-label="panel-title" class="panel-title">{title}</h2>
      {#if headerRight}
        <div class="panel-header-right">{@render headerRight()}</div>
      {/if}
    </div>
  {/if}
  <div data-label="panel-content" class="panel-content" class:stretch>
    {@render children()}
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .panel:hover {
    border-color: var(--border-glow);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--panel-header-bg, #0b1a30);
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .panel-title {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--cyan);
    margin: 0;
  }

  .panel-header-left,
  .panel-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .panel-header-left { margin-right: auto; }
  .panel-header-right { margin-left: auto; }

  .panel.stretch {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-content.stretch {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .panel-content {
    padding: 12px;
    background: var(--panel-content-bg, var(--bg-panel));
    border-radius: 0 0 var(--radius) var(--radius);
  }
</style>
