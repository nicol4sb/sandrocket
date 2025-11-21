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
        this.findByDisplayNameStmt = this.db.prepare('SELECT * FROM users WHERE display_name = ?');
        this.insertStmt = this.db.prepare(`INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
       VALUES (@email, @password_hash, @display_name, @created_at, @updated_at)`);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRowToUser(row) : null;
    }
    async findByEmail(email) {
        const row = this.findByEmailStmt.get(email);
        return row ? mapRowToUser(row) : null;
    }
    async findByDisplayName(displayName) {
        const row = this.findByDisplayNameStmt.get(displayName);
        return row ? mapRowToUser(row) : null;
    }
    async create(input) {
        const now = new Date().toISOString();
        const insertParams = {
            email: input.email,
            password_hash: input.passwordHash,
            display_name: input.displayName,
            created_at: now,
            updated_at: now
        };
        try {
            const info = this.insertStmt.run(insertParams);
            const created = this.findByIdStmt.get(info.lastInsertRowid);
            if (!created)
                throw new Error('Failed to fetch created user');
            return mapRowToUser(created);
        }
        catch (error) {
            // Check for unique constraint violation on display_name
            if (error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                const err = error;
                if (err.message?.includes('display_name')) {
                    throw new Error('Display name already exists');
                }
            }
            throw error;
        }
        // Unreachable
        return mapRowToUser({
            id: -1,
            email: '',
            password_hash: '',
            display_name: '',
            created_at: now,
            updated_at: now
        });
    }
}
