const { getDb } = require('../database/db');
const { success, error } = require('../utils/response');

/**
 * POST /api/optimize-session
 * Recommends a set of tasks to complete within the available time budget.
 */
async function optimizeSession(req, res) {
  try {
    const db = await getDb();
    const { available_minutes, user_id } = req.body;

    if (available_minutes === undefined || available_minutes === null) {
      return error(res, 'available_minutes is required', 400);
    }

    const mins = Number(available_minutes);
    if (isNaN(mins) || mins <= 0) {
      return error(res, 'available_minutes must be a positive number', 400);
    }

    // 1. Fetch all pending/in_progress tasks ordered by priority DESC
    const userFilter = user_id ? 'AND user_id = ?' : '';
    const userParams = user_id ? [user_id] : [];

    const tasks = await db.all(
      `SELECT * FROM tasks
       WHERE status IN ('pending', 'in_progress') ${userFilter}
       ORDER BY priority_score DESC`,
      userParams
    );

    // 2. Fetch all dependencies
    const allDeps = await db.all('SELECT task_id, depends_on_task_id FROM dependencies');

    // Build map: taskId -> [depends_on_task_id, ...]
    const depsMap = {};
    for (const dep of allDeps) {
      if (!depsMap[dep.task_id]) depsMap[dep.task_id] = [];
      depsMap[dep.task_id].push(dep.depends_on_task_id);
    }

    // Build task lookup for status check
    const taskLookup = {};
    for (const task of tasks) {
      taskLookup[task.id] = task;
    }

    // Also fetch all tasks (including done) so we can check dependency status
    const allTasks = await db.all('SELECT id, status FROM tasks');
    const allTaskLookup = {};
    for (const t of allTasks) {
      allTaskLookup[t.id] = t;
    }

    // 3. Greedy selection: skip tasks with incomplete dependencies
    const recommended_tasks = [];
    let total_estimated_minutes = 0;

    for (const task of tasks) {
      const depIds = depsMap[task.id] || [];

      // Check if all dependencies are done
      const hasIncompleteDep = depIds.some((depId) => {
        const depTask = allTaskLookup[depId];
        return !depTask || depTask.status !== 'done';
      });

      if (hasIncompleteDep) continue;

      // Check if adding this task fits in the time budget
      if (total_estimated_minutes + task.estimated_minutes <= mins) {
        recommended_tasks.push(task);
        total_estimated_minutes += task.estimated_minutes;
      }
    }

    const utilization_pct = Math.round((total_estimated_minutes / mins) * 100);

    return success(res, {
      recommended_tasks,
      total_estimated_minutes,
      utilization_pct,
    });
  } catch (err) {
    console.error('[optimizerController.optimizeSession]', err);
    return error(res, 'Failed to optimize session', 500, err.message);
  }
}

module.exports = { optimizeSession };
