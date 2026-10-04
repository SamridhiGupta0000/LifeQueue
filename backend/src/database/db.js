const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db = null;

/**
 * Opens (or returns the existing) SQLite database connection.
 * Creates the data directory and file if they don't exist.
 */
async function getDb() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/lifequeue.db';
  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = await open({
    filename: resolvedPath,
    driver: sqlite3.Database,
  });

  // Enable WAL mode for better concurrent read performance
  await db.run('PRAGMA journal_mode = WAL;');
  await db.run('PRAGMA foreign_keys = ON;');

  return db;
}

module.exports = { getDb };
