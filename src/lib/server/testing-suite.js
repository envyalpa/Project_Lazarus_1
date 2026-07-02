import db from './db.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function getRuns() {
  const query = `
    SELECT 
      r.*,
      c.name AS client_name,
      p.name AS project_name,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id) AS total_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'passed') AS passed_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'failed') AS failed_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'gaps') AS gaps_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'pending') AS pending_count
    FROM test_runs r
    LEFT JOIN clients c ON r.client_id = c.id
    LEFT JOIN projects p ON r.project_id = p.id
    ORDER BY r.created_at DESC
  `;
  return db.prepare(query).all();
}

export function getRunById(id) {
  const query = `
    SELECT 
      r.*,
      c.name AS client_name,
      p.name AS project_name,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id) AS total_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'passed') AS passed_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'failed') AS failed_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'gaps') AS gaps_count,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = r.id AND status = 'pending') AS pending_count
    FROM test_runs r
    LEFT JOIN clients c ON r.client_id = c.id
    LEFT JOIN projects p ON r.project_id = p.id
    WHERE r.id = ?
  `;
  return db.prepare(query).get(id) || null;
}

export function getResults(runId) {
  const query = `SELECT * FROM test_results WHERE test_run_id = ? ORDER BY criteria_id ASC`;
  return db.prepare(query).all(runId);
}

export function createRun({ client_id, project_id, platform_name, run_name, url = '', username = '', password = '', customCriteria = null }) {
  const createTx = db.transaction(() => {
    // 1. Insert run metadata
    const runInsert = db.prepare(`
      INSERT INTO test_runs (client_id, project_id, platform_name, run_name, url, username, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(client_id || null, project_id || null, platform_name, run_name, url, username, password);

    const runId = runInsert.lastInsertRowid;

    // 2. Load criteria
    let criteriaList = [];
    if (customCriteria && Array.isArray(customCriteria)) {
      criteriaList = customCriteria;
    } else {
      const templatePath = join(process.cwd(), 'data', 'bizverse_testing_criteria.json');
      if (existsSync(templatePath)) {
        try {
          const raw = readFileSync(templatePath, 'utf-8');
          criteriaList = JSON.parse(raw);
        } catch (e) {
          console.error('[TestingSuite] Error loading default criteria file:', e);
        }
      }
    }

    // 3. Insert test results
    if (criteriaList.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO test_results (
          test_run_id, criteria_id, stage, pain_point, 
          what_to_test, expected_outcome, test_role, severity, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `);

      for (let i = 0; i < criteriaList.length; i++) {
        const c = criteriaList[i];
        const cid = c.criteria_id || c.id || (i + 1);
        stmt.run(
          runId,
          cid,
          c.stage || 'General',
          c.pain_point || '',
          c.what_to_test || '',
          c.expected_outcome || '',
          c.test_role || '',
          c.severity || 'Important'
        );
      }
    }

    return runId;
  });

  return createTx();
}

export function updateRun(id, { run_name, platform_name, client_id, project_id, url = '', username = '', password = '' }) {
  const query = `
    UPDATE test_runs 
    SET run_name = ?, platform_name = ?, client_id = ?, project_id = ?, url = ?, username = ?, password = ?, updated_at = datetime('now')
    WHERE id = ?
  `;
  const result = db.prepare(query).run(run_name, platform_name, client_id || null, project_id || null, url, username, password, id);
  return result.changes > 0;
}

export function deleteRun(id) {
  const result = db.prepare(`DELETE FROM test_runs WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function updateResult(id, { status, notes_gap, screenshot_path }) {
  // Try to find the result to get the test_run_id
  const resultRow = db.prepare('SELECT test_run_id FROM test_results WHERE id = ?').get(id);
  if (!resultRow) return false;

  const query = `
    UPDATE test_results 
    SET status = ?, notes_gap = ?, screenshot_path = ?, updated_at = datetime('now')
    WHERE id = ?
  `;
  const result = db.prepare(query).run(status, notes_gap || '', screenshot_path || '', id);

  if (result.changes > 0) {
    // Touch the parent run's updated_at timestamp
    db.prepare("UPDATE test_runs SET updated_at = datetime('now') WHERE id = ?").run(resultRow.test_run_id);
    return true;
  }
  return false;
}
