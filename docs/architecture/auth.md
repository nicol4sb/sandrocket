# Authentication Architecture

## Overview

Sand Rocket uses a simplified email/password authentication system that operates entirely within the application. No external authentication services (like Firebase) are required.

## Current Implementation

### Signup Flow

1. User submits registration form with:
   - **Email**: Must be a well-formed email address (validated using Zod's email schema)
   - **Password**: Minimum 8 characters
   - **Display Name**: Optional

2. Server-side validation:
   - Email is normalized (lowercased) for consistency
   - System checks if email already exists in the database
   - If email exists, registration is declined with error code `auth/user-already-exists`
   - If email is new, password is hashed using bcrypt and user record is created

3. Response:
   - JWT token is generated and returned
   - User data (id, email, displayName, timestamps) is returned
   - Token is also set as an HTTP-only cookie for session management

### Login Flow

1. User submits login form with email and password

2. Server-side validation:
   - Email is normalized (lowercased)
   - System looks up user by email
   - If user not found, returns error code `auth/user-not-found`
   - If user exists, password is verified against stored bcrypt hash
   - If password invalid, returns error code `auth/invalid-credentials`

3. Response:
   - JWT token is generated and returned
   - User data is returned
   - Token is also set as an HTTP-only cookie

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt before storage. Plaintext passwords are never stored.
- **JWT Tokens**: Session tokens are signed with a configurable secret (`JWT_SECRET`). Default expiration is 7 days.
- **Email Normalization**: All email addresses are lowercased to prevent duplicate accounts with different cases.
- **HTTP-Only Cookies**: Tokens are set as HTTP-only cookies to reduce XSS attack surface.

## Future Enhancements

The following features are planned but not yet implemented:

- **Password Reset**: Users will be able to request password reset links via email
- **Password Change**: Authenticated users will be able to change their passwords
- **Email Verification**: Optional email verification on signup
- **Account Recovery**: Support for account recovery workflows

## Database Schema

Users are stored in the `users` table with the following structure:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## API Endpoints

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive session token

Both endpoints return:
- `200` or `201` status with `{ token: string, user: UserResponse }` on success
- `400` status with validation error details if request is malformed
- `401` or `409` status with error code and message on authentication/conflict failures

