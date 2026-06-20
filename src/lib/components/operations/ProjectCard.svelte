<script>
  import DynamicIcon from './DynamicIcon.svelte';
  import { colorValues } from '$lib/shared/colors.js';

  let { project } = $props();

  const statusLabels = {
    'not-started': 'Not Started',
    'on-hold': 'On Hold',
    'in-progress': 'In Progress',
    'completed': 'Completed'
  };

  const statusColors = {
    'not-started': 'var(--text-dim)',
    'on-hold': 'var(--amber)',
    'in-progress': 'var(--accent-cyan)',
    'completed': 'var(--success)'
  };
</script>

<a data-section="project-card" class="card" href={"/operations/projects/" + project.id}>
  <div data-label="project-logo" class="card-logo">
    <DynamicIcon name={project.icon || 'FolderKanban'} size={32} color={colorValues[project.color || '--cyan']} />
  </div>
  <div class="card-body">
    <div class="card-name-row" style="--project-color: {colorValues[project.color || '--cyan']}">
      <DynamicIcon name={project.icon || 'FolderKanban'} size={20} color={colorValues[project.color || '--cyan']} />
      <span class="card-name">{project.name}</span>
    </div>
    {#if project.description}
      <div class="card-desc">{project.description}</div>
    {/if}
  </div>
  <div class="card-metrics">
    {#if project.client_name}
      <span class="metric-badge metric-client" style="--client-color: {colorValues[project.client_color || '--cyan']}">
        {project.client_name}
      </span>
    {/if}
    <span class="metric-badge metric-status" style="--status-color: {statusColors[project.status] || 'var(--text-dim)'}">
      {statusLabels[project.status] || project.status}
    </span>
    <span class="metric-badge metric-tasks">{project.task_count ?? 0} tasks</span>
  </div>
</a>

<style>
  a[data-section="project-card"] {
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

  a[data-section="project-card"]:hover {
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
    color: var(--project-color);
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

  .metric-client {
    background: color-mix(in srgb, var(--client-color) 15%, transparent);
    color: var(--client-color);
    border: 1px solid color-mix(in srgb, var(--client-color) 30%, transparent);
  }

  .metric-status {
    background: color-mix(in srgb, var(--status-color) 15%, transparent);
    color: var(--status-color);
    border: 1px solid color-mix(in srgb, var(--status-color) 30%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-tasks {
    background: rgba(255, 140, 0, 0.15);
    color: var(--amber);
  }
</style>
