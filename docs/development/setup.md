# Development Setup

## Prerequisites

- Node.js 16 or newer
- npm

## First-Time Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Copy `config/env.example` to `.env` to customize settings like port, database filename, or JWT secret.
3. Start the development server:
   ```bash
   npm start
   ```
4. Visit `http://localhost:9000` and create an account or sign in.

## Authentication

The app uses a simplified authentication system:

- **Signup**: Users register with a well-formed email address and password (minimum 8 characters). The system checks if the email already exists and declines registration if it does.
- **Login**: Users sign in with their email and password. Email addresses are normalized (lowercased) for consistency.
- **Password Management**: Password reset, change, and recovery features are planned for future releases. Currently, users must remember their passwords.
- **No External Dependencies**: Authentication is handled entirely within the application using bcrypt for password hashing and JWT for session tokens. No Firebase or other external auth services are required.

## Local Database

- `rocket.db` is created automatically in the project root.
- The default dataset seeds an example project, epic, and tasks to illustrate expected UI behavior.
- Delete `rocket.db` to reset the local environment.

## Useful Scripts

- `npm run lint` – Run static analysis.
- `npm test` – Execute automated tests (to be expanded as coverage grows).
- `npm run format` – Apply formatting rules to supported file types.

## Security Notes

- Change the default `JWT_SECRET` in production (set via `JWT_SECRET` environment variable).
- The SQLite database stores hashed passwords using bcrypt. Keep `rocket.db` secure and backed up.

