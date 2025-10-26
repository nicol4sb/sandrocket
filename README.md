
# Sand Rocket - Task Management App

## Project Overview
A collaborative todo app designed to motivate participants to plan and execute tasks together. The app features a unique Tintin rocket theme with post-it style tasks that can be organized and managed by two users sharing a password-protected workspace.

## Task Management

### Task Properties
- Tasks can have up to 150 characters
- Each task has a creation date and time (shown on hover over the title)
- Tasks can be edited after creation
- Tasks can be marked as done with a single click
- Completed tasks move to a list below (last closed at top) with visual post-it disappearing for sense of achievement
- Completed tasks can be reopened from the list
- Tasks can be deleted with confirmation dialog

### Task Organization
- Tasks are ordered within their epic
- If a task is dragged into another epic, change its epic

## Epic Management

### Epic Structure
- Epics have a name and a pastille (visual indicator)
- A task always belongs to one and one only epic
- Epic assignment can be changed during task edition
- Epics should be presented vertically and can be rearranged by drag and drop

## User Experience (UX)

### Visual Design
- Modern, high contrast styling for excellent text readability
- Top banner should float when scrolling down

### Interaction Design
- All text fields editable when clicked (titles, body, links)
- double click in the field enters edit mode, and selects the whole text
- Text should be wrapped in tasks
- Task deletion via cross icon in top right
- Task creation with appropriate UI component (e.g., + sign)
- Nice UX effects like sliding into completed list for enjoyable task completion
### Collaboration Features
- Offer the ability to browse the full plan on the main page, and then in maybe foldable areas or tabs I want two reports : 
#### a detailed action log with comprehensive activity tracking
- **Task Actions**: Creation, updates, completion, deletion, and reordering with epic context
- **Epic Actions**: Creation and updates with color and position details
- **Rich Details**: Each log entry includes task content, epic names, positions, and timestamps
- **Metrics**: Number of tasks created and completed in the past week
- **Real-time Updates**: Live activity feed for collaborative awareness
#### a list of the closed tasks ordered with the most recently closed at the top - I can reopen them from there also. When I reopen, they disappear from the closed list -

## Architecture & Technical Requirements

### System Architecture
**Single Node.js Application** - A lean, monolithic approach that serves both API and frontend from one process, perfect for a 2-person collaborative tool.

#### Core Components
- **Express.js Server** - Handles HTTP requests, serves static files, and manages WebSocket connections
- **SQLite Database** - Embedded file-based database (`rocket.db`) for easy backup and portability
- **WebSocket Server** - Real-time collaboration using Socket.io for live updates between users
- **Static Frontend** - Vanilla JavaScript with modern CSS, served directly by Express

#### Data Layer
```
rocket.db (SQLite)
├── epics (id, name, pastille_color, position, created_at)
├── tasks (id, epic_id, content, position, is_completed, created_at, updated_at)
├── activity_log (id, user_id, action_type, task_id, details, timestamp)
└── app_config (key, value) -- for shared password, etc.
```

#### File Structure
```
sand-rocket/
├── server.js              # Main Express server
├── database.js            # SQLite setup and queries
├── rocket.db              # SQLite database file (backup-friendly!)
├── public/                # Static frontend files
│   ├── index.html         # Main app page
│   ├── styles.css         # Rocket-themed styling
│   ├── app.js             # Frontend logic & drag-drop
│   └── rocket.svg         # Tintin rocket illustration
├── package.json           # Dependencies
└── README.md
```

#### Real-time Collaboration
- **WebSocket connections** maintain live sync between users
- **Optimistic updates** for smooth UX (update UI immediately, sync with server)
- **Conflict resolution** using last-write-wins with timestamps
- **Activity broadcasting** shows real-time actions in the folding log panel

#### Security & Authentication
- **Simple shared password** stored as hashed value in SQLite
- **Session-based auth** using Express sessions
- **CSRF protection** for form submissions
- **Input validation** and sanitization for all user data

#### Deployment Strategy
- **Single file deployment** - just copy the folder and run `npm start`
- **Easy backup** - copy `rocket.db` file to backup all data
- **Port configuration** - runs on configurable port (default 3000)
- **Process management** - can use PM2 for production deployment

#### Performance Considerations
- **SQLite WAL mode** for better concurrent access
- **Connection pooling** for database operations
- **Efficient queries** with proper indexing on epic_id, position, etc.
- **Client-side caching** of epic/task data with periodic refresh
- **Debounced updates** for drag-and-drop operations

#### Development Workflow
- **Hot reload** for frontend changes during development
- **Database migrations** handled via simple SQL scripts
- **Logging** to console and optional file for debugging
- **Error handling** with graceful degradation for network issues

### Architecture Summary
**Sand Rocket** is built as a lean, single-process Node.js application that serves both API and frontend. The core stack includes:

- **Backend**: Express.js server with SQLite database (`rocket.db`)
- **Frontend**: Vanilla JavaScript with modern CSS, served statically
- **Real-time**: WebSocket connections for live collaboration
- **Data**: File-based SQLite for easy backup and portability
- **Auth**: Simple shared password with session management

**Key Benefits:**
- 🚀 **Zero-config deployment** - just run `npm start`
- 💾 **Easy backup** - copy the `rocket.db` file
- ⚡ **Real-time collaboration** - instant updates between users
- 🎨 **Rocket-themed UI** - Tintin-inspired visual design
- 🔧 **Minimal dependencies** - lean and maintainable

## Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm

### Installation & Running
1. Clone or download this repository
2. Navigate to the project directory
3. Run the startup script:
   ```bash
   ./start.sh
   ```
   Or manually:
   ```bash
   npm install
   npm start
   ```
4. Open your browser and go to `http://localhost:3000`
5. Use the default password: `rocket123`

### First Time Setup
- The app will create a SQLite database (`rocket.db`) automatically
- Default password is `rocket123` (you can change this later)
- A default "General" epic will be created for you to start with

### Features Available
✅ **Task Management**: Create, edit, complete, and delete tasks (max 150 characters)  
✅ **Epic Organization**: Create and manage epics with color-coded pastilles  
✅ **Drag & Drop**: Move tasks between epics by dragging, and reorganize order of tasks within one epic
✅ **Real-time Collaboration**: Live updates when multiple users are working  
✅ **Activity Log**: Track all actions in the folding activity panel  
✅ **Authentication**: Simple shared password protection  
✅ **Responsive Design**: Works on desktop and mobile devices  

## Project Goals
The primary purpose is to motivate participants to plan and execute tasks - make phone calls, drive decisions, and take action on important items.
