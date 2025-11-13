import { PasswordHasher, TokenService, UserRepository } from './ports';
import { AuthResult, PublicUser } from './types';
export interface RegisterInput {
    email: string;
    password: string;
    displayName?: string | null;
}
export interface LoginInput {
    email: string;
    password: string;
}
export interface AuthService {
    register(input: RegisterInput): Promise<AuthResult>;
    login(input: LoginInput): Promise<AuthResult>;
    getUser(userId: string): Promise<PublicUser | null>;
}
export interface AuthServiceDependencies {
    users: UserRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
}
export declare function createAuthService(deps: AuthServiceDependencies): AuthService;
