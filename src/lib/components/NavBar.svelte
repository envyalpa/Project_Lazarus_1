<script>
  import { page } from '$app/stores';
  import { GraduationCap, Gamepad2, LayoutDashboard, Wallet, Briefcase } from '@lucide/svelte';

  const items = [
    { id: 'academy', label: 'Academy', route: '/academy', icon: GraduationCap },
    { id: 'lounge', label: 'Lounge', route: '/lounge', icon: Gamepad2 },
    { id: 'bridge', label: 'Bridge', route: '/', icon: LayoutDashboard },
    { id: 'treasury', label: 'Treasury', route: '/treasury', icon: Wallet },
    { id: 'operations', label: 'Operations', route: '/operations', icon: Briefcase }
  ];

  let activeRoute = $derived($page.url.pathname);

  function isActive(item) {
    if (item.route === '/') return activeRoute === '/';
    return activeRoute.startsWith(item.route);
  }
</script>

<nav data-section="navbar">
  <div class="nav-inner">
    {#each items as item}
      <a
        href={item.route}
        data-nav={item.id}
        data-sveltekit-preload-code
        class="nav-item"
        class:active={isActive(item)}
        class:is-bridge={item.id === 'bridge'}
      >
        <span data-label="nav-icon" class="nav-icon">
          <item.icon size={20} />
        </span>
        <span data-label="nav-label" class="nav-label">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  nav[data-section="navbar"] {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    z-index: 100;
    height: 72px;
  }

  .nav-inner {
    display: flex;
    align-items: stretch;
    gap: 14px;
    flex: 1;
    max-width: 640px;
    height: 100%;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex: 1;
    padding: 6px 4px;
    text-decoration: none;
    color: var(--text-dim);
    transition: all 0.2s;
    position: relative;
  }

  .nav-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--cyan);
    opacity: 0;
    transition: opacity 0.2s, box-shadow 0.2s;
  }

  .nav-item:hover {
    color: var(--cyan);
    background: linear-gradient(to top, rgba(0, 212, 255, 0.03), transparent);
  }

  .nav-item:hover::before {
    opacity: 0.4;
    box-shadow: 0 0 8px var(--cyan-glow);
  }

  .nav-item.active {
    color: var(--cyan);
    background: linear-gradient(to top, rgba(0, 212, 255, 0.08), transparent);
  }

  .nav-item.active::before {
    opacity: 1;
    box-shadow: 0 0 12px var(--cyan);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 10px;
    transition: filter 0.2s, transform 0.2s;
  }

  .nav-item:hover .nav-icon,
  .nav-item.active .nav-icon {
    filter: drop-shadow(0 0 4px var(--cyan-glow));
    transform: translateY(-1px);
  }

  .nav-label {
    font-family: var(--font-nav, var(--font-heading-1));
    font-size: var(--fs-nav);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    transition: text-shadow 0.2s;
    margin-top: 2px;
  }

  .nav-item:hover .nav-label,
  .nav-item.active .nav-label {
    text-shadow: 0 0 8px var(--cyan-glow);
  }
</style>
