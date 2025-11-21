# Sand Rocket - Task Management App

## Overview

Sand Rocket is a collaborative task planning app with a Tintin-rocket personality. Authenticated users spin up focused projects, organize work into epics and tasks, and stay in sync through real-time updates.

## Key Features

- Create projects with shareable invite links and role-aware membership.
- Drag-and-drop tasks with smooth animations; neighboring tasks slide in real time to preview the final position before you drop.
- Track history with an activity log and weekly metrics.
- Responsive design optimized for both desktop and mobile.

## Quick Start

1. Install dependencies: `npm install`
2. (Optional) Copy `.env.example` to `.env` at the repo root and adjust values
3. Development (HMR): `npm run dev`
   - Frontend at `http://localhost:5173` (Vite, hot reload)
   - API at `http://localhost:9000`
4. Production-style (single server): `npm start` or `node server.js
   - Serves the built frontend from the API at `http://localhost:9000`

## DevOps / Production

This project supports a simple, low-RAM friendly deployment using a single Node process that runs a compiled API and serves the compiled frontend.

### One-liner for production

- Build and run locally in one step:
  - `npm run prod`
  - This runs `npm run build:prod` (builds all workspaces) and then `node server.js`

### CI/CD or manual deploy to a small server (no compiling on server)

1. Build artifacts locally (or in CI):

   - `npm run build:prod`
   - This produces:
     - API build at `apps/api/dist/`
     - Frontend build at `apps/web/dist/`
     - Package builds at `packages/core/dist/`, `packages/infrastructure/dist/`, `packages/contracts/dist/`
   - Note: All dist folders are committed to git (see .gitignore exceptions) so your server can `git pull` and run without compiling.

2. Deploy the repo with artifacts to the server (rsync/zip/clone + pull):

   - Ensure the built folders are present (`apps/api/dist`, `apps/web/dist`) and `server.js` at repo root
   - Place `.env` at the repo root on the server

3. Start the app on the server:
   - `node server.js`
   - The API listens on the configured port (default 9000) and serves the frontend from `apps/web/dist`

Notes:

- `server.js` dynamically imports the compiled API (`apps/api/dist/main.js`) and does not require TypeScript runtime.
- You can also run `npm start` if build artifacts already exist; it will rebuild the frontend then start the API.
- For development with hot-reload, prefer `npm run dev` which runs Vite (frontend) and the API watcher in parallel.
- If you ever want to exclude artifacts from git, remove the exceptions in `.gitignore` for `apps/web/dist` and `apps/api/dist`.

## Documentation

- Architecture overview – `docs/architecture/overview.md`
- Authentication system – `docs/architecture/auth.md`
- Modular boundaries & interfaces – `docs/architecture/modules.md`
- Frontend architecture – `docs/architecture/frontend.md`
- Domain contracts & events – `docs/architecture/contracts.md`
- UX interaction notes – `docs/architecture/ux.md`
- Development setup – `docs/development/setup.md`
- Coding standards – `docs/development/coding-standards.md`
- Testing strategy – `docs/development/testing.md`
- Operations runbook – `docs/operations/runbook.md`
- Troubleshooting guide – `docs/operations/troubleshooting.md`
- Security & compliance – `docs/operations/security.md`

## Project Goals

The primary purpose is to motivate participants to plan and execute tasks—make phone calls, drive decisions, and take action on important items with a collaborative board that stays in lockstep.
