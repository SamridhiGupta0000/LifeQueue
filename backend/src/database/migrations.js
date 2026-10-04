const { getDb } = require('./db');

/**
 * Run all schema migrations on startup.
 * Drops old incompatible tables (detected by old column names), then creates new schema.
 */
async function runMigrations() {
  const db = await getDb();

  // Detect old schema: check if 'tasks' table exists with the old 'effort' column
  // or if the old 'task_dependencies' table exists.
  const oldDepsTable = await db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='task_dependencies'`
  );
  const tasksTable = await db.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'`
  );

  let hasOldSchema = false;
  if (oldDepsTable) {
    hasOldSchema = true;
  } else if (tasksTable) {
    // Check for old 'effort' column
    const columns = await db.all(`PRAGMA table_info(tasks)`);
    const hasEffort = columns.some((c) => c.name === 'effort');
    if (hasEffort) hasOldSchema = true;
  }

  if (hasOldSchema) {
    console.log('[DB] Old schema detected — dropping incompatible tables...');
    await db.exec(`DROP TABLE IF EXISTS task_dependencies;`);
    await db.exec(`DROP TABLE IF EXISTS tasks;`);
  }

  // Create all new tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    UNIQUE NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title              TEXT    NOT NULL,
      description        TEXT,
      category           TEXT    NOT NULL DEFAULT 'General',
      deadline           TEXT,
      estimated_minutes  INTEGER NOT NULL DEFAULT 60,
      impact             INTEGER NOT NULL DEFAULT 5,
      consequence        TEXT,
      status             TEXT    NOT NULL DEFAULT 'pending',
      priority_score     REAL,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      completed_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id             INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, depends_on_task_id),
      CHECK(task_id != depends_on_task_id)
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time TEXT    NOT NULL,
      end_time   TEXT,
      duration   INTEGER,
      completed  INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id       ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority      ON tasks(priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_deps_task_id        ON dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_deps_depends_on     ON dependencies(depends_on_task_id);
    CREATE INDEX IF NOT EXISTS idx_focus_task_id       ON focus_sessions(task_id);
  `);

  console.log('[DB] Migrations complete.');
}

module.exports = { runMigrations };
