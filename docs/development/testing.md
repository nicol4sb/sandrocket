# Testing Strategy

This guide explains how to validate Sand Rocket from fast inner-loop checks to full user flows. Each layer builds confidence without slowing development.

## Layers at a Glance

- **Unit tests** – Pure domain logic in memory.
- **Integration tests** – API + SQLite against a throwaway database.
- **End-to-end (E2E)** – Real server plus browser automation to mimic a user.

## Unit Tests

- Target: services, value objects, and domain rules in `packages/core`.
- Environment: no database, no HTTP—use in-memory adapters.
- Command (example):
  ```bash
  npm run test:unit
  ```
- Purpose: catch regressions in ordering logic, permission checks, invite rules, etc., with sub-second feedback.

## Integration Tests

- Target: Express routes, repositories, and adapters working together.
- Environment: start the app modules in process, but use a temporary SQLite file (`rocket.test.db`).
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
- Recommended toolset: Playwright or Cypress for browser automation.
- Typical flow:
  1. Launch the server (optionally via a helper script that starts it in the background).
  2. Wait for readiness (HTTP health check).
  3. Execute the E2E suite:
     ```bash
     npm run test:e2e
     ```
  4. Tear down by deleting the temporary database and stopping the server.
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

