import { error } from '@sveltejs/kit';
import { getById } from '$lib/server/clients.js';
import { getByClient as getEntries } from '$lib/server/entries.js';
import { getByClient as getContacts } from '$lib/server/contacts.js';
import { getByClient as getMeetingNotes } from '$lib/server/meeting-notes.js';
import { getByClient as getFiles } from '$lib/server/client-files.js';
import { getByClient as getActivity } from '$lib/server/activity.js';
import { getByClient as getProjects } from '$lib/server/projects.js';
import { getByClient as getTasks } from '$lib/server/tasks.js';

export function load({ params }) {
  const client = getById(params.id);
  if (!client) throw error(404, 'Client not found');
  const clientId = client.id;
  return {
    client,
    entries: getEntries(clientId),
    contacts: getContacts(clientId),
    meetingNotes: getMeetingNotes(clientId),
    files: getFiles(clientId),
    activity: getActivity(clientId),
    projects: getProjects(clientId),
    tasks: getTasks(clientId)
  };
}
