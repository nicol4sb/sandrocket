import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { AuthError, createAuthService } from '@sandrocket/core';
import { BcryptPasswordHasher, JwtTokenService, SqliteUserRepository, initializeSqliteDatabase, loadConfig } from '@sandrocket/infrastructure';
import { loginRequestSchema, registerRequestSchema } from '@sandrocket/contracts';
const config = loadConfig();
const database = initializeSqliteDatabase({
    filename: config.database.filename
});
const authService = createAuthService({
    users: new SqliteUserRepository(database),
    passwordHasher: new BcryptPasswordHasher(),
    tokenService: new JwtTokenService({
        secret: config.security.jwtSecret,
        issuer: 'sandrocket',
        expiresIn: '7d'
    })
});
const app = express();
app.use(helmet());
app.use(cors({
    origin: config.server.corsAllowList.length > 0
        ? config.server.corsAllowList
        : config.frontend.origin ?? true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));
app.get('/healthz', (_req, res) => {
    const body = { status: 'ok' };
    res.json(body);
});
app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const payload = parseBody(registerRequestSchema, req, res);
    if (!payload) {
        return;
    }
    const result = await authService.register(payload);
    respondWithAuthSuccess(res, result, config, 201);
}));
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const payload = parseBody(loginRequestSchema, req, res);
    if (!payload) {
        return;
    }
    const result = await authService.login(payload);
    respondWithAuthSuccess(res, result, config, 200);
}));
const frontendDistDir = join(process.cwd(), 'apps', 'web', 'dist');
const hasFrontendBundle = existsSync(frontendDistDir);
if (hasFrontendBundle) {
    app.use(express.static(frontendDistDir));
}
if (hasFrontendBundle) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            next();
            return;
        }
        res.sendFile(join(frontendDistDir, 'index.html'));
    });
}
app.use((error, _req, res, _next) => {
    void _next;
    if (error instanceof AuthError) {
        if (error.code === 'auth/user-already-exists') {
            res.status(409).json({
                error: error.code,
                message: error.message
            });
            return;
        }
        res.status(401).json({
            error: error.code,
            message: error.message
        });
        return;
    }
    console.error('Unhandled error', error);
    res.status(500).json({
        error: 'internal-error',
        message: 'Something went wrong'
    });
});
const { port } = config.server;
app.listen(port, () => {
    console.log(`[api] listening on port ${port}`);
    if (!hasFrontendBundle) {
        console.warn('[api] frontend bundle not found. Run `npm run build --workspace apps/web` to generate assets.');
    }
});
function parseBody(schema, req, res) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'validation-error',
            message: 'Payload validation failed',
            details: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.') || '(root)',
                message: issue.message
            }))
        });
        return undefined;
    }
    return parsed.data;
}
function respondWithAuthSuccess(res, result, currentConfig, status) {
    setAuthCookie(res, result.token, currentConfig);
    res.status(status).json({
        token: result.token,
        user: toUserResponse(result.user)
    });
}
function toUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
    };
}
function setAuthCookie(res, token, currentConfig) {
    res.cookie(currentConfig.security.sessionCookieName, token, {
        httpOnly: true,
        secure: currentConfig.security.sessionCookieSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });
}
function asyncHandler(handler) {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}
