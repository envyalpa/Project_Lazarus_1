<script>
  import { page } from '$app/stores';
  import { GraduationCap, BookOpen, FileText } from '@lucide/svelte';

  const items = [
    { id: 'areas', label: 'Areas', icon: GraduationCap },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'notes', label: 'Notes', icon: FileText }
  ];

  let pathSegments = $derived($page.url.pathname.split('/').filter(Boolean));

  let active = $derived.by(() => {
    const segs = pathSegments;
    if (segs.length === 1) return 'areas';
    if (segs[1] === 'courses') return 'courses';
    if (segs[1] === 'notes') return 'notes';
    if (segs.length >= 4 && segs[2] === 'course') return 'notes';
    if (segs.length >= 2) return 'courses';
    return 'areas';
  });

  const tabHref = { areas: '/academy', courses: '/academy/courses', notes: '/academy/notes' };
</script>

<div data-section="academy-nav">
  <div class="nav-inner">
    {#each items as item}
      <a
        href={tabHref[item.id]}
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
  div[data-section="academy-nav"] {
    background: var(--bg-nav);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    max-width: 960px;
    margin: 0 auto;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    max-width: 25%;
    padding: 14px 16px;
    font-family: var(--font-body);
    font-size: var(--fs-caption);
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
