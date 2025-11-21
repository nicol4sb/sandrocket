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
            subject: payload.userId
        };
        return jwt.sign(payload, this.secret, options);
    }
}
