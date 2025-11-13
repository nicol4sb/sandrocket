import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload, TokenService } from '@sandrocket/core';

export interface JwtTokenServiceOptions {
  secret: string;
  expiresIn?: SignOptions['expiresIn'];
  issuer?: string;
}

export class JwtTokenService implements TokenService {
  private readonly secret: Secret;
  private readonly expiresIn: SignOptions['expiresIn'];
  private readonly issuer?: string;

  constructor(options: JwtTokenServiceOptions) {
    this.secret = options.secret;
    this.expiresIn = (options.expiresIn ?? '7d') as SignOptions['expiresIn'];
    this.issuer = options.issuer;
  }

  async createToken(payload: AuthTokenPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      subject: payload.userId
    };

    return jwt.sign(payload, this.secret, options);
  }
}

