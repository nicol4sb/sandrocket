import { PasswordHasher } from '@sandrocket/core';
export interface BcryptPasswordHasherOptions {
    saltRounds?: number;
}
export declare class BcryptPasswordHasher implements PasswordHasher {
    private readonly saltRounds;
    constructor(options?: BcryptPasswordHasherOptions);
    hash(password: string): Promise<string>;
    verify(password: string, passwordHash: string): Promise<boolean>;
}
