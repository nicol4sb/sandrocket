import { AuthError } from './errors';
import { PasswordHasher, TokenService, UserRepository } from './ports';
import { AuthResult, PublicUser, User } from './types';

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
  getUser(userId: string): Promise<PublicUser | null>;
}

export interface AuthServiceDependencies {
  users: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

class AuthServiceImpl implements AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase();
    const existing = await this.deps.users.findByEmail(normalizedEmail);

    if (existing) {
      throw new AuthError(
        'auth/user-already-exists',
        `User with email ${normalizedEmail} already exists`
      );
    }

    // Check for duplicate display name (if repository supports it)
    const repository = this.deps.users as { findByDisplayName?: (name: string) => Promise<User | null> };
    if (repository.findByDisplayName) {
      const existingByDisplayName = await repository.findByDisplayName(input.displayName);
      
      if (existingByDisplayName) {
        throw new AuthError(
          'auth/display-name-already-exists',
          `Display name "${input.displayName}" is already taken`
        );
      }
    }

    const passwordHash = await this.deps.passwordHasher.hash(input.password);
    const created = await this.deps.users.create({
      email: normalizedEmail,
      passwordHash,
      displayName: input.displayName
    });

    const token = await this.deps.tokenService.createToken({
      userId: created.id,
      email: created.email
    });

    return { token, user: toPublicUser(created) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase();
    const user = await this.deps.users.findByEmail(normalizedEmail);

    if (!user) {
      throw new AuthError(
        'auth/user-not-found',
        `No user found for email ${normalizedEmail}`
      );
    }

    const isValid = await this.deps.passwordHasher.verify(
      input.password,
      user.passwordHash
    );

    if (!isValid) {
      throw new AuthError('auth/invalid-credentials', 'Invalid credentials');
    }

    const token = await this.deps.tokenService.createToken({
      userId: user.id,
      email: user.email
    });

    return { token, user: toPublicUser(user) };
  }

  async refreshToken(token: string): Promise<AuthResult> {
    // Verify the token (will throw if invalid or expired)
    const payload = await this.deps.tokenService.verifyToken(token);

    // Fetch the user to ensure they still exist
    const user = await this.deps.users.findById(payload.userId);
    if (!user) {
      throw new AuthError('auth/user-not-found', 'User not found');
    }

    // Generate a new token
    const newToken = await this.deps.tokenService.createToken({
      userId: user.id,
      email: user.email
    });

    return { token: newToken, user: toPublicUser(user) };
  }

  async getUser(userId: string): Promise<PublicUser | null> {
    const user = await this.deps.users.findById(userId);
    return user ? toPublicUser(user) : null;
  }
}

export function createAuthService(deps: AuthServiceDependencies): AuthService {
  return new AuthServiceImpl(deps);
}

