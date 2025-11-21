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
        const passwordHash = await this.deps.passwordHasher.hash(input.password);
        const created = await this.deps.users.create({
            email: normalizedEmail,
            passwordHash,
            displayName: input.displayName ?? null
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
    async getUser(userId) {
        const user = await this.deps.users.findById(userId);
        return user ? toPublicUser(user) : null;
    }
}
export function createAuthService(deps) {
    return new AuthServiceImpl(deps);
}
