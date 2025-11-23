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
  // Allow explicit override via env for absolute clarity across dev/prod
  const envOverride = process.env.ROCKET_DB_PATH;
  const { filename } = options;
  const projectRoot = findProjectRoot();
  const dbPath = envOverride ? resolve(envOverride) : resolve(projectRoot, filename);
  const db = new DatabaseConstructor(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Detect legacy schema and force a destructive reset if found
  try {
    const info = db.prepare(`PRAGMA table_info('users')`).all() as Array<{ name: string; type: string }>;
    const hasUsers = Array.isArray(info) && info.length > 0;
    if (hasUsers) {
      const idCol = info.find((c) => c.name === 'id');
      const idIsInteger = idCol && /INT/i.test(idCol.type ?? '');
      // If users table exists but id column missing or not integer, drop all domain tables
      if (!idCol || !idIsInteger) {
        db.exec(`
          PRAGMA foreign_keys = OFF;
          DROP TABLE IF EXISTS tasks;
          DROP TABLE IF EXISTS epics;
          DROP TABLE IF EXISTS projects;
          DROP TABLE IF EXISTS users;
          PRAGMA foreign_keys = ON;
        `);
      }
    }
  } catch {
    // if PRAGMA fails, proceed to create tables
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS epics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epic_id INTEGER NOT NULL,
      creator_user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL, -- 'backlog' | 'in_progress' | 'done'
      position INTEGER NOT NULL, -- ordering within status column
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_edited_by_user_id INTEGER,
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (last_edited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_epic_status_pos ON tasks(epic_id, status, position);
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL, -- 'owner' | 'contributor'
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS project_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_by_user_id INTEGER NOT NULL,
      used_by_user_id INTEGER,
      used_at TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
  `);

  // Migration: Add creator_user_id column and/or remove title column if needed
  try {
    const taskInfo = db.prepare(`PRAGMA table_info('tasks')`).all() as Array<{ name: string; type: string }>;
    if (taskInfo.length === 0) {
      // Table doesn't exist yet, will be created by CREATE TABLE IF NOT EXISTS above
      // Continue to project_members migration
    } else {
      const hasTitleColumn = taskInfo.some((col) => col.name === 'title');
    const hasCreatorColumn = taskInfo.some((col) => col.name === 'creator_user_id');
    const hasLastEditedColumn = taskInfo.some((col) => col.name === 'last_edited_by_user_id');
    
    // If we need to add creator_user_id, last_edited_by_user_id, or remove title, recreate the table
    if (!hasCreatorColumn || !hasLastEditedColumn || hasTitleColumn) {
      // Get the first user ID to use as default creator for existing tasks
      const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: number } | undefined;
      const defaultCreatorId = firstUser?.id ?? 1;
      
      // Build the SELECT statement based on what columns exist
      let selectClause = 'SELECT id, epic_id';
      if (hasCreatorColumn) {
        selectClause += ', creator_user_id';
      } else {
        selectClause += `, ${defaultCreatorId} as creator_user_id`;
      }
      
      // Handle description - use it if exists, otherwise use title if exists, otherwise empty string
      if (taskInfo.some((col) => col.name === 'description')) {
        if (hasTitleColumn) {
          selectClause += ', COALESCE(description, title, \'\') as description';
        } else {
          selectClause += ', COALESCE(description, \'\') as description';
        }
      } else if (hasTitleColumn) {
        selectClause += ', COALESCE(title, \'\') as description';
      } else {
        selectClause += ', \'\' as description';
      }
      
      selectClause += ', status, position, created_at, updated_at FROM tasks';
      
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE tasks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epic_id INTEGER NOT NULL,
          creator_user_id INTEGER NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL,
          position INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_edited_by_user_id INTEGER,
          FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE,
          FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (last_edited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
        );
        INSERT INTO tasks_new (id, epic_id, creator_user_id, description, status, position, created_at, updated_at, last_edited_by_user_id)
        SELECT 
          id, 
          epic_id, 
          ${hasCreatorColumn ? 'creator_user_id' : `${defaultCreatorId} as creator_user_id`},
          ${taskInfo.some((col) => col.name === 'description') 
            ? (hasTitleColumn ? 'COALESCE(description, title, \'\')' : 'COALESCE(description, \'\')')
            : (hasTitleColumn ? 'COALESCE(title, \'\')' : '\'\'')
          } as description,
          status, 
          position, 
          created_at, 
          updated_at,
          ${hasLastEditedColumn ? 'last_edited_by_user_id' : 'NULL'} as last_edited_by_user_id
        FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
        CREATE INDEX IF NOT EXISTS idx_tasks_epic_status_pos ON tasks(epic_id, status, position);
        PRAGMA foreign_keys = ON;
      `);
      }
    }
  } catch (err) {
    // If migration fails, log but continue - table will be created correctly on next run
    // eslint-disable-next-line no-console
    console.error('[db] Migration error:', err);
  }

  // Migration: Add project members for existing projects (set owner as member)
  try {
    const memberInfo = db.prepare(`PRAGMA table_info('project_members')`).all() as Array<{ name: string }>;
    if (memberInfo.length > 0) {
      // Table exists, check if we need to migrate existing owners
      const existingMembers = db.prepare('SELECT COUNT(*) as count FROM project_members').get() as { count: number } | undefined;
      if (existingMembers && existingMembers.count === 0) {
        // No members yet, add owners as members
        db.exec(`
          INSERT INTO project_members (project_id, user_id, role, created_at)
          SELECT id, owner_user_id, 'owner', created_at
          FROM projects
        `);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Migration error for project_members:', err);
  }

  // Emit a single startup log with DB path to help diagnose multiple-process setups
  try {
    // eslint-disable-next-line no-console
    console.log(`[db] Using SQLite at: ${dbPath}`);
  } catch {
    // ignore logging errors in restricted environments
  }

  return db;
}

