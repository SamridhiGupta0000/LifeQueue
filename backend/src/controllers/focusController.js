const { getDb } = require('../database/db');
const { success, error } = require('../utils/response');

/**
 * POST /api/focus/start
 * Start a new focus session for a task
 */
async function startFocus(req, res) {
  try {
    const db = await getDb();
    const { task_id } = req.body;

    if (!task_id) {
      return error(res, 'task_id is required', 400);
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', task_id);
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    if (task.status === 'done' || task.status === 'archived') {
      return error(res, `Cannot start focus session on a task with status '${task.status}'`, 400);
    }

    const result = await db.run(
      `INSERT INTO focus_sessions (task_id, start_time) VALUES (?, datetime('now'))`,
      [task_id]
    );

    const session = await db.get('SELECT * FROM focus_sessions WHERE id = ?', result.lastID);
    return success(res, session, 201);
  } catch (err) {
    console.error('[focusController.startFocus]', err);
    return error(res, 'Failed to start focus session', 500, err.message);
  }
}

/**
 * POST /api/focus/end
 * End an existing focus session
 */
async function endFocus(req, res) {
  try {
    const db = await getDb();
    const { session_id, completed } = req.body;

    if (!session_id) {
      return error(res, 'session_id is required', 400);
    }

    const session = await db.get('SELECT * FROM focus_sessions WHERE id = ?', session_id);
    if (!session) {
      return error(res, 'Focus session not found', 404);
    }

    if (session.end_time) {
      return error(res, 'Session already ended', 400);
    }

    const durationSeconds = Math.round(
      (Date.now() - new Date(session.start_time).getTime()) / 1000
    );

    const completedFlag = completed ? 1 : 0;

    await db.run(
      `UPDATE focus_sessions
       SET end_time = datetime('now'), duration = ?, completed = ?
       WHERE id = ?`,
      [durationSeconds, completedFlag, session_id]
    );

    const updatedSession = await db.get('SELECT * FROM focus_sessions WHERE id = ?', session_id);
    return success(res, updatedSession);
  } catch (err) {
    console.error('[focusController.endFocus]', err);
    return error(res, 'Failed to end focus session', 500, err.message);
  }
}

module.exports = { startFocus, endFocus };
