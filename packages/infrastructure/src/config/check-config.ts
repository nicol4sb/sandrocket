import process from 'node:process';
import { loadConfig } from './load-config';

try {
  const config = loadConfig();
  const summary = {
    env: config.env,
    server: {
      host: config.server.host,
      port: config.server.port,
      corsAllowList: config.server.corsAllowList
    },
    database: config.database,
    auth: {
      provider: config.auth.provider,
      useEmulator: config.auth.useEmulator,
      hasFirebaseConfig: Boolean(config.auth.firebase),
      hasAdminCredentialsPath: Boolean(config.auth.adminCredentialsPath)
    },
    frontend: config.frontend,
    security: {
      sessionCookieName: config.security.sessionCookieName,
      sessionCookieSecure: config.security.sessionCookieSecure
    }
  };

  console.log('Configuration loaded successfully:');
  console.dir(summary, { depth: null, colors: true });
} catch (error) {
  console.error('Failed to load configuration.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

