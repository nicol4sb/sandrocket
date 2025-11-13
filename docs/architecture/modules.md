# Modular Boundaries

This guide outlines the modular breakdown that keeps Sand Rocket flexible as features evolve or get rebuilt.

## High-Level Packages

```
apps/
  api/         # Express delivery layer
  realtime/    # Socket.io gateway
  web/         # Browser client
packages/
  core/        # Domain models, services, events
  infrastructure/  # Adapters for persistence, auth, messaging
  contracts/   # Shared DTOs and schemas
  tooling/     # Scripts, migrations, utilities
```

## Domain Modules

- **Projects** – Project lifecycle, invite link issuance, membership rules, and orphan handling when owners leave.
- **Epics** – Swimlane ordering, color assignments, constraint enforcement.
- **Tasks** – Task creation, updates, completion handling, position management, and a fluid drag-and-drop experience where surrounding tasks animate out of the way to preview the final drop state.
- **Collaboration** – Event publishing, activity log aggregation, notification fan-out.
- **Analytics** – Weekly metrics and historical trends for engagement tracking.
- **Auth** – Email/password authentication with duplicate email checking. Passwords are hashed with bcrypt and sessions use JWT tokens. Password lifecycle management (reset, change) is planned for future releases.

Each module exports service interfaces (e.g. `TaskService`, `ProjectMembershipService`), domain events, and DTOs. Delivery layers depend on those interfaces; infrastructure packages provide concrete adapters.

## Interface Contracts

- Repository interfaces abstract persistence (`TaskRepository`, `ProjectRepository`, `UserRepository`).
- Gateways wrap external concerns (`MessagingGateway` for future email delivery).
- Event emitters follow a consistent signature so both realtime and analytics consumers can subscribe with minimal coupling.
- Auth infrastructure includes:
  - `SqliteUserRepository` for user persistence.
  - `BcryptPasswordHasher` for secure password hashing.
  - `JwtTokenService` for session token generation and validation.
- Realtime clients respect the `REALTIME_TRANSPORT` flag (`websocket`, `polling`, or `auto`) so behavior can be tuned per environment.
- `MaintenanceScheduler` module coordinates recurring jobs: database backups (daily, retain 5 copies), expired invite pruning, and orphan-project archiving.

## Application Assembly

- `apps/api/src/main.ts` (composition root) wires repositories, gateways, and services using a lightweight dependency injection container.
- Configuration is loaded via a typed `loadConfig()` helper that reads `.env`, `.env.local`, or process variables.
- Environment toggles:
  - `JWT_SECRET` sets the secret key for signing session tokens (required, minimum 16 characters).
  - `SQLITE_FILENAME` sets the database file path (defaults to `rocket.db`).
  - `REALTIME_TRANSPORT` controls Socket.io transports for constrained networks (future feature).
- Frontend bundles consume a generated `config.json` (built from the same source) to stay in sync with server settings.
- `AccountCleanupService` listens to `UserDeleted` events to transfer project ownership to the next editor or archive the project if no collaborators remain. Archived projects trigger notifications and are excluded from invite issuance until reassigned.

## Configuration & Environment

- A typed config module resolves environment variables and exposes a single `AppConfig` object.
- Consumers request only the configuration sections they need, keeping tests simple via in-memory config providers.

## Testing Strategy

- Each domain module ships with in-memory implementations of its interfaces for fast unit tests.
- Integration tests exercise real adapters (e.g. SQLite repositories) to protect against regression when swapping infrastructure.

## Evolution Playbook

- Rebuilding a subsystem involves implementing the same interface in a new module and switching the wiring layer.
- Event-driven boundaries enable gradual rollouts—new consumers can subscribe alongside the existing ones before replacing them.

