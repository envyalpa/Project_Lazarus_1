import { getRunById, getResults } from '$lib/server/testing-suite.js';
import { getAll as getAllClients } from '$lib/server/clients.js';
import { getAll as getAllProjects } from '$lib/server/projects.js';
import { error } from '@sveltejs/kit';
import { activeProcesses } from '$lib/server/active-processes.js';

export function load({ params }) {
  const runId = Number(params.id);
  const run = getRunById(runId);
  if (!run) {
    throw error(404, 'Evaluation run not found');
  }

  run.is_running = activeProcesses.has(runId);

  const results = getResults(runId);
  const clients = getAllClients() || [];
  const projects = getAllProjects() || [];

  const clientsWithProjects = clients.map(c => ({
    ...c,
    projects: projects.filter(p => p.client_id === c.id)
  }));

  return {
    run,
    results,
    clients: clientsWithProjects
  };
}
