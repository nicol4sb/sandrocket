import bcrypt from 'bcryptjs';
export class BcryptPasswordHasher {
    constructor(options = {}) {
        this.saltRounds = options.saltRounds ?? 12;
    }
    async hash(password) {
        return bcrypt.hash(password, this.saltRounds);
    }
    async verify(password, passwordHash) {
        return bcrypt.compare(password, passwordHash);
    }
}
