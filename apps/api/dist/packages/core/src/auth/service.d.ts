import { PasswordHasher, TokenService, UserRepository } from './ports.js';
import { AuthResult, PublicUser } from './types.js';
export interface RegisterInput {
    email: string;
    password: string;
    displayName: string;
}
export interface LoginInput {
    email: string;
    password: string;
}
export interface AuthService {
    register(input: RegisterInput): Promise<AuthResult>;
    login(input: LoginInput): Promise<AuthResult>;
    refreshToken(token: string): Promise<AuthResult>;
    getUser(userId: number): Promise<PublicUser | null>;
}
export interface AuthServiceDependencies {
    users: UserRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
}
export declare function createAuthService(deps: AuthServiceDependencies): AuthService;
