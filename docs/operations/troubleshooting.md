# Troubleshooting

## Server Fails to Start

- Check that `.env` exists and contains valid Firebase values.
- Ensure the service account path in `FIREBASE_ADMIN_CREDENTIALS` is accessible to the process.
- Run `npm install` to confirm dependencies are present.

## Cannot Authenticate

- Verify Firebase Authentication providers are enabled in the console.
- If using the emulator, confirm the frontend points to the emulator host.
- Inspect server logs for token verification errors.

## Stale Realtime Updates

- Confirm websocket connections are established (look for Socket.io connect events in logs).
- Check for network proxies blocking websockets; fall back to long polling temporarily by enabling `transports: ['websocket','polling']` in the client.
- Validate that domain events are emitted—run integration tests on the affected module.

## Database Locked Errors

- Ensure the process is running SQLite in WAL mode (default configuration enables it on startup).
- Investigate long-running transactions in custom scripts or admin tools.
- Restart the process during off-peak hours if locks persist.

## Performance Degradation

- Run `EXPLAIN QUERY PLAN` on slow SQL statements to verify indices.
- Confirm `rocket.db` resides on fast storage; consider migrating to Postgres if concurrency requirements outgrow SQLite.
- Review recent deployments for inefficient loops or heavy joins introduced in code.

