import { error } from '@sveltejs/kit';
import { getById } from '$lib/server/projects.js';
import { getByProject as getEntries } from '$lib/server/entries.js';
import { getByProject as getMeetingNotes, getByClient as getClientMeetingNotes } from '$lib/server/meeting-notes.js';
import { getByProject as getActivity } from '$lib/server/activity.js';
import { getById as getClient } from '$lib/server/clients.js';
import { getByProject as getTasks } from '$lib/server/tasks.js';

export function load({ params }) {
  const project = getById(params.id);
  if (!project) throw error(404, 'Project not found');
  const client = project.client_id ? getClient(project.client_id) : null;
  const entries = getEntries(project.id);
  const meetingNotes = getMeetingNotes(project.id);
  const clientMeetingNotes = client ? getClientMeetingNotes(client.id) : [];
  const activity = getActivity(project.id);
  const tasks = getTasks(project.id);
  return {
    project, entries, meetingNotes, clientMeetingNotes, activity, client, tasks
  };
}
