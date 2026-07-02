import { getRuns } from '$lib/server/testing-suite.js';
import { getAll as getAllClients } from '$lib/server/clients.js';
import { getAll as getAllProjects } from '$lib/server/projects.js';

export function load() {
  const runs = getRuns();
  const clients = getAllClients() || [];
  const projects = getAllProjects() || [];

  // Nest projects inside clients for cascading dropdown in modal
  const clientsWithProjects = clients.map(c => ({
    ...c,
    projects: projects.filter(p => p.client_id === c.id)
  }));

  return {
    runs,
    clients: clientsWithProjects
  };
}
