import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

function findProjectRoot(startPath: string = process.cwd()): string {
  let current = resolve(startPath);
  while (current !== dirname(current)) {
    const packageJsonPath = resolve(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.workspaces) {
          return current;
        }
      } catch {
        // continue searching
      }
    }
    current = dirname(current);
  }
  return process.cwd();
}

export type AuthProvider = 'firebase' | 'firebase-emulator' | 'mock';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  server: {
    host: string;
    port: number;
    baseUrl: string;
    corsAllowList: string[];
  };
  database: {
    filename: string;
  };
  auth: {
    provider: AuthProvider;
    useEmulator: boolean;
    firebase?: FirebaseWebConfig;
    adminCredentialsPath?: string;
  };
  security: {
    jwtSecret: string;
    sessionCookieName: string;
    sessionCookieSecure: boolean;
  };
  frontend: {
    origin?: string;
  };
  uploads: {
    dir: string;
    maxFileSizeBytes: number;
    maxProjectStorageBytes: number;
  };
}

const rawConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(9000),
  HOST: z.string().min(1).default('0.0.0.0'),
  SQLITE_FILENAME: z.string().min(1).default('rocket.db'),
  AUTH_PROVIDER: z.enum(['firebase', 'firebase-emulator', 'mock']).default('mock'),
  USE_FIREBASE_EMULATOR: z.coerce.boolean().optional().default(false),
  FIREBASE_API_KEY: z.string().min(1).optional(),
  FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
  FIREBASE_APP_ID: z.string().min(1).optional(),
  FIREBASE_MEASUREMENT_ID: z.string().min(1).optional(),
  FIREBASE_ADMIN_CREDENTIALS: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-me'),
  SESSION_COOKIE_NAME: z.string().min(1).default('sandrocket_session'),
  SESSION_COOKIE_SECURE: z.coerce.boolean().optional().default(false),
  CORS_ALLOWLIST: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
  UPLOAD_DIR: z.string().min(1).default('uploads/documents'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  MAX_PROJECT_STORAGE_MB: z.coerce.number().positive().default(200)
});

export interface LoadConfigOptions {
  /**
   * Ordered list of env files to evaluate. Later entries override earlier ones.
   * Defaults to ['.env', '.env.local'].
   */
  envFilePaths?: string[];
  /**
   * Provide explicit overrides for process.env values.
   */
  overrides?: Record<string, string | undefined>;
}

const DEFAULT_ENV_FILES = ['.env', '.env.local'];

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const { envFilePaths = DEFAULT_ENV_FILES, overrides = {} } = options;
  const cwd = process.cwd();

  // Load environment files in order so later files override previous values.
  for (const file of envFilePaths) {
    const filePath = resolve(cwd, file);
    if (existsSync(filePath)) {
      loadEnv({ path: filePath, override: true });
    }
  }

  const mergedEnv = { ...process.env, ...overrides };
  const parsed = rawConfigSchema.safeParse(mergedEnv);

  if (!parsed.success) {
    const details = parsed.error.errors
      .map((err) => `${err.path.join('.') || 'value'}: ${err.message}`)
      .join('\n');
    throw new Error(`Invalid configuration\n${details}`);
  }

  const values = parsed.data;

  if (values.AUTH_PROVIDER !== 'mock') {
    const missingKeys = [
      ['FIREBASE_API_KEY', values.FIREBASE_API_KEY],
      ['FIREBASE_AUTH_DOMAIN', values.FIREBASE_AUTH_DOMAIN],
      ['FIREBASE_PROJECT_ID', values.FIREBASE_PROJECT_ID],
      ['FIREBASE_APP_ID', values.FIREBASE_APP_ID]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing Firebase configuration values required for provider "${values.AUTH_PROVIDER}": ${missingKeys.join(
          ', '
        )}`
      );
    }
  }

  if (values.AUTH_PROVIDER === 'firebase' && !values.FIREBASE_ADMIN_CREDENTIALS) {
    throw new Error(
      'FIREBASE_ADMIN_CREDENTIALS must be provided when AUTH_PROVIDER=firebase'
    );
  }

  const corsAllowList = values.CORS_ALLOWLIST
    ? values.CORS_ALLOWLIST.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  const firebaseConfig =
    values.AUTH_PROVIDER === 'mock'
      ? undefined
      : {
          apiKey: values.FIREBASE_API_KEY!,
          authDomain: values.FIREBASE_AUTH_DOMAIN!,
          projectId: values.FIREBASE_PROJECT_ID!,
          storageBucket: values.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: values.FIREBASE_MESSAGING_SENDER_ID,
          appId: values.FIREBASE_APP_ID!,
          measurementId: values.FIREBASE_MEASUREMENT_ID
        };

  return {
    env: values.NODE_ENV,
    server: {
      host: values.HOST,
      port: values.PORT,
      baseUrl: `http://${values.HOST}:${values.PORT}`,
      corsAllowList
    },
    database: {
      filename: values.SQLITE_FILENAME
    },
    auth: {
      provider: values.AUTH_PROVIDER,
      useEmulator: values.USE_FIREBASE_EMULATOR,
      firebase: firebaseConfig,
      adminCredentialsPath: values.FIREBASE_ADMIN_CREDENTIALS
    },
    security: {
      jwtSecret: values.JWT_SECRET,
      sessionCookieName: values.SESSION_COOKIE_NAME,
      sessionCookieSecure: values.SESSION_COOKIE_SECURE
    },
    frontend: {
      origin: values.CLIENT_ORIGIN
    },
    uploads: {
      dir: resolve(findProjectRoot(), values.UPLOAD_DIR),
      maxFileSizeBytes: values.MAX_FILE_SIZE_MB * 1024 * 1024,
      maxProjectStorageBytes: values.MAX_PROJECT_STORAGE_MB * 1024 * 1024
    }
  };
}

