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
  createProjectService
} from '@sandrocket/core';
import {
  SqliteProjectRepository,
  SqliteEpicRepository
} from '@sandrocket/infrastructure';
import {
  CreateProjectRequest,
  ListProjectsResponse,
  UpdateProjectRequest,
  createProjectRequestSchema,
  updateProjectRequestSchema
} from '@sandrocket/contracts';
import { createEpicService } from '@sandrocket/core';
import { CreateEpicRequest, ListEpicsResponse, UpdateEpicRequest, createEpicRequestSchema, updateEpicRequestSchema } from '@sandrocket/contracts';
import {
  createTaskService
} from '@sandrocket/core';
import {
  SqliteTaskRepository
} from '@sandrocket/infrastructure';
import {
  CreateTaskRequest,
  ListTasksResponse,
  ReorderTaskRequest,
  TaskResponse,
  UpdateTaskRequest,
  createTaskRequestSchema,
  reorderTaskRequestSchema,
  updateTaskRequestSchema
} from '@sandrocket/contracts';
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

const tokenService = new JwtTokenService({
  secret: config.security.jwtSecret,
  issuer: 'sandrocket',
  expiresIn: '20d'
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

// Tasks API
app.get(
  '/api/epics/:epicId/tasks',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params as { epicId: string };
    const epicIdNum = Number(epicId);
    const tasks = await taskService.listTasks(epicIdNum);
    const body: ListTasksResponse = {
      tasks: tasks.map((t) => ({
        id: t.id,
        epicId: t.epicId,
        creatorUserId: t.creatorUserId,
        description: t.description,
        status: t.status,
        position: t.position,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastEditedByUserId: t.lastEditedByUserId
      }))
    };
    res.json(body);
  })
);

app.post(
  '/api/epics/:epicId/tasks',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params as { epicId: string };
    const epicIdNum = Number(epicId);
    const body = parseBody<CreateTaskRequest>(createTaskRequestSchema, req, res);
    if (!body) {
      return;
    }
    const created = await taskService.createTask({
      epicId: epicIdNum,
      creatorUserId: payload.userId,
      description: body.description
    });
    const response: TaskResponse = {
      id: created.id,
      epicId: created.epicId,
      creatorUserId: created.creatorUserId,
      description: created.description,
      status: created.status,
      position: created.position,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      lastEditedByUserId: created.lastEditedByUserId
    };
    res.status(201).json(response);
  })
);

app.patch(
  '/api/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { taskId } = req.params as { taskId: string };
    const taskIdNum = Number(taskId);
    const body = parseBody<UpdateTaskRequest>(updateTaskRequestSchema, req, res);
    if (!body) {
      return;
    }
    const updated = await taskService.updateTask({
      id: taskIdNum,
      ...body,
      lastEditedByUserId: payload.userId
    });
    if (!updated) {
      res.status(404).json({ error: 'not-found', message: 'Task not found' });
      return;
    }
    const response: TaskResponse = {
      id: updated.id,
      epicId: updated.epicId,
      creatorUserId: updated.creatorUserId,
      description: updated.description,
      status: updated.status,
      position: updated.position,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastEditedByUserId: updated.lastEditedByUserId
    };
    res.json(response);
  })
);

app.patch(
  '/api/tasks/:taskId/position',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { taskId } = req.params as { taskId: string };
    const taskIdNum = Number(taskId);
    const body = parseBody<ReorderTaskRequest>(reorderTaskRequestSchema, req, res);
    if (!body) {
      return;
    }
    // Use moveTask service method which handles status and position
    const updated = await taskService.moveTask(taskIdNum, body.status, body.position);
    if (!updated) {
      res.status(404).json({ error: 'not-found', message: 'Task not found' });
      return;
    }
    const response: TaskResponse = {
      id: updated.id,
      epicId: updated.epicId,
      creatorUserId: updated.creatorUserId,
      description: updated.description,
      status: updated.status,
      position: updated.position,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastEditedByUserId: updated.lastEditedByUserId
    };
    res.json(response);
  })
);

// Epics API
app.get(
  '/api/projects/:projectId/epics',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    // Only allow access if user owns the project; for now rely on list projects then fetch epics
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);
    const epics = await epicService.listEpics(projectIdNum);
    const body: ListEpicsResponse = {
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
  })
);

app.post(
  '/api/projects/:projectId/epics',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const body = parseBody<CreateEpicRequest>(createEpicRequestSchema, req, res);
    if (!body) {
      return;
    }
    const created = await epicService.createEpic({
      projectId: Number(projectId),
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
  })
);

app.patch(
  '/api/epics/:epicId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params as { epicId: string };
    const epicIdNum = Number(epicId);
    const body = parseBody<UpdateEpicRequest>(updateEpicRequestSchema, req, res);
    if (!body) return;
    const updated = await epicService.updateEpic({ id: epicIdNum, ...body });
    if (!updated) {
      res.status(404).json({ error: 'not-found', message: 'Epic not found' });
      return;
    }
    res.json({
      id: updated.id,
      projectId: updated.projectId,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
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

app.post(
  '/api/auth/refresh',
  asyncHandler(async (req, res) => {
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
    } catch (error) {
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
  })
);

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
async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    (req as unknown as { userId: number }).userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'auth/invalid-token', message: 'Invalid or expired token' });
  }
}

// Projects API
app.get(
  '/api/projects',
  asyncHandler(async (req, res) => {
    // Use optional auth: if token present, list for user; else deny
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const projects = await projectService.listProjects(payload.userId);
    const body: ListProjectsResponse = {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      }))
    };
    res.json(body);
  })
);

app.post(
  '/api/projects',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const body = parseBody<CreateProjectRequest>(createProjectRequestSchema, req, res);
    if (!body) {
      return;
    }
    try {
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error creating project:', err);
      res.status(500).json({ 
        error: 'internal-error', 
        message: err instanceof Error ? err.message : 'Failed to create project' 
      });
    }
  })
);

app.patch(
  '/api/projects/:projectId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);
    const body = parseBody<UpdateProjectRequest>(updateProjectRequestSchema, req, res);
    if (!body) {
      return;
    }
    const updated = await projectService.updateProject({
      id: projectIdNum,
      ...body
    });
    if (!updated) {
      res.status(404).json({ error: 'not-found', message: 'Project not found' });
      return;
    }
    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  })
);

app.delete(
  '/api/projects/:projectId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);
    const deleted = await projectService.deleteProject(projectIdNum);
    if (!deleted) {
      res.status(404).json({ error: 'not-found', message: 'Project not found' });
      return;
    }
    res.status(204).send();
  })
);

app.delete(
  '/api/epics/:epicId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { epicId } = req.params as { epicId: string };
    const epicIdNum = Number(epicId);
    const deleted = await epicService.deleteEpic(epicIdNum);
    if (!deleted) {
      res.status(404).json({ error: 'not-found', message: 'Epic not found' });
      return;
    }
    res.status(204).send();
  })
);

app.delete(
  '/api/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { taskId } = req.params as { taskId: string };
    const taskIdNum = Number(taskId);
    const deleted = await taskService.deleteTask(taskIdNum);
    if (!deleted) {
      res.status(404).json({ error: 'not-found', message: 'Task not found' });
      return;
    }
    res.status(204).send();
  })
);

const moduleDir = dirname(fileURLToPath(import.meta.url));
// When compiled, the path is apps/api/dist/apps/api/src/main.js
// We need to go up 7 levels to get to repo root from: apps/api/dist/apps/api/src
// But also handle the case where it might be at apps/api/dist/main.js (old structure)
let repoRoot: string;
if (moduleDir.includes('apps/api/dist/apps/api/src')) {
  // New compiled structure: apps/api/dist/apps/api/src/main.js
  // Go up 6 levels: src -> api -> apps -> dist -> api -> apps -> repo root
  repoRoot = resolve(moduleDir, '..', '..', '..', '..', '..', '..');
} else if (moduleDir.includes('apps/api/dist') && !moduleDir.includes('apps/api/dist/apps')) {
  // Old structure: apps/api/dist/main.js
  repoRoot = resolve(moduleDir, '..', '..', '..');
} else {
  // Development mode: apps/api/src/main.ts
  repoRoot = resolve(moduleDir, '..', '..', '..');
}
const frontendDistDir = join(repoRoot, 'apps', 'web', 'dist');
const hasFrontendBundle = existsSync(frontendDistDir);

if (hasFrontendBundle) {
  // Serve static assets with long cache; index.html will be no-cache below
  app.use(
    express.static(frontendDistDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );
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

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    maxAge: 1000 * 60 * 60 * 24 * 20 // 20 days
  });
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

