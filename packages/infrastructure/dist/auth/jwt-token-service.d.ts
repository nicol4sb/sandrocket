import { SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload, TokenService } from '@sandrocket/core';
export interface JwtTokenServiceOptions {
    secret: string;
    expiresIn?: SignOptions['expiresIn'];
    issuer?: string;
}
export declare class JwtTokenService implements TokenService {
    private readonly secret;
    private readonly expiresIn;
    private readonly issuer?;
    constructor(options: JwtTokenServiceOptions);
    createToken(payload: AuthTokenPayload): Promise<string>;
    verifyToken(token: string): Promise<AuthTokenPayload>;
}
