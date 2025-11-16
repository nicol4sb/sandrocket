// Simple production launcher: loads env and runs the compiled API.
// Requirements:
// - Build locally first: `npm run build --workspaces --if-present` and `npm run build --workspace apps/web`
// - Ensure `apps/api/dist/main.js` exists on the server
// - Place your .env next to this file (repo root)

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Load environment variables
try {
  require('dotenv').config();
} catch {
  // dotenv might not be installed in production, that's fine if not needed
}

const distEntry = path.resolve(__dirname, 'apps/api/dist/main.js');

if (!fs.existsSync(distEntry)) {
  // Provide a helpful message if not built
  console.error('[server] API build not found at apps/api/dist/main.js');
  console.error(
    '[server] Please build locally and deploy artifacts, e.g.: `npm run build --workspaces --if-present && npm run build --workspace apps/web`'
  );
  process.exit(1);
}

// Dynamically import the ESM build from CommonJS
import(pathToFileURL(distEntry).href).catch((err) => {
  console.error('[server] Failed to start API from dist:', err);
  process.exit(1);
});


