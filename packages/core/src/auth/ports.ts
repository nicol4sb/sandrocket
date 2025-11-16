import { AuthTokenPayload, CreateUserInput, User } from './types';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUserInput): Promise<User>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface TokenService {
  createToken(payload: AuthTokenPayload): Promise<string>;
  verifyToken(token: string): Promise<AuthTokenPayload>;
}

