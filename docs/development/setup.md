# Development Setup

## Prerequisites

- Node.js 16 or newer
- npm
- Firebase project with Authentication enabled

## First-Time Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` (or create `.env`) and provide the Firebase web config:
   ```
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   FIREBASE_MEASUREMENT_ID=...
   ```
3. Download a Firebase service account JSON file and set `FIREBASE_ADMIN_CREDENTIALS` to its path.
4. Start the development server:
   ```bash
   npm start
   ```
5. Visit `http://localhost:9000` and sign in with a Firebase-authenticated user.

## Local Firebase Options

- **Use the Firebase Emulator Suite** when you want realistic auth flows without touching production:
  1. Install CLI tools: `npm install -g firebase-tools`.
  2. Start the emulator: `firebase emulators:start --only auth`.
  3. Set `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` and call `connectAuthEmulator` in the client.
  4. Seed test users via the emulator UI or scripts.
- **Mock auth gateway** for offline work or automated tests:
  - Set `AUTH_PROVIDER=mock` (or another flag) to wire in the in-memory adapter.
  - Provide fixtures in `packages/infrastructure/auth/in-memory/` to create users/projects instantly.
  - Tokens are synthetic, so no external services are required.

## Local Database

- `rocket.db` is created automatically in the project root.
- The default dataset seeds an example project, epic, and tasks to illustrate expected UI behavior.
- Delete `rocket.db` to reset the local environment.

## Useful Scripts

- `npm run lint` – Run static analysis.
- `npm test` – Execute automated tests (to be expanded as coverage grows).
- `npm run format` – Apply formatting rules to supported file types.

## Firebase Notes

- Rotate client credentials when sharing the repository or transferring ownership.
- Use Firebase Emulator Suite for local auth testing if you need deterministic scenarios.

