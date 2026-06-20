<script>
  import { page } from '$app/stores';
  import { LayoutDashboard, ArrowLeftRight, Landmark, Users, Tags, BarChart3 } from '@lucide/svelte';

  const items = [
    { id: 'situation-report', label: 'SitRep', route: '/treasury/situation-report', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', route: '/treasury/transactions', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Accounts', route: '/treasury/accounts', icon: Landmark },
    { id: 'people', label: 'People', route: '/treasury/people', icon: Users },
    { id: 'categories', label: 'Categories', route: '/treasury/categories', icon: Tags },
    { id: 'reports', label: 'Reports', route: '/treasury/reports', icon: BarChart3 },
  ];

  let active = $derived($page.url.pathname.split('/')[2] || 'situation-report');
</script>

<div data-section="treasury-nav">
  <div class="nav-inner">
    {#each items as item}
      <a
        href={item.route}
        data-nav={item.id}
        data-sveltekit-preload-code
        class="nav-btn"
        class:active={active === item.id}
      >
        <span class="nav-icon"><item.icon size={18} /></span>
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  div[data-section="treasury-nav"] {
    background: var(--bg-nav);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    margin-bottom: 0;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    padding: 14px 12px;
    font-family: var(--font-body);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--text-dim);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    color: var(--cyan);
    background: var(--bg-elevated);
  }

  .nav-btn.active {
    color: var(--cyan);
    border-bottom-color: var(--cyan);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
</style>
