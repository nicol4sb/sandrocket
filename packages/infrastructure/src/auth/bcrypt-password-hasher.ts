import bcrypt from 'bcryptjs';
import { PasswordHasher } from '@sandrocket/core';

export interface BcryptPasswordHasherOptions {
  saltRounds?: number;
}

export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number;

  constructor(options: BcryptPasswordHasherOptions = {}) {
    this.saltRounds = options.saltRounds ?? 12;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}

