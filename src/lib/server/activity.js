import db from './db.js';

const stmts = {
  getByClient: db.prepare('SELECT * FROM activity_log WHERE client_id = ? ORDER BY created_at DESC'),
  getByProject: db.prepare('SELECT al.* FROM activity_log al JOIN projects p ON al.client_id = p.client_id WHERE p.id = ? ORDER BY al.created_at DESC'),
  create: db.prepare('INSERT INTO activity_log (client_id, entity_type, action, description) VALUES (@client_id, @entity_type, @action, @description)')
};

export function getByClient(clientId) {
  return stmts.getByClient.all(clientId);
}

export function getByProject(projectId) {
  return stmts.getByProject.all(projectId);
}

export function logActivity(clientId, entityType, action, description) {
  return stmts.create.run({ client_id: clientId, entity_type: entityType, action, description });
}
