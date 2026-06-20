<script>
  import DynamicIcon from './DynamicIcon.svelte';
  import { ChevronDown } from '@lucide/svelte';

  let { value = 'Building2', onchange } = $props();

  let open = $state(false);
  let container = $state(null);

  const iconOptions = [
    'Building2', 'Store', 'Globe', 'UserCircle', 'Factory',
    'Landmark', 'ShoppingBag', 'HeartHandshake', 'GraduationCap', 'Gamepad2',
    'User', 'Briefcase', 'Building',
    'FileText', 'Table', 'Monitor', 'Folder', 'ClipboardCheck',
    'Video', 'Calendar', 'Mail', 'MessageSquare', 'StickyNote',
    'NotebookText', 'LayoutDashboard', 'Code', 'Hash', 'Kanban', 'Palette',
    'Tag', 'Wallet', 'CreditCard', 'DollarSign', 'Ban', 'Trophy',
    'Car', 'Receipt', 'UtensilsCrossed', 'Fuel', 'ShoppingCart', 'Scissors',
    'PawPrint', 'Home', 'HeartPulse', 'Banknote', 'ArrowLeftRight',
    'HelpCircle', 'Shirt', 'Heart'
  ];

  function toggle() {
    open = !open;
  }

  function select(name) {
    onchange(name);
    open = false;
  }

  $effect(() => {
    if (!open) return;
    function handleClick(e) {
      if (container && !container.contains(e.target)) {
        open = false;
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  });
</script>

<div data-section="icon-picker" bind:this={container} class="icon-picker">
  <button type="button" class="preview-btn" onclick={toggle} title="Choose icon">
    <DynamicIcon name={value} size={20} />
    <ChevronDown size={14} />
  </button>
  {#if open}
    <div class="dropdown" data-label="icon-dropdown">
      {#each iconOptions as iconName}
        <button
          type="button"
          class="icon-option"
          class:selected={value === iconName}
          onclick={() => select(iconName)}
          title={iconName}
        >
          <DynamicIcon name={iconName} size={18} />
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .icon-picker {
    position: relative;
    display: flex;
  }

  .preview-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .preview-btn:hover {
    border-color: var(--cyan-dim);
    color: var(--cyan);
  }

  .dropdown {
    position: absolute;
    top: 48px;
    left: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    z-index: 50;
    width: 270px;
  }

  .icon-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s;
  }

  .icon-option:hover {
    border-color: var(--cyan-dim);
    color: var(--cyan);
  }

  .icon-option.selected {
    border-color: var(--cyan);
    color: var(--cyan);
    background: rgba(0, 200, 255, 0.15);
  }
</style>
