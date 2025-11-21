import jwt from 'jsonwebtoken';
export class JwtTokenService {
    constructor(options) {
        this.secret = options.secret;
        this.expiresIn = (options.expiresIn ?? '7d');
        this.issuer = options.issuer;
    }
    async createToken(payload) {
        const options = {
            expiresIn: this.expiresIn,
            issuer: this.issuer,
            subject: String(payload.userId)
        };
        return jwt.sign(payload, this.secret, options);
    }
    async verifyToken(token) {
        const options = {
            issuer: this.issuer
        };
        try {
            const decoded = jwt.verify(token, this.secret, options);
            if (decoded.userId === undefined || decoded.email === undefined) {
                throw new Error('Invalid token payload');
            }
            return {
                userId: Number(decoded.userId),
                email: decoded.email
            };
        }
        catch (error) {
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
