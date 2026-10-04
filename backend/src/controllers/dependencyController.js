const { getDb } = require('../database/db');
const { success, error } = require('../utils/response');

/**
 * GET /api/tasks/dependencies
 * List all dependencies with task titles
 */
async function listDependencies(req, res) {
  try {
    const db = await getDb();

    const dependencies = await db.all(
      `SELECT d.id, d.task_id, d.depends_on_task_id,
              t1.title AS task_title, t2.title AS depends_on_title
       FROM dependencies d
       JOIN tasks t1 ON t1.id = d.task_id
       JOIN tasks t2 ON t2.id = d.depends_on_task_id`
    );

    return success(res, dependencies);
  } catch (err) {
    console.error('[dependencyController.listDependencies]', err);
    return error(res, 'Failed to fetch dependencies', 500, err.message);
  }
}

/**
 * Check if there is a path from startId to targetId in the dependency graph.
 * Used to detect circular dependencies using BFS.
 * @param {Object} db
 * @param {number} startId - the node to start traversal from
 * @param {number} targetId - the node we're looking for
 * @returns {Promise<boolean>}
 */
async function hasPath(db, startId, targetId) {
  // Fetch all dependency edges once
  const allDeps = await db.all('SELECT task_id, depends_on_task_id FROM dependencies');

  // Build adjacency list: task_id -> [depends_on_task_ids]
  const graph = {};
  for (const dep of allDeps) {
    if (!graph[dep.task_id]) graph[dep.task_id] = [];
    graph[dep.task_id].push(dep.depends_on_task_id);
  }

  // BFS from startId following "depends_on" edges
  const visited = new Set();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * POST /api/tasks/:id/dependencies
 * Add a dependency: task :id depends on depends_on_task_id
 */
async function addDependency(req, res) {
  try {
    const db = await getDb();
    const taskId = Number(req.params.id);
    const { depends_on_task_id } = req.body;

    if (!depends_on_task_id) {
      return error(res, 'depends_on_task_id is required', 400);
    }

    const dependsOnId = Number(depends_on_task_id);

    // 1. No self-reference
    if (taskId === dependsOnId) {
      return error(res, 'A task cannot depend on itself', 400);
    }

    // 2. Both tasks must exist
    const task = await db.get('SELECT id FROM tasks WHERE id = ?', taskId);
    if (!task) return error(res, 'Task not found', 404);

    const dependsOnTask = await db.get('SELECT id FROM tasks WHERE id = ?', dependsOnId);
    if (!dependsOnTask) return error(res, 'Dependency task not found', 404);

    // 3. Circular dependency check: does depends_on_task_id already depend (transitively) on task_id?
    const wouldCreateCycle = await hasPath(db, dependsOnId, taskId);
    if (wouldCreateCycle) {
      return error(res, 'Would create circular dependency', 409);
    }

    const result = await db.run(
      'INSERT INTO dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
      [taskId, dependsOnId]
    );

    const dep = await db.get('SELECT * FROM dependencies WHERE id = ?', result.lastID);
    return success(res, dep, 201);
  } catch (err) {
    // SQLite unique constraint violation
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return error(res, 'Dependency already exists', 409);
    }
    console.error('[dependencyController.addDependency]', err);
    return error(res, 'Failed to add dependency', 500, err.message);
  }
}

/**
 * DELETE /api/tasks/:id/dependencies/:dependencyId
 * Remove a specific dependency
 */
async function removeDependency(req, res) {
  try {
    const db = await getDb();
    const { id, dependencyId } = req.params;

    const dep = await db.get(
      'SELECT * FROM dependencies WHERE id = ? AND task_id = ?',
      [dependencyId, id]
    );
    if (!dep) {
      return error(res, 'Dependency not found', 404);
    }

    await db.run('DELETE FROM dependencies WHERE id = ? AND task_id = ?', [dependencyId, id]);
    return success(res, { id: Number(dependencyId) });
  } catch (err) {
    console.error('[dependencyController.removeDependency]', err);
    return error(res, 'Failed to remove dependency', 500, err.message);
  }
}

module.exports = { listDependencies, addDependency, removeDependency };
