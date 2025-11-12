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

- **Projects** – Project lifecycle, invite link issuance, membership rules.
- **Epics** – Swimlane ordering, color assignments, constraint enforcement.
- **Tasks** – Task creation, updates, completion handling, position management.
- **Collaboration** – Event publishing, activity log aggregation, notification fan-out.
- **Analytics** – Weekly metrics and historical trends for engagement tracking.

Each module exports service interfaces (e.g. `TaskService`, `ProjectMembershipService`), domain events, and DTOs. Delivery layers depend on those interfaces; infrastructure packages provide concrete adapters.

## Interface Contracts

- Repository interfaces abstract persistence (`TaskRepository`, `ProjectRepository`).
- Gateways wrap external concerns (`AuthGateway`, `MessagingGateway`).
- Event emitters follow a consistent signature so both realtime and analytics consumers can subscribe with minimal coupling.

## Configuration & Environment

- A typed config module resolves environment variables and exposes a single `AppConfig` object.
- Consumers request only the configuration sections they need, keeping tests simple via in-memory config providers.

## Testing Strategy

- Each domain module ships with in-memory implementations of its interfaces for fast unit tests.
- Integration tests exercise real adapters (e.g. SQLite repositories) to protect against regression when swapping infrastructure.

## Evolution Playbook

- Rebuilding a subsystem involves implementing the same interface in a new module and switching the wiring layer.
- Event-driven boundaries enable gradual rollouts—new consumers can subscribe alongside the existing ones before replacing them.

