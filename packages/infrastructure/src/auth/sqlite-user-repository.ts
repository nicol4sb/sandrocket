import { randomUUID } from 'node:crypto';
import { Database, Statement } from 'better-sqlite3';
import {
  CreateUserInput,
  User,
  UserRepository
} from '@sandrocket/core';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export class SqliteUserRepository implements UserRepository {
  private readonly db: Database;
  private readonly findByIdStmt: Statement;
  private readonly findByEmailStmt: Statement;
  private readonly findByDisplayNameStmt: Statement;
  private readonly insertStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.findByIdStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    this.findByEmailStmt = this.db.prepare(
      'SELECT * FROM users WHERE lower(email) = lower(?)'
    );
    this.findByDisplayNameStmt = this.db.prepare(
      'SELECT * FROM users WHERE display_name = ?'
    );
    this.insertStmt = this.db.prepare(
      `INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
       VALUES (@id, @email, @password_hash, @display_name, @created_at, @updated_at)`
    );
  }

  async findById(id: string): Promise<User | null> {
    const row = this.findByIdStmt.get(id) as UserRow | undefined;
    return row ? mapRowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.findByEmailStmt.get(email) as UserRow | undefined;
    return row ? mapRowToUser(row) : null;
  }

  async findByDisplayName(displayName: string): Promise<User | null> {
    const row = this.findByDisplayNameStmt.get(displayName) as UserRow | undefined;
    return row ? mapRowToUser(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const record: UserRow = {
      id: randomUUID(),
      email: input.email,
      password_hash: input.passwordHash,
      display_name: input.displayName,
      created_at: now,
      updated_at: now
    };

    try {
      this.insertStmt.run(record);
    } catch (error: unknown) {
      // Check for unique constraint violation on display_name
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        const err = error as { message?: string };
        if (err.message?.includes('display_name')) {
          throw new Error('Display name already exists');
        }
      }
      throw error;
    }

    return mapRowToUser(record);
  }
}

