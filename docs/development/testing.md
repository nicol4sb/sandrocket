# Testing Strategy

This guide explains how to validate Sand Rocket from fast inner-loop checks to full user flows. Each layer builds confidence without slowing development.

## Layers at a Glance

- **Unit tests** – Pure domain logic in memory.
- **Integration tests** – API + SQLite against a throwaway database.
- **End-to-end (E2E)** – Real server plus browser automation to mimic a user.

Recommended npm scripts (define these in `package.json`):

```json
{
  "scripts": {
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:full": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "firebase:emulator": "firebase emulators:start --only auth"
  }
}
```

## Unit Tests

- Target: services, value objects, and domain rules in `packages/core`.
- Environment: no database, no HTTP—use in-memory adapters.
- Auth: wire the `InMemoryAuthGateway` so tests can seed users without Firebase.
- Command (example):
  ```bash
  npm run test:unit
  ```
- Purpose: catch regressions in ordering logic, permission checks, invite rules, etc., with sub-second feedback.

## Integration Tests

- Target: Express routes, repositories, and adapters working together.
- Environment: start the app modules in process, but use a temporary SQLite file (`rocket.test.db`).
- Auth: either use the Firebase Emulator Gateway (by starting the auth emulator before the suite) or the in-memory gateway for faster runs.
- Recommended flow:
  1. Create a temp database before each suite.
  2. Run HTTP requests with Supertest (or similar).
  3. Drop the database after the suite completes.
- Command (example):
  ```bash
  npm run test:integration
  ```
- Purpose: ensure API contracts, persistence, and auth glue behave with realistic data access patterns.

## End-to-End Tests

- Target: full user journeys—login, create project, add epics/tasks, edit and delete items.
- Environment: run the real server (`npm start`) with sandbox Firebase credentials and a dedicated database.
- Auth: point the frontend and backend to the Firebase Emulator when possible (`FIREBASE_AUTH_EMULATOR_HOST` + `connectAuthEmulator`), or use a staging Firebase project reserved for automated tests.
- Recommended toolset: Playwright or Cypress for browser automation.
- Typical flow:
  1. Launch the server (optionally via a helper script that starts it in the background).
  2. If using the emulator, start it via `npm run firebase:emulator` (in a separate process) and export `USE_FIREBASE_EMULATOR=true`.
  3. Wait for readiness (HTTP health check).
  4. Execute the E2E suite:
     ```bash
     npm run test:e2e
     ```
  5. Tear down by deleting the temporary database and stopping the server/emulator.
- Purpose: validate that the product behaves as a user expects, covering UI wiring, realtime updates, and authentication end-to-end.

## Umbrella Script

- Provide a convenience command to run everything sequentially:
  ```bash
  npm run test:full
  ```
- This script can:
  - Run unit and integration suites.
  - Start the server, execute E2E tests, then stop the server.
  - Clean up any temporary files created along the way.

## Best Practices

- Keep test data isolated—never point tests at production or shared databases.
- Use feature flags or dedicated Firebase projects for automated sign-ins.
- Parallelize where possible (unit tests in watch mode, E2E selectively on CI).
- Document fixtures and helper utilities so new contributors can extend coverage quickly.
- Store fixtures under `tests/fixtures/` (users, projects, tasks). Provide factory helpers that can seed either the in-memory gateway or the emulator automatically.
- CI pipelines should call `npm run firebase:emulator -- --project sandrocket-test` to ensure predictable tenant IDs.

