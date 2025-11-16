import { Database } from 'better-sqlite3';
export interface SqliteOptions {
    filename: string;
}
export declare function initializeSqliteDatabase(options: SqliteOptions): Database;
