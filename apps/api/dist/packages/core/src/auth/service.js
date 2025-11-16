import { AuthError } from './errors';
function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}
class AuthServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async register(input) {
        const normalizedEmail = input.email.toLowerCase();
        const existing = await this.deps.users.findByEmail(normalizedEmail);
        if (existing) {
            throw new AuthError('auth/user-already-exists', `User with email ${normalizedEmail} already exists`);
        }
        // Check for duplicate display name (if repository supports it)
        const repository = this.deps.users;
        if (repository.findByDisplayName) {
            const existingByDisplayName = await repository.findByDisplayName(input.displayName);
            if (existingByDisplayName) {
                throw new AuthError('auth/display-name-already-exists', `Display name "${input.displayName}" is already taken`);
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
    async login(input) {
        const normalizedEmail = input.email.toLowerCase();
        const user = await this.deps.users.findByEmail(normalizedEmail);
        if (!user) {
            throw new AuthError('auth/user-not-found', `No user found for email ${normalizedEmail}`);
        }
        const isValid = await this.deps.passwordHasher.verify(input.password, user.passwordHash);
        if (!isValid) {
            throw new AuthError('auth/invalid-credentials', 'Invalid credentials');
        }
        const token = await this.deps.tokenService.createToken({
            userId: user.id,
            email: user.email
        });
        return { token, user: toPublicUser(user) };
    }
    async refreshToken(token) {
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
    async getUser(userId) {
        const user = await this.deps.users.findById(userId);
        return user ? toPublicUser(user) : null;
    }
}
export function createAuthService(deps) {
    return new AuthServiceImpl(deps);
}
