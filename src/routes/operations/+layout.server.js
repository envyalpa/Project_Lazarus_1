import { getAll as getClients } from '$lib/server/clients.js';
import { getAll as getProjects } from '$lib/server/projects.js';
import { getAll as getTasks } from '$lib/server/tasks.js';

export function load(event) {
  event.depends('operations:data');
  const allClients = getClients();
  const allProjects = getProjects();
  const clientsWithProjects = allClients.map(c => ({
    ...c, projects: allProjects.filter(p => p.client_id === c.id)
  }));
  return {
    clients: clientsWithProjects,
    projects: allProjects,
    tasks: getTasks()
  };
}
