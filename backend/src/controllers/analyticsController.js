const { getDb } = require('../database/db');
const { success, error } = require('../utils/response');

/**
 * GET /api/analytics
 * Returns comprehensive analytics data, optionally filtered by user_id
 */
async function getAnalytics(req, res) {
  try {
    const db = await getDb();
    const { user_id } = req.query;

    const userFilter = user_id ? 'WHERE user_id = ?' : '';
    const userParams = user_id ? [user_id] : [];

    // 1. Task status counts
    const statusRows = await db.all(
      `SELECT status, COUNT(*) as count FROM tasks ${userFilter} GROUP BY status`,
      userParams
    );

    const statusMap = {};
    let total_tasks = 0;
    for (const row of statusRows) {
      statusMap[row.status] = row.count;
      total_tasks += row.count;
    }

    const pending_tasks = statusMap['pending'] || 0;
    const in_progress_tasks = statusMap['in_progress'] || 0;
    const done_tasks = statusMap['done'] || 0;

    // 2. Average priority score (excluding archived)
    const avgFilter = user_id
      ? 'WHERE user_id = ? AND status != \'archived\''
      : 'WHERE status != \'archived\'';
    const avgRow = await db.get(
      `SELECT AVG(priority_score) as avg FROM tasks ${avgFilter}`,
      userParams
    );
    const avg_priority_score = Math.round(((avgRow && avgRow.avg) || 0) * 100) / 100;

    // 3. Tasks by category
    const tasks_by_category = await db.all(
      `SELECT category, COUNT(*) as count FROM tasks ${userFilter} GROUP BY category ORDER BY count DESC`,
      userParams
    );

    // 4. Tasks completed in the last 7 days
    let completedFilter;
    let completedParams;
    if (user_id) {
      completedFilter = `WHERE status = 'done' AND completed_at >= datetime('now', '-7 days') AND user_id = ?`;
      completedParams = [user_id];
    } else {
      completedFilter = `WHERE status = 'done' AND completed_at >= datetime('now', '-7 days')`;
      completedParams = [];
    }
    const completedRow = await db.get(
      `SELECT COUNT(*) as count FROM tasks ${completedFilter}`,
      completedParams
    );
    const tasks_completed_last_7_days = (completedRow && completedRow.count) || 0;

    // 5. Focus time and session count
    let focusFilter;
    let focusParams;
    if (user_id) {
      focusFilter = 'WHERE task_id IN (SELECT id FROM tasks WHERE user_id = ?)';
      focusParams = [user_id];
    } else {
      focusFilter = '';
      focusParams = [];
    }
    const focusRow = await db.get(
      `SELECT COUNT(*) as sessions, SUM(duration) as total_seconds FROM focus_sessions ${focusFilter}`,
      focusParams
    );
    const focus_sessions_count = (focusRow && focusRow.sessions) || 0;
    const focus_time_total_minutes = Math.round(((focusRow && focusRow.total_seconds) || 0) / 60);

    // 6. Top 5 priority tasks (not done or archived)
    let topFilter;
    if (user_id) {
      topFilter = `WHERE user_id = ? AND status NOT IN ('done', 'archived')`;
    } else {
      topFilter = `WHERE status NOT IN ('done', 'archived')`;
    }
    const top_5_priority_tasks = await db.all(
      `SELECT * FROM tasks ${topFilter} ORDER BY priority_score DESC LIMIT 5`,
      userParams
    );

    return success(res, {
      total_tasks,
      pending_tasks,
      in_progress_tasks,
      done_tasks,
      avg_priority_score,
      tasks_by_category,
      tasks_completed_last_7_days,
      focus_time_total_minutes,
      focus_sessions_count,
      top_5_priority_tasks,
    });
  } catch (err) {
    console.error('[analyticsController.getAnalytics]', err);
    return error(res, 'Failed to fetch analytics', 500, err.message);
  }
}

module.exports = { getAnalytics };
