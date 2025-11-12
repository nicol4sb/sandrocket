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

## Backups

- `rocket.db` is the single source of truth; copy it regularly.
- Recommended schedule: hourly incremental snapshot, daily off-site backup.
- Verify restore path quarterly by restoring to a staging environment.

## Monitoring

- Log to stdout/stderr; aggregate with a centralized log service (e.g., Papertrail).
- Track key metrics:
  - Websocket connection count.
  - Task creation/completion rates.
  - API latency (95th percentile).
- Configure alerts for elevated error rates or excessive latency.

## Security

- Rotate Firebase keys when incidents are suspected.
- Enforce HTTPS in production with a reverse proxy (Nginx, Caddy, or platform equivalent).
- Rate limiting defaults to 500 requests per 15 minutes per IP; adjust based on traffic.

## Maintenance Tasks

- Prune old invite tokens and activity logs if they exceed retention targets.
- Rebuild SQLite indices periodically on large datasets (`VACUUM` + `ANALYZE`).
- Review dependency updates monthly and patch security releases promptly.

