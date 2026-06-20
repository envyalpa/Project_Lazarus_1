import db from '$lib/server/db.js';

export function load() {
  try {
    // 1. Overdue tasks count and list grouped by client
    const overdueTasksByClient = db.prepare(`
      SELECT c.name as client_name, COUNT(t.id) as count
      FROM tasks t
      JOIN clients c ON t.client_id = c.id
      WHERE t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < date('now') AND t.parent_task_id IS NULL
      GROUP BY t.client_id
    `).all();

    const totalOverdue = overdueTasksByClient.reduce((sum, item) => sum + item.count, 0);

    // 2. Stale tasks (not-started for > 21 days)
    const staleTasksCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE status = 'not-started'
        AND (updated_at IS NULL OR updated_at < datetime('now', '-21 days'))
        AND created_at < datetime('now', '-21 days')
        AND parent_task_id IS NULL
    `).get().count;

    // 3. Contacts missing designation
    const missingDesignationCount = db.prepare(`
      SELECT COUNT(*) as count FROM contacts WHERE designation IS NULL OR trim(designation) = ''
    `).get().count;

    // 4. Story entries with no project
    const unlinkedStoriesCount = db.prepare(`
      SELECT COUNT(*) as count FROM story_entries WHERE project_id IS NULL
    `).get().count;

    return {
      healthSummary: {
        overdueTasksByClient,
        totalOverdue,
        staleTasksCount,
        missingDesignationCount,
        unlinkedStoriesCount
      }
    };
  } catch (error) {
    console.error('Error loading health summary:', error);
    return {
      healthSummary: {
        overdueTasksByClient: [],
        totalOverdue: 0,
        staleTasksCount: 0,
        missingDesignationCount: 0,
        unlinkedStoriesCount: 0
      }
    };
  }
}
