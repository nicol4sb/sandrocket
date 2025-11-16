import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { AuthError, createAuthService } from '@sandrocket/core';
import { BcryptPasswordHasher, JwtTokenService, SqliteUserRepository, initializeSqliteDatabase, loadConfig } from '@sandrocket/infrastructure';
import { createProjectService } from '@sandrocket/core';
import { SqliteProjectRepository, SqliteEpicRepository } from '@sandrocket/infrastructure';
import { createProjectRequestSchema } from '@sandrocket/contracts';
import { createEpicService } from '@sandrocket/core';
import { createEpicRequestSchema } from '@sandrocket/contracts';
import { createTaskService } from '@sandrocket/core';
import { SqliteTaskRepository } from '@sandrocket/infrastructure';
import { createTaskRequestSchema, updateTaskRequestSchema } from '@sandrocket/contracts';
import { loginRequestSchema, registerRequestSchema } from '@sandrocket/contracts';
const config = loadConfig();
const database = initializeSqliteDatabase({
    filename: config.database.filename
});
const tokenService = new JwtTokenService({
    secret: config.security.jwtSecret,
    issuer: 'sandrocket',
    expiresIn: '7d'
});
const authService = createAuthService({
    users: new SqliteUserRepository(database),
    passwordHasher: new BcryptPasswordHasher(),
    tokenService
});
const projectService = createProjectService({
    projects: new SqliteProjectRepository(database)
});
const epicService = createEpicService({
    epics: new SqliteEpicRepository(database)
});
const taskService = createTaskService({
    tasks: new SqliteTaskRepository(database)
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
// Tasks API
app.get('/api/epics/:epicId/tasks', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params;
    const tasks = await taskService.listTasks(epicId);
    const body = {
        tasks: tasks.map((t) => ({
            id: t.id,
            epicId: t.epicId,
            title: t.title,
            description: t.description,
            status: t.status,
            position: t.position,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString()
        }))
    };
    res.json(body);
}));
app.post('/api/epics/:epicId/tasks', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params;
    const body = parseBody(createTaskRequestSchema, req, res);
    if (!body) {
        return;
    }
    const created = await taskService.createTask({
        epicId,
        title: body.title,
        description: body.description ?? null
    });
    const response = {
        id: created.id,
        epicId: created.epicId,
        title: created.title,
        description: created.description,
        status: created.status,
        position: created.position,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
    };
    res.status(201).json(response);
}));
app.patch('/api/tasks/:taskId', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const { taskId } = req.params;
    const body = parseBody(updateTaskRequestSchema, req, res);
    if (!body) {
        return;
    }
    const updated = await taskService.updateTask({
        id: taskId,
        ...body
    });
    if (!updated) {
        res.status(404).json({ error: 'not-found', message: 'Task not found' });
        return;
    }
    const response = {
        id: updated.id,
        epicId: updated.epicId,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        position: updated.position,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
    };
    res.json(response);
}));
// Epics API
app.get('/api/projects/:projectId/epics', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    // Only allow access if user owns the project; for now rely on list projects then fetch epics
    const { projectId } = req.params;
    const epics = await epicService.listEpics(projectId);
    const body = {
        epics: epics.map((e) => ({
            id: e.id,
            projectId: e.projectId,
            name: e.name,
            description: e.description,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString()
        }))
    };
    res.json(body);
}));
app.post('/api/projects/:projectId/epics', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params;
    const body = parseBody(createEpicRequestSchema, req, res);
    if (!body) {
        return;
    }
    const created = await epicService.createEpic({
        projectId,
        name: body.name,
        description: body.description ?? null
    });
    res.status(201).json({
        id: created.id,
        projectId: created.projectId,
        name: created.name,
        description: created.description,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
    });
}));
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const payload = parseBody(loginRequestSchema, req, res);
    if (!payload) {
        return;
    }
    const result = await authService.login(payload);
    respondWithAuthSuccess(res, result, config, 200);
}));
app.post('/api/auth/refresh', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({
            error: 'auth/no-token',
            message: 'No token provided'
        });
        return;
    }
    try {
        const result = await authService.refreshToken(token);
        respondWithAuthSuccess(res, result, config, 200);
    }
    catch (error) {
        if (error instanceof AuthError) {
            res.status(401).json({
                error: error.code,
                message: error.message
            });
            return;
        }
        // Handle token verification errors (expired, invalid, etc.)
        if (error instanceof Error && error.message.includes('Token')) {
            res.status(401).json({
                error: 'auth/invalid-token',
                message: error.message
            });
            return;
        }
        throw error;
    }
}));
app.post('/api/auth/logout', (_req, res) => {
    // Clear the auth cookie
    res.clearCookie(config.security.sessionCookieName, {
        httpOnly: true,
        secure: config.security.sessionCookieSecure,
        sameSite: 'lax',
        path: '/'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});
// Auth middleware to extract current user from cookie
async function requireAuth(req, res, next) {
    try {
        const token = req.cookies[config.security.sessionCookieName];
        if (!token) {
            res.status(401).json({ error: 'auth/no-token', message: 'No token' });
            return;
        }
        const payload = await tokenService.verifyToken(token);
        req.userId = payload.userId;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'auth/invalid-token', message: 'Invalid or expired token' });
    }
}
// Projects API
app.get('/api/projects', asyncHandler(async (req, res) => {
    // Use optional auth: if token present, list for user; else deny
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const projects = await projectService.listProjects(payload.userId);
    const body = {
        projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString()
        }))
    };
    res.json(body);
}));
app.post('/api/projects', asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
        res.status(401).json({ error: 'auth/no-token', message: 'No token' });
        return;
    }
    const payload = await tokenService.verifyToken(token);
    const body = parseBody(createProjectRequestSchema, req, res);
    if (!body) {
        return;
    }
    const created = await projectService.createProject({
        ownerUserId: payload.userId,
        name: body.name,
        description: body.description ?? null
    });
    res.status(201).json({
        id: created.id,
        name: created.name,
        description: created.description,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
    });
}));
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
        console.warn('[api] frontend bundle not found. Run `npm run build --workspace apps/web` to generate assets.');
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
app.use((error, _req, res, _next) => {
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
});
function parseBody(schema, req, res) {
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
