
# Sand Rocket - Task Management App

## Overview

Sand Rocket is a collaborative task planning app with a Tintin-rocket personality. Authenticated users spin up focused projects, organize work into epics and tasks, and stay in sync through real-time updates.

## Key Features

- Create projects with shareable invite links and role-aware membership.
- Drag-and-drop tasks with instant visual feedback and optimistic updates.
- Track history with an activity log and weekly metrics.
- Responsive design optimized for both desktop and mobile.

## Quick Start

1. Install dependencies: `npm install`
2. Configure Firebase credentials in `.env` (see `docs/development/setup.md`)
3. Provide a Firebase Admin service account JSON via `FIREBASE_ADMIN_CREDENTIALS`
4. Launch the app: `npm start`
5. Visit `http://localhost:9000` and sign in with your Firebase user

## Documentation

- Architecture overview – `docs/architecture/overview.md`
- Modular boundaries & interfaces – `docs/architecture/modules.md`
- Development setup – `docs/development/setup.md`
- Coding standards – `docs/development/coding-standards.md`
- Testing strategy – `docs/development/testing.md`
- Operations runbook – `docs/operations/runbook.md`
- Troubleshooting guide – `docs/operations/troubleshooting.md`

## Project Goals

The primary purpose is to motivate participants to plan and execute tasks—make phone calls, drive decisions, and take action on important items with a collaborative board that stays in lockstep.
