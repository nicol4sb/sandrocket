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
  1. Build locally: `npm run build:prod` (compiles TypeScript and builds frontend)
  2. Commit and push: `git add . && git commit -m "..." && git push`
  3. On server: `git pull` (gets source code + pre-built dist folders)
  4. Install runtime dependencies: `npm install --production` (no dev dependencies needed since dist is pre-built)
  5. Ensure `.env` file exists at repo root with required variables
  6. Start the application: `node server.js`
  7. (Optional) Run smoke tests to validate deployment

**Note**: The `apps/api/dist/` and `apps/web/dist/` folders are committed to git (see `.gitignore` exceptions), so no compilation is needed on the server. If you prefer to build on the server instead, use `npm install` (with dev dependencies) and run `npm run build:prod` before starting.

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

