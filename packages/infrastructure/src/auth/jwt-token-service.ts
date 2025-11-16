import jwt, { JwtPayload, Secret, SignOptions, VerifyOptions } from 'jsonwebtoken';
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

  async verifyToken(token: string): Promise<AuthTokenPayload> {
    const options: VerifyOptions = {
      issuer: this.issuer
    };

    try {
      const decoded = jwt.verify(token, this.secret, options) as JwtPayload;
      
      if (!decoded.userId || !decoded.email) {
        throw new Error('Invalid token payload');
      }

      return {
        userId: decoded.userId as string,
        email: decoded.email as string
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
}

