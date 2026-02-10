import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import archiver from 'archiver';
import PDFDocument from 'pdfkit';
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
  createProjectService,
  createInvitationService
} from '@sandrocket/core';
import {
  SqliteProjectRepository,
  SqliteProjectMemberRepository,
  SqliteProjectInvitationRepository,
  SqliteEpicRepository,
  SqliteDocumentRepository,
  SqliteDocumentActivityRepository
} from '@sandrocket/infrastructure';
import {
  CreateProjectRequest,
  ListProjectsResponse,
  UpdateProjectRequest,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  InvitationResponse,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  createInvitationRequestSchema,
  acceptInvitationRequestSchema
} from '@sandrocket/contracts';
import { createEpicService, createDocumentService } from '@sandrocket/core';
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
import type { ListDocumentsResponse, DocumentResponse, DocumentActivityResponse } from '@sandrocket/contracts';
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
const projectRepository = new SqliteProjectRepository(database);
const projectMemberRepository = new SqliteProjectMemberRepository(database);
const projectInvitationRepository = new SqliteProjectInvitationRepository(database);
const projectService = createProjectService({
  projects: projectRepository,
  members: projectMemberRepository
});
const invitationService = createInvitationService({
  invitations: projectInvitationRepository,
  members: projectMemberRepository,
  projects: projectRepository
});
const epicService = createEpicService({
  epics: new SqliteEpicRepository(database)
});
const taskService = createTaskService({
  tasks: new SqliteTaskRepository(database)
});
const documentRepository = new SqliteDocumentRepository(database);
const documentActivityRepository = new SqliteDocumentActivityRepository(database);
const documentService = createDocumentService({
  documents: documentRepository,
  activity: documentActivityRepository,
  config: {
    uploadDir: config.uploads.dir,
    maxFileSizeBytes: config.uploads.maxFileSizeBytes,
    maxProjectStorageBytes: config.uploads.maxProjectStorageBytes
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxFileSizeBytes }
});

// Simple in-memory user display name cache for document responses
const userDisplayNameCache = new Map<number, string>();
async function getUserDisplayName(userId: number): Promise<string> {
  if (userDisplayNameCache.has(userId)) {
    return userDisplayNameCache.get(userId)!;
  }
  const user = await authService.getUser(userId);
  const name = user?.displayName ?? 'Unknown';
  userDisplayNameCache.set(userId, name);
  return name;
}

const app = express();

// Configure CSP: allow unsafe-inline only in development (for Vite HMR)
// In production, Vite is configured to not use inline scripts (modulePreload.polyfill: false)
const isDevelopment = process.env.NODE_ENV !== 'production';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Only allow unsafe-inline in development (Vite HMR needs it)
        // Production builds should have no inline scripts after disabling modulePreload polyfill
        ...(isDevelopment ? ["'unsafe-inline'"] : [])
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // CSS-in-JS may need this
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
// Block all crawlers and AI bots
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});
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
        updatedAt: p.updatedAt.toISOString(),
        role: p.role
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
        updatedAt: created.updatedAt.toISOString(),
        role: created.role
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
    }, payload.userId);
    if (!updated) {
      res.status(404).json({ error: 'not-found', message: 'Project not found' });
      return;
    }
    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      role: updated.role
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
    try {
      const deleted = await projectService.deleteProject(projectIdNum, payload.userId);
      if (!deleted) {
        res.status(404).json({ error: 'not-found', message: 'Project not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Only project owners')) {
        res.status(403).json({ error: 'forbidden', message: error.message });
        return;
      }
      throw error;
    }
  })
);

// Invitation endpoints
app.post(
  '/api/projects/:projectId/invitations',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);
    try {
      // Set expiration to 5 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      
      const invitation = await invitationService.createInvitation({
        projectId: projectIdNum,
        createdByUserId: payload.userId,
        expiresAt
      });
      const response: InvitationResponse = {
        id: invitation.id,
        projectId: invitation.projectId,
        token: invitation.token,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt ? invitation.expiresAt.toISOString() : null
      };
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only project owners')) {
          res.status(403).json({ error: 'forbidden', message: error.message });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({ error: 'not-found', message: error.message });
          return;
        }
      }
      throw error;
    }
  })
);

app.post(
  '/api/invitations/accept',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const body = parseBody<AcceptInvitationRequest>(acceptInvitationRequestSchema, req, res);
    if (!body) {
      return;
    }
    try {
      await invitationService.acceptInvitation({
        token: body.token,
        userId: payload.userId
      });
      res.status(200).json({ message: 'Invitation accepted' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({ error: 'invalid-invitation', message: error.message });
          return;
        }
      }
      throw error;
    }
  })
);

app.get(
  '/api/invitations/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params as { token: string };
    const invitation = await invitationService.getInvitationByToken(token);
    if (!invitation) {
      res.status(404).json({ error: 'not-found', message: 'Invitation not found or expired' });
      return;
    }
    const response: InvitationResponse = {
      id: invitation.id,
      projectId: invitation.projectId,
      token: invitation.token,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt ? invitation.expiresAt.toISOString() : null
    };
    res.json(response);
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

// Documents API
app.post(
  '/api/projects/:projectId/documents',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);

    // Verify membership
    const member = await projectMemberRepository.findByProjectAndUser(projectIdNum, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'validation-error', message: 'No file provided' });
      return;
    }

    // Multer decodes multipart filenames as Latin-1; re-decode as UTF-8
    // so accented characters (éàè etc.) are preserved correctly.
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    try {
      const doc = await documentService.upload(projectIdNum, payload.userId, {
        originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size
      });
      const uploaderName = await getUserDisplayName(payload.userId);
      const response: DocumentResponse = {
        id: doc.id,
        projectId: doc.projectId,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        uploaderUserId: doc.uploaderUserId,
        uploaderDisplayName: uploaderName,
        createdAt: doc.createdAt.toISOString()
      };
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('limit') || error.message.includes('exceeds'))) {
        res.status(413).json({ error: 'file-too-large', message: error.message });
        return;
      }
      throw error;
    }
  })
);

app.get(
  '/api/projects/:projectId/documents',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { projectId } = req.params as { projectId: string };
    const projectIdNum = Number(projectId);

    const member = await projectMemberRepository.findByProjectAndUser(projectIdNum, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    const { documents, totalSizeBytes } = await documentService.list(projectIdNum);
    const activity = await documentService.getActivity(projectIdNum);

    const documentResponses: DocumentResponse[] = await Promise.all(
      documents.map(async (doc) => ({
        id: doc.id,
        projectId: doc.projectId,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        uploaderUserId: doc.uploaderUserId,
        uploaderDisplayName: await getUserDisplayName(doc.uploaderUserId),
        createdAt: doc.createdAt.toISOString()
      }))
    );

    const activityResponses: DocumentActivityResponse[] = await Promise.all(
      activity.map(async (a) => ({
        id: a.id,
        action: a.action,
        filename: a.filename,
        userDisplayName: await getUserDisplayName(a.userId),
        createdAt: a.createdAt.toISOString()
      }))
    );

    const body: ListDocumentsResponse = {
      documents: documentResponses,
      activity: activityResponses,
      totalSizeBytes,
      maxSizeBytes: config.uploads.maxProjectStorageBytes
    };
    res.json(body);
  })
);

app.get(
  '/api/documents/:documentId/view',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { documentId } = req.params as { documentId: string };
    const result = await documentService.getFile(Number(documentId));
    if (!result) {
      res.status(404).json({ error: 'not-found', message: 'Document not found' });
      return;
    }

    const member = await projectMemberRepository.findByProjectAndUser(result.document.projectId, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    res.setHeader('Content-Type', result.document.mimeType);
    const asciiName = result.document.originalFilename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(result.document.originalFilename)}`);
    res.sendFile(resolve(result.filePath));
  })
);

app.get(
  '/api/documents/:documentId/download',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { documentId } = req.params as { documentId: string };
    const result = await documentService.getFile(Number(documentId));
    if (!result) {
      res.status(404).json({ error: 'not-found', message: 'Document not found' });
      return;
    }

    const member = await projectMemberRepository.findByProjectAndUser(result.document.projectId, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    res.setHeader('Content-Type', result.document.mimeType);
    const asciiName = result.document.originalFilename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(result.document.originalFilename)}`);
    res.sendFile(resolve(result.filePath));
  })
);

app.delete(
  '/api/documents/:documentId',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const { documentId } = req.params as { documentId: string };
    const docId = Number(documentId);

    // Get the document to check project membership
    const result = await documentService.getFile(docId);
    if (!result) {
      res.status(404).json({ error: 'not-found', message: 'Document not found' });
      return;
    }

    const member = await projectMemberRepository.findByProjectAndUser(result.document.projectId, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    const deleted = await documentService.deleteDocument(docId, payload.userId);
    if (!deleted) {
      res.status(404).json({ error: 'not-found', message: 'Document not found' });
      return;
    }
    res.status(204).send();
  })
);

// ── Project export (zip with PDF summary + all documents) ───────────
app.get(
  '/api/projects/:projectId/export',
  asyncHandler(async (req, res) => {
    const token = req.cookies[config.security.sessionCookieName];
    if (!token) {
      res.status(401).json({ error: 'auth/no-token', message: 'No token' });
      return;
    }
    const payload = await tokenService.verifyToken(token);
    const projectId = Number(req.params.projectId);

    const member = await projectMemberRepository.findByProjectAndUser(projectId, payload.userId);
    if (!member) {
      res.status(403).json({ error: 'forbidden', message: 'Not a member of this project' });
      return;
    }

    const project = await projectRepository.findById(projectId);
    if (!project) {
      res.status(404).json({ error: 'not-found', message: 'Project not found' });
      return;
    }

    // Gather data
    const epics = await epicService.listEpics(projectId);
    const epicTasks = await Promise.all(
      epics.map(async (epic) => ({
        epic,
        tasks: await taskService.listTasks(epic.id)
      }))
    );
    const documents = await documentRepository.listByProject(projectId);

    // Resolve user display names for tasks
    const userIds = new Set<number>();
    for (const { tasks } of epicTasks) {
      for (const t of tasks) {
        userIds.add(t.creatorUserId);
      }
    }
    const userNames = new Map<number, string>();
    for (const uid of userIds) {
      userNames.set(uid, await getUserDisplayName(uid));
    }

    // Sanitize project name for filename
    const safeName = project.name.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim() || 'project';

    // Set response headers
    const zipFilename = `${safeName}-backup.zip`;
    const asciiFilename = zipFilename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`);

    // Create zip archive streamed to response
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', (err) => {
      console.error('[export] archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'export-failed', message: 'Export failed' });
      }
    });
    archive.pipe(res);

    // ── Generate PDF summary ──────────────────────────────────────────
    const pdfBuffer = await new Promise<Buffer>((resolvePromise, rejectPromise) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
      doc.on('error', rejectPromise);

      // Title
      doc.fontSize(22).font('Helvetica-Bold').text(project.name, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text(`Exported on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
      doc.moveDown(1.5);

      if (project.description) {
        doc.fontSize(11).font('Helvetica').fillColor('#333333').text(project.description);
        doc.moveDown(1);
      }

      const statusLabels: Record<string, string> = {
        backlog: 'Backlog',
        in_progress: 'In Progress',
        done: 'Done'
      };
      const statusOrder = ['backlog', 'in_progress', 'done'];

      for (const { epic, tasks } of epicTasks) {
        // Epic header
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(epic.name);
        if (epic.description) {
          doc.moveDown(0.2);
          doc.fontSize(10).font('Helvetica').fillColor('#555555').text(epic.description);
        }
        doc.moveDown(0.5);

        if (tasks.length === 0) {
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999').text('No tasks');
          doc.moveDown(1);
          continue;
        }

        // Group tasks by status
        const grouped = new Map<string, typeof tasks>();
        for (const s of statusOrder) {
          const matching = tasks.filter((t) => t.status === s);
          if (matching.length > 0) grouped.set(s, matching);
        }

        for (const [status, statusTasks] of grouped) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
            .text(`${statusLabels[status] ?? status} (${statusTasks!.length})`, { indent: 10 });
          doc.moveDown(0.2);

          for (const task of statusTasks!) {
            const creator = userNames.get(task.creatorUserId) ?? 'Unknown';
            const created = new Date(task.createdAt).toLocaleDateString('en-GB');
            const updated = new Date(task.updatedAt).toLocaleDateString('en-GB');

            doc.fontSize(10).font('Helvetica').fillColor('#000000')
              .text(`• ${task.description}`, { indent: 20 });
            doc.fontSize(8).font('Helvetica').fillColor('#888888')
              .text(`  By ${creator} · Created ${created} · Updated ${updated}`, { indent: 20 });
            doc.moveDown(0.3);
          }
          doc.moveDown(0.3);
        }

        doc.moveDown(0.5);
      }

      // Documents section
      if (documents.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Documents');
        doc.moveDown(0.3);
        for (const d of documents) {
          const uploaded = new Date(d.createdAt).toLocaleDateString('en-GB');
          doc.fontSize(10).font('Helvetica').fillColor('#000000')
            .text(`• ${d.originalFilename}`, { indent: 10 });
          doc.fontSize(8).font('Helvetica').fillColor('#888888')
            .text(`  ${(d.sizeBytes / 1024).toFixed(0)} KB · Uploaded ${uploaded}`, { indent: 10 });
          doc.moveDown(0.2);
        }
      }

      doc.end();
    });

    archive.append(pdfBuffer, { name: `${safeName}-backup/project-summary.pdf` });

    // ── Add document files ────────────────────────────────────────────
    const projectDocDir = join(config.uploads.dir, String(projectId));
    for (const d of documents) {
      const filePath = join(projectDocDir, d.storedFilename);
      if (existsSync(filePath)) {
        archive.file(filePath, { name: `${safeName}-backup/documents/${d.originalFilename}` });
      }
    }

    await archive.finalize();
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

