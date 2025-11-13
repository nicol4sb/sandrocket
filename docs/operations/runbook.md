# Operations Runbook

## Deployments

- **Environment Variables**
  - `PORT` – HTTP port (default `9000`).
  - `NODE_ENV` – `production` for optimized builds.
  - Firebase credentials (`FIREBASE_ADMIN_CREDENTIALS`, web config in `.env`).
- **Process Management**
  - Use PM2 or systemd to supervise the Node.js process.
  - Configure restarts on failure and enable log rotation.
- **Deployment Steps**
  1. Pull the latest code.
  2. Install dependencies with `npm install --production`.
  3. Run database migrations if new SQL scripts are present.
  4. Restart the application process.
  5. Run smoke tests (`npm run test:integration` against production clone or `npm run test:e2e -- --project smoke`) to validate.

## Environment Topology

- **Development** – local machines, Firebase emulator or sandbox project, mock gateways allowed.
- **Staging** – mirrors production settings with sandbox Firebase project and sample data.
- **Production** – locked-down environment, real Firebase project, monitoring enabled.
- Maintain separate `.env` files (`.env.staging`, `.env.production`) managed via secure secret storage (Vault, Doppler, or platform-specific secrets).

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
- Expose `/healthz` (liveness) and `/readyz` (readiness) endpoints for probes; include database connectivity and Firebase token verification checks.
- Optional: ship metrics to Prometheus via `/metrics` endpoint with histograms for task operations.

## Security

- Rotate Firebase keys when incidents are suspected.
- Enforce HTTPS in production with a reverse proxy (Nginx, Caddy, or platform equivalent).
- Rate limiting defaults to 500 requests per 15 minutes per IP; adjust based on traffic.
- Store secrets in managed secret stores—never commit them. Automate rotation reminders every 90 days.
- Enable audit logging by persisting invite/member changes to `activity_log` with actor metadata.
- Ensure dependencies are scanned (`npm audit`, `snyk test`) as part of CI.

## Maintenance Tasks

- Prune old invite tokens and activity logs if they exceed retention targets.
- Rebuild SQLite indices periodically on large datasets (`VACUUM` + `ANALYZE`).
- Review dependency updates monthly and patch security releases promptly.
- Evaluate scaling triggers quarterly: migrate to Postgres and introduce Redis pub/sub when concurrent task updates exceed ~100 per second or websocket connections surpass 3,000 per node.

