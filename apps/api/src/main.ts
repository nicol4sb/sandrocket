import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  AuthError,
  AuthResult,
  PublicUser,
  createAuthService
} from '@sandrocket/core';
import {
  AppConfig,
  BcryptPasswordHasher,
  JwtTokenService,
  SqliteUserRepository,
  initializeSqliteDatabase,
  loadConfig
} from '@sandrocket/infrastructure';
import {
  HealthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
  loginRequestSchema,
  registerRequestSchema
} from '@sandrocket/contracts';
import { z } from 'zod';

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
app.use(
  cors({
    origin:
      config.server.corsAllowList.length > 0
        ? config.server.corsAllowList
        : config.frontend.origin ?? true,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

app.get('/healthz', (_req, res) => {
  const body: HealthResponse = { status: 'ok' };
  res.json(body);
});

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const payload = parseBody<RegisterRequest>(registerRequestSchema, req, res);
    if (!payload) {
      return;
    }

    const result = await authService.register(payload);
    respondWithAuthSuccess(res, result, config, 201);
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const payload = parseBody<LoginRequest>(loginRequestSchema, req, res);
    if (!payload) {
      return;
    }

    const result = await authService.login(payload);
    respondWithAuthSuccess(res, result, config, 200);
  })
);

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..', '..', '..');
const frontendDistDir = join(repoRoot, 'apps', 'web', 'dist');
const hasFrontendBundle = existsSync(frontendDistDir);

if (hasFrontendBundle) {
  app.use(express.static(frontendDistDir));
}

const { port } = config.server;

app.listen(port, () => {
  console.log(`[api] listening on port ${port}`);
  if (!hasFrontendBundle) {
    console.warn(
      '[api] frontend bundle not found. Run `npm run build --workspace apps/web` to generate assets.'
    );
  }
});

if (hasFrontendBundle) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(resolve(frontendDistDir, 'index.html'));
  });
}

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (error instanceof AuthError) {
      if (error.code === 'auth/user-already-exists' || error.code === 'auth/display-name-already-exists') {
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
  }
);

function parseBody<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  req: Request,
  res: Response
): T | undefined {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => {
      const fieldName = issue.path.join('.') || 'field';
      return `${fieldName}: ${issue.message}`;
    });
    const errorMessage = `Validation failed: ${fieldErrors.join(', ')}`;
    
    res.status(400).json({
      error: 'validation-error',
      message: errorMessage
    });
    return undefined;
  }

  return parsed.data;
}

function respondWithAuthSuccess(
  res: Response,
  result: AuthResult,
  currentConfig: AppConfig,
  status: number
) {
  setAuthCookie(res, result.token, currentConfig);
  res.status(status).json({
    token: result.token,
    user: toUserResponse(result.user)
  });
}

function toUserResponse(user: PublicUser): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function setAuthCookie(res: Response, token: string, currentConfig: AppConfig) {
  res.cookie(currentConfig.security.sessionCookieName, token, {
    httpOnly: true,
    secure: currentConfig.security.sessionCookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

