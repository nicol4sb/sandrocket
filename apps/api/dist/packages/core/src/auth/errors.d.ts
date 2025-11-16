export type AuthErrorCode = 'auth/user-already-exists' | 'auth/display-name-already-exists' | 'auth/invalid-credentials' | 'auth/user-not-found';
export declare class AuthError extends Error {
    readonly code: AuthErrorCode;
    constructor(code: AuthErrorCode, message: string);
}
