# Architecture Overview

Sand Rocket is a single-process Node.js application that serves both API and frontend concerns while maintaining real-time collaboration features. This document captures the runtime topology and the major components that keep the system cohesive.

## Runtime Topology

- `Express.js` handles HTTP routing, static asset delivery, and acts as the entry point for API requests.
- `Socket.io` runs alongside Express to broadcast real-time updates among collaborating clients.
- The browser-based frontend is served statically from the `public/` directory.
- A local `SQLite` database (`rocket.db`) persists all application state.

## Core Components

- **API Layer** – Express routes expose project, epic, task, invite, and analytics endpoints. Each route delegates to domain services defined in the `core` package.
- **Realtime Layer** – A Socket.io hub subscribes to domain events and distributes updates so UIs stay in sync.
- **Frontend** – Vanilla JavaScript and modern CSS power the drag-and-drop board, task editing, and collaboration UI.

## Data Storage

```
rocket.db (SQLite)
├── users
├── projects
├── project_members
├── epics
├── tasks
├── activity_log
└── invite_tokens
```

The database runs in WAL mode for better concurrency, and indices on frequently filtered columns (such as `epic_id`, `position`, and `project_id`) keep queries fast.

## Collaboration & Events

- Websocket sessions join project-specific rooms to limit broadcast scope.
- Domain services emit events (e.g., `TaskCompleted`, `InviteAccepted`) that the realtime hub consumes to notify clients.
- Clients optimistically update the UI and reconcile with server acknowledgements for smooth UX.

## Deployment Profile

- Single Node.js process; easy to host on platforms like Fly.io, Render, or a simple VM.
- `npm start` launches the server on the configured port (`PORT`, default `9000`).
- Backups involve copying `rocket.db`; no external dependencies beyond Firebase Authentication.
- Process managers such as PM2 are recommended for production restarts and monitoring.

