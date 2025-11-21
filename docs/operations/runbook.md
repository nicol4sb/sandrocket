# Operations Runbook

## Deployments

- **Environment Variables**
  - `PORT` – HTTP port (default `9000`).
  - `NODE_ENV` – `production` for optimized builds.
  - `ROCKET_DB_PATH` – Optional path override for SQLite database (defaults to `rocket.db` in repo root).
- **Process Management**
  - Use PM2 or systemd to supervise the Node.js process.
  - Configure restarts on failure and enable log rotation.
- **Deployment Steps** (when dist folders are committed to git)
  1. Build locally: `npm run build:prod` (compiles TypeScript for all packages and apps, builds frontend)
  2. Commit and push: `git add . && git commit -m "..." && git push` (includes all dist folders AND source files)
  3. On server: `git pull` (gets source code + pre-built dist folders for apps and packages)
  4. **Install dependencies**: `npm install` (MUST be run to install all workspace dependencies including `tsx` which is needed for `server.js`)
     - **Troubleshooting**: If `node_modules/bcryptjs` is missing after `npm install`, see [Troubleshooting Guide](./troubleshooting.md#missing-dependencies-after-npm-install)
     - Quick fix: `rm -rf node_modules package-lock.json && npm install`
     - Verify: `npm ls bcryptjs` should show it under `@sandrocket/infrastructure`
  5. **Verify installation**: 
     - Check that `node_modules/bcryptjs` exists (the package is `bcryptjs`, not `bcrypt`)
     - Check that `node_modules/better-sqlite3` exists
     - Check that `node_modules/express` exists
     - Check that `node_modules/.bin/tsx` exists (needed for `server.js`)
     - Run `npm ls bcryptjs` to verify it's installed and hoisted correctly
  6. Ensure `.env` file exists at repo root with required variables
  7. **Node.js Version**: Ensure Node.js >= 18.20.0 (Node.js 18.19.1 has a known bug with workspace `exports` resolution). Consider upgrading to Node.js 20 LTS for better stability.
  8. Start the application: `node server.js` (or restart systemd service)
     - **Note**: `server.js` now uses `tsx` to run the TypeScript source, which handles workspace module resolution correctly. This avoids ESM resolution issues with compiled code.
  9. (Optional) Run smoke tests to validate deployment

**Note**: The `apps/api/dist/`, `apps/web/dist/`, and all `packages/*/dist/` folders are committed to git (see `.gitignore` exceptions), so no compilation is needed on the server. If you prefer to build on the server instead, use `npm install` (with dev dependencies) and run `npm run build:prod` before starting.

## Environment Topology

- **Development** – local machines, SQLite database (`rocket.db`), hot reload enabled.
- **Staging** – mirrors production settings with separate SQLite database and sample data.
- **Production** – locked-down environment, production SQLite database, monitoring enabled.
- Maintain separate `.env` files (`.env.staging`, `.env.production`) managed via secure secret storage (Vault, Doppler, or platform-specific secrets).
- **Database**: The `rocket.db` file is not versioned in git. On first deployment, it will be created automatically. For subsequent deployments, ensure the database file persists (backup before major updates).

## Backups

- `rocket.db` is the single source of truth; copy it regularly.
- Recommended schedule: nightly full backup coordinated by `MaintenanceScheduler`, retaining the last five snapshots (rolling window) in off-site storage.
- Verify restore path quarterly by restoring the most recent snapshot to a staging environment.

## Monitoring

- Log to stdout/stderr; aggregate with a centralized log service (e.g., Papertrail).
- Track key metrics:
  - Websocket connection count.
  - Task creation/completion rates.
  - API latency (95th percentile).
- Configure alerts for elevated error rates or excessive latency.
- Expose `/healthz` (liveness) and `/readyz` (readiness) endpoints for probes; include database connectivity checks.
- Optional: ship metrics to Prometheus via `/metrics` endpoint with histograms for task operations.

## Security

- Enforce HTTPS in production with a reverse proxy (Nginx, Caddy, or platform equivalent).
- Rate limiting defaults to 500 requests per 15 minutes per IP; adjust based on traffic.
- Store secrets in managed secret stores—never commit them (`.env` is in `.gitignore`). Automate rotation reminders every 90 days.
- Protect the SQLite database file (`rocket.db`) with appropriate file permissions (read/write for the app user only).
- Ensure dependencies are scanned (`npm audit`, `snyk test`) as part of CI.

## Maintenance Tasks

- Rebuild SQLite indices periodically on large datasets (`VACUUM` + `ANALYZE`).
- Review dependency updates monthly and patch security releases promptly.
- Evaluate scaling triggers quarterly: migrate to Postgres when concurrent task updates exceed ~100 per second or the database size exceeds SQLite's practical limits.

