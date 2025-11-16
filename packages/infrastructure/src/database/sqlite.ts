import DatabaseConstructor, { Database } from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface SqliteOptions {
  filename: string;
}

function findProjectRoot(startPath: string = process.cwd()): string {
  let current = resolve(startPath);
  while (current !== dirname(current)) {
    const packageJsonPath = resolve(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      // Check if this is the root package.json (has workspaces field)
      try {
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, 'utf-8')
        );
        if (packageJson.workspaces) {
          return current;
        }
      } catch {
        // If we can't read/parse, continue searching
      }
    }
    current = dirname(current);
  }
  // Fallback: look for package.json with workspaces from project root
  // If we're in a workspace, go up one more level
  const fallbackPath = dirname(resolve(startPath));
  if (existsSync(resolve(fallbackPath, 'package.json'))) {
    return fallbackPath;
  }
  return process.cwd();
}

export function initializeSqliteDatabase(options: SqliteOptions): Database {
  const { filename } = options;
  const projectRoot = findProjectRoot();
  const db = new DatabaseConstructor(resolve(projectRoot, filename));

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS epics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      epic_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL, -- 'backlog' | 'in_progress' | 'done'
      position INTEGER NOT NULL, -- ordering within status column
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_epic_status_pos ON tasks(epic_id, status, position);
  `);

  return db;
}

