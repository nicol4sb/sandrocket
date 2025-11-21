import { Database } from 'better-sqlite3';
import { CreateUserInput, User, UserRepository } from '@sandrocket/core';
export declare class SqliteUserRepository implements UserRepository {
    private readonly db;
    private readonly findByIdStmt;
    private readonly findByEmailStmt;
    private readonly insertStmt;
    constructor(db: Database);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(input: CreateUserInput): Promise<User>;
}
