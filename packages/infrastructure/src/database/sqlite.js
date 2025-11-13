import DatabaseConstructor from 'better-sqlite3';
import { resolve } from 'node:path';
export function initializeSqliteDatabase(options) {
    const { filename } = options;
    const db = new DatabaseConstructor(resolve(process.cwd(), filename));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
    return db;
}
