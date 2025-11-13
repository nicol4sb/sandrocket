# Domain Contracts

## Core DTOs

### Project
```json
{
  "id": "proj_123",
  "name": "Apollo Plan",
  "ownerId": "user_456",
  "inviteUrl": "https://app.sandrocket.io/invite/abcd",
  "createdAt": "2025-01-12T08:15:30Z"
}
```

### Epic
```json
{
  "id": "epic_1",
  "projectId": "proj_123",
  "name": "Launch Prep",
  "color": "#FF6B6B",
  "position": 1
}
```

### Task
```json
{
  "id": "task_98",
  "epicId": "epic_1",
  "content": "Call runway vendor",
  "position": 3,
  "isCompleted": false,
  "createdAt": "2025-01-12T09:03:00Z",
  "updatedAt": "2025-01-12T09:05:12Z"
}
```

> Tasks inherit project context through their epic. Servers resolve `projectId` as `epic.projectId` when required.

## API Endpoints

- `POST /api/projects` – create project (body: `{ name }`).
- `POST /api/projects/:projectId/epics` – add epic (body: `{ name, color }`).
- `POST /api/epics/:epicId/tasks` – add task (body: `{ content }`).
- `PATCH /api/tasks/:taskId` – update content or completion status.
- `PATCH /api/tasks/:taskId/position` – reorder task (body: `{ epicId, position }`).
- `DELETE /api/tasks/:taskId` – delete task.

Each endpoint returns the DTO plus a `version` field used for optimistic concurrency.

## Event Model

### Task Lifecycle Events

- `TaskCreated` – emitted after persistence; payload includes task DTO and actor.
- `TaskUpdated` – content change or completion toggle.
- `TaskReordered` – includes `taskId`, `from` and `to` coordinates (`epicId`, `position`).
- `TaskDeleted`

### Drag-and-Drop Sequence

1. Client begins drag → emits `TaskDragStarted` telemetry event (optional) and shows ghost preview.
2. Task hover updates -> client sends `PATCH /position` with optimistic payload.
3. Server processes reorder, emits `TaskReordered` via event bus.
4. Realtime hub broadcasts `task.reordered` Socket.io message to project room.
5. Clients reconcile positions; the initiator confirms optimistic update, others animate neighbors sliding into place. Each websocket payload includes `actorSummary` (name + avatar color) so recipients can show transient attribution badges.

### Project Lifecycle Events

- `ProjectCreated` – emitted when a new project is provisioned; payload contains owner metadata.
- `ProjectRenamed` – includes previous and new names.
- `ProjectArchived` – triggered when owners archive manually or when `AccountCleanupService` archives an orphan.
- `ProjectOwnershipTransferred` – identifies previous and new owners and reason (`userDeletion`, `manual`).

### Epic Lifecycle Events

- `EpicCreated`
- `EpicRenamed`
- `EpicReordered` – carries previous and new column positions.
- `EpicArchived` / `EpicDeleted` – indicates removal or soft archive.

### Account & Membership Events

- `UserDeleted` – produced when Firebase reports account deletion; consumers trigger project ownership resolution.
- `ProjectOrphaned` – fired if a project has no editors; downstream listeners schedule archival after grace period.
- `MemberPromoted` / `MemberDemoted` – capture role changes to keep clients in sync.

### Invite & Collaboration Events

- `InviteLinkGenerated`
- `MemberJoined`
- `MemberLeft`
- `ActivityLogged`

Events follow the contract `{ type, occurredAt, payload, actor, actorSummary }`. `actorSummary` is a precomputed snapshot of display name and avatar color used for transient UI notifications.

## Shared Types Package

- `packages/contracts/` exports TypeScript interfaces mirroring the DTOs and event payloads.
- OpenAPI spec generated from Express routes lives at `contracts/openapi.json`; clients generate SDKs from it during build.
- Frontend imports these types to guarantee compile-time alignment.
