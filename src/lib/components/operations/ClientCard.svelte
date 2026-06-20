<script>
  import DynamicIcon from './DynamicIcon.svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { client } = $props();

  let projectCount = $derived(client.projectCount ?? 0);
  let taskCount = $derived(client.tasksCount ?? 0);
</script>

<a data-section="client-card" class="card" href={"/operations/clients/" + client.id}>
  <div data-label="client-logo" class="card-logo">
    {#if client.logo}
      <img src={client.logo} alt={client.name + ' logo'} class="logo-img" />
    {:else}
      <DynamicIcon name={client.icon} size={32} color={colorValues[client.color]} />
    {/if}
  </div>
  <div class="card-body">
    <div class="card-name-row" style="--client-color: {colorValues[client.color]}">
      <DynamicIcon name={client.icon} size={20} color={colorValues[client.color]} />
      <span class="card-name">{client.name}</span>
    </div>
    {#if client.description}
      <div class="card-desc">{client.description}</div>
    {/if}
  </div>
  <div class="card-metrics">
    {#if projectCount > 0}
      <span class="metric-badge metric-projects">{projectCount} Project{projectCount !== 1 ? 's' : ''}</span>
    {/if}
    <span class="metric-badge metric-tasks">{taskCount} Task{taskCount !== 1 ? 's' : ''}</span>
  </div>
</a>

<style>
  a[data-section="client-card"] {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-surface);
    border: 1px solid var(--modal-border);
    border-radius: var(--radius);
    text-decoration: none;
    transition: all 0.2s;
    height: 100%;
  }

  a[data-section="client-card"]:hover {
    border-color: var(--accent-cyan);
    box-shadow: 0 0 12px rgba(0, 200, 255, 0.25);
  }

  .card-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80px;
    overflow: hidden;
  }

  .logo-img {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .card-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--client-color);
  }

  .card-name {
    font-family: var(--font-heading-1);
    font-size: var(--fs-heading-2);
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
  }

  .card-desc {
    font-family: var(--font-body);
    font-size: var(--fs-body);
    color: var(--text-dim);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-metrics {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: 12px;
  }

  .metric-badge {
    font-family: var(--font-body);
    font-size: var(--fs-caption);
    font-weight: 600;
    padding: 4px 10px;
    border-radius: var(--radius);
  }

  .metric-projects {
    background: rgba(0, 212, 255, 0.15);
    color: var(--cyan);
  }

  .metric-tasks {
    background: rgba(255, 140, 0, 0.15);
    color: var(--amber);
  }
</style>
