# Security & Compliance

## Secrets Management

- Store environment variables (.env files) in managed secret stores; grant read-only access to deployment pipelines.
- Rotate Firebase web and admin credentials every 90 days or after incidents.
- Audit access to service account JSON files; avoid checking them into git.

## Authentication & Authorization

- Firebase-issued ID tokens are verified on every request via the configured `AuthGateway`.
- Role-based access: project owner, editor, viewer. Enforce checks in domain services (not controllers only).
- Invite links are single-use tokens hashed in `invite_tokens`; expire in 7 days by default.
- Account lifecycle: when Firebase signals user deletion, `AccountCleanupService` transfers ownership to the next editor or archives the project after a grace period; archived artifacts remain recoverable for 30 days.

## Data Protection

- SQLite database resides on encrypted disks when running in production (use host-level encryption or managed volumes).
- Nightly backups retain the most recent five snapshots; store them encrypted at rest and in transit.
- Implement data retention policies: archive or delete activity logs older than 180 days unless required for compliance.

## Observability & Alerts

- Enable structured logging (JSON) for easier ingestion by log pipelines.
- Set alerts for repeated authentication failures, invite generation spikes, and abnormal task churn.
- Monitor Firebase security rules and usage quotas in the console.

## Incident Response

- Keep a runbook of on-call contacts and escalation tree.
- Document steps to revoke compromised Firebase keys quickly and redeploy with rotated credentials.
- Maintain an incident timeline template to capture events during critical outages.
