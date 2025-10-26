# Sand Rocket Server Architecture

This directory contains the modular server architecture for the Sand Rocket application.

## Directory Structure

```
src/
├── app.js                 # Main Express application setup
├── config/
│   └── index.js          # Application configuration
├── middleware/
│   └── auth.js           # Authentication middleware
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── epics.js          # Epic management routes
│   ├── tasks.js          # Task management routes
│   └── activity.js       # Activity log routes
└── websocket/
    └── socketHandler.js  # WebSocket event handlers
```

## File Descriptions

### Core Application
- **`app.js`** - Main Express application setup, middleware configuration, and route mounting
- **`server.js`** - Entry point that starts the server

### Configuration
- **`config/index.js`** - Centralized configuration for session, CORS, security, and other settings

### Middleware
- **`middleware/auth.js`** - Authentication middleware for protecting routes

### Routes
- **`routes/auth.js`** - Authentication endpoints (login, logout, status)
- **`routes/epics.js`** - Epic CRUD operations
- **`routes/tasks.js`** - Task CRUD operations and position updates
- **`routes/activity.js`** - Activity log retrieval

### WebSocket
- **`websocket/socketHandler.js`** - Real-time communication handlers

## Benefits of This Structure

1. **Separation of Concerns** - Each file has a single responsibility
2. **Maintainability** - Easy to find and modify specific functionality
3. **Testability** - Individual modules can be tested in isolation
4. **Scalability** - Easy to add new routes or middleware
5. **Readability** - Clear organization makes the codebase easier to understand

## Adding New Features

### New Routes
1. Create a new file in `src/routes/`
2. Export an Express router
3. Import and mount in `src/app.js`

### New Middleware
1. Create a new file in `src/middleware/`
2. Export middleware functions
3. Import and use in `src/app.js`

### New WebSocket Events
1. Add handlers to `src/websocket/socketHandler.js`
2. Import and use in routes as needed

## Configuration

All configuration is centralized in `src/config/index.js`. Environment variables can be used to override defaults:

- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session secret key
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin setting
