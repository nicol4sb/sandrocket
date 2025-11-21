import { randomUUID } from 'node:crypto';
function mapRowToUser(row) {
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        displayName: row.display_name,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteUserRepository {
    constructor(db) {
        this.db = db;
        this.findByIdStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
        this.findByEmailStmt = this.db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
        this.insertStmt = this.db.prepare(`INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
       VALUES (@id, @email, @password_hash, @display_name, @created_at, @updated_at)`);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRowToUser(row) : null;
    }
    async findByEmail(email) {
        const row = this.findByEmailStmt.get(email);
        return row ? mapRowToUser(row) : null;
    }
    async create(input) {
        const now = new Date().toISOString();
        const record = {
            id: randomUUID(),
            email: input.email,
            password_hash: input.passwordHash,
            display_name: input.displayName ?? null,
            created_at: now,
            updated_at: now
        };
        this.insertStmt.run(record);
        return mapRowToUser(record);
    }
}
