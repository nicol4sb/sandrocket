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
  `);

  return db;
}

