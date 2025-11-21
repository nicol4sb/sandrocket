// Simple production launcher: runs the API using tsx (works better with workspace dependencies)
// Requirements:
// - Source files must be present (apps/api/src/main.ts)
// - Frontend must be built: `npm run build --workspace apps/web`
// - Place your .env next to this file (repo root)
// - tsx must be installed (it's a devDependency, but needed for production)

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Load environment variables
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch {
  // dotenv might not be installed in production, that's fine if not needed
}

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure we're running from the correct directory
const repoRoot = resolve(__dirname);
process.chdir(repoRoot);

// Check if source file exists
const sourceEntry = resolve(repoRoot, 'apps/api/src/main.ts');
if (!existsSync(sourceEntry)) {
  console.error('[server] API source not found at apps/api/src/main.ts');
  console.error('[server] Source files must be present on the server');
  process.exit(1);
}

// Check if tsx is available
const tsxPath = resolve(repoRoot, 'node_modules/.bin/tsx');
if (!existsSync(tsxPath)) {
  console.error('[server] tsx not found. Run: npm install');
  process.exit(1);
}

// Spawn tsx to run the TypeScript source
// tsx handles workspace module resolution correctly
const tsx = spawn('node', [tsxPath, sourceEntry], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: process.env
});

tsx.on('error', (err) => {
  console.error('[server] Failed to start API:', err);
  process.exit(1);
});

tsx.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle process signals
process.on('SIGTERM', () => {
  tsx.kill('SIGTERM');
});
process.on('SIGINT', () => {
  tsx.kill('SIGINT');
});


