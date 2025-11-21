export interface User {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserInput {
    email: string;
    passwordHash: string;
    displayName?: string | null;
}
export interface PublicUser {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthTokenPayload {
    userId: string;
    email: string;
}
export interface AuthResult {
    token: string;
    user: PublicUser;
}
