const { getDb } = require('../database/db');
const { success, error } = require('../utils/response');
const { calculatePriorityScore, getScoreBreakdown } = require('../services/priorityService');

/**
 * GET /api/tasks
 * List tasks with optional filters: status, category, user_id
 */
async function listTasks(req, res) {
  try {
    const db = await getDb();
    const { status, category, user_id } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const tasks = await db.all(
      `SELECT * FROM tasks ${where} ORDER BY priority_score DESC`,
      params
    );

    return success(res, tasks);
  } catch (err) {
    console.error('[taskController.listTasks]', err);
    return error(res, 'Failed to fetch tasks', 500, err.message);
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
async function createTask(req, res) {
  try {
    const db = await getDb();
    const {
      title, description, category, deadline,
      estimated_minutes, impact, consequence, user_id,
    } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return error(res, 'title is required', 400);
    }
    if (impact !== undefined) {
      const imp = Number(impact);
      if (!Number.isInteger(imp) || imp < 1 || imp > 10) {
        return error(res, 'impact must be an integer between 1 and 10', 400);
      }
    }
    if (estimated_minutes !== undefined) {
      const mins = Number(estimated_minutes);
      if (!Number.isInteger(mins) || mins <= 0) {
        return error(res, 'estimated_minutes must be a positive integer', 400);
      }
    }

    const taskData = {
      title: title.trim(),
      description: description || null,
      category: category || 'General',
      deadline: deadline || null,
      estimated_minutes: estimated_minutes ? Number(estimated_minutes) : 60,
      impact: impact ? Number(impact) : 5,
      consequence: consequence || null,
      user_id: user_id || null,
    };

    taskData.priority_score = calculatePriorityScore(taskData);

    const result = await db.run(
      `INSERT INTO tasks (user_id, title, description, category, deadline, estimated_minutes, impact, consequence, status, priority_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        taskData.user_id,
        taskData.title,
        taskData.description,
        taskData.category,
        taskData.deadline,
        taskData.estimated_minutes,
        taskData.impact,
        taskData.consequence,
        taskData.priority_score,
      ]
    );

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
    return success(res, newTask, 201);
  } catch (err) {
    console.error('[taskController.createTask]', err);
    return error(res, 'Failed to create task', 500, err.message);
  }
}

/**
 * GET /api/tasks/:id
 * Get a single task with its dependencies
 */
async function getTask(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    const dependencies = await db.all(
      `SELECT t.* FROM tasks t
       JOIN dependencies d ON d.depends_on_task_id = t.id
       WHERE d.task_id = ?`,
      id
    );

    return success(res, { ...task, dependencies });
  } catch (err) {
    console.error('[taskController.getTask]', err);
    return error(res, 'Failed to fetch task', 500, err.message);
  }
}

/**
 * PUT /api/tasks/:id
 * Partial update; recalculates priority_score
 */
async function updateTask(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!existing) {
      return error(res, 'Task not found', 404);
    }

    const {
      title, description, category, deadline,
      estimated_minutes, impact, consequence, status, user_id,
    } = req.body;

    // Validate fields if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return error(res, 'title cannot be empty', 400);
    }
    if (impact !== undefined) {
      const imp = Number(impact);
      if (!Number.isInteger(imp) || imp < 1 || imp > 10) {
        return error(res, 'impact must be an integer between 1 and 10', 400);
      }
    }
    if (estimated_minutes !== undefined) {
      const mins = Number(estimated_minutes);
      if (!Number.isInteger(mins) || mins <= 0) {
        return error(res, 'estimated_minutes must be a positive integer', 400);
      }
    }

    // Merge with existing values
    const updated = {
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? description : existing.description,
      category: category !== undefined ? category : existing.category,
      deadline: deadline !== undefined ? deadline : existing.deadline,
      estimated_minutes: estimated_minutes !== undefined ? Number(estimated_minutes) : existing.estimated_minutes,
      impact: impact !== undefined ? Number(impact) : existing.impact,
      consequence: consequence !== undefined ? consequence : existing.consequence,
      status: status !== undefined ? status : existing.status,
      user_id: user_id !== undefined ? user_id : existing.user_id,
    };

    updated.priority_score = calculatePriorityScore(updated);

    await db.run(
      `UPDATE tasks SET
         user_id = ?, title = ?, description = ?, category = ?, deadline = ?,
         estimated_minutes = ?, impact = ?, consequence = ?, status = ?, priority_score = ?
       WHERE id = ?`,
      [
        updated.user_id,
        updated.title,
        updated.description,
        updated.category,
        updated.deadline,
        updated.estimated_minutes,
        updated.impact,
        updated.consequence,
        updated.status,
        updated.priority_score,
        id,
      ]
    );

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    return success(res, task);
  } catch (err) {
    console.error('[taskController.updateTask]', err);
    return error(res, 'Failed to update task', 500, err.message);
  }
}

/**
 * DELETE /api/tasks/:id
 * Soft delete: archives the task
 */
async function deleteTask(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!existing) {
      return error(res, 'Task not found', 404);
    }

    await db.run(`UPDATE tasks SET status = 'archived' WHERE id = ?`, id);
    return success(res, { id: Number(id) });
  } catch (err) {
    console.error('[taskController.deleteTask]', err);
    return error(res, 'Failed to delete task', 500, err.message);
  }
}

/**
 * POST /api/tasks/:id/complete
 * Mark task as done
 */
async function completeTask(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!existing) {
      return error(res, 'Task not found', 404);
    }

    await db.run(
      `UPDATE tasks SET status = 'done', completed_at = datetime('now') WHERE id = ?`,
      id
    );

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    return success(res, task);
  } catch (err) {
    console.error('[taskController.completeTask]', err);
    return error(res, 'Failed to complete task', 500, err.message);
  }
}

/**
 * GET /api/tasks/prioritized
 * Same filters as listTasks, but includes rank and score_breakdown
 */
async function getPrioritizedTasks(req, res) {
  try {
    const db = await getDb();
    const { status, category, user_id } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const tasks = await db.all(
      `SELECT * FROM tasks ${where} ORDER BY priority_score DESC`,
      params
    );

    const ranked = tasks.map((task, index) => ({
      ...task,
      rank: index + 1,
      score_breakdown: getScoreBreakdown(task),
    }));

    return success(res, ranked);
  } catch (err) {
    console.error('[taskController.getPrioritizedTasks]', err);
    return error(res, 'Failed to fetch prioritized tasks', 500, err.message);
  }
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
  getPrioritizedTasks,
};
