# Understanding Session Cookies and Session ID (sid)

## What is a Session Cookie?

A **session cookie** is a small piece of data stored in your browser that allows the server to remember who you are across multiple requests. Think of it like a "membership card" that proves you're logged in.

## What is the Session ID (sid)?

The **Session ID** (usually stored in a cookie named `connect.sid` in Express sessions) is a unique, random identifier that the server generates and sends to your browser. This ID acts as a "key" that links your browser to session data stored on the server.

## How It Works - Step by Step

### 1. **Login Process**
```
User logs in → Server verifies password → Server creates session:
  ├─ Generates random Session ID (e.g., "abc123xyz789")
  ├─ Stores session data in memory/database: { authenticated: true, sessionId: "abc123xyz789" }
  └─ Sends cookie to browser: "connect.sid=abc123xyz789"
```

### 2. **What Gets Stored?**

**In the Browser (Cookie):**
```
Name: connect.sid
Value: s%3Aabc123xyz789.encryptedSignature
Domain: localhost (or your domain)
Path: /
HttpOnly: true (JavaScript can't read it - XSS protection)
Secure: false (only true with HTTPS)
SameSite: strict (CSRF protection)
Expires: 8 hours from now
```

**On the Server (Session Store - default is memory):**
```javascript
{
  "abc123xyz789": {
    authenticated: true,
    cookie: {
      originalMaxAge: 28800000,  // 8 hours
      expires: "2024-01-01T12:00:00Z"
    }
  }
}
```

### 3. **Subsequent Requests**
```
Browser makes request → Automatically sends cookie:
  Cookie: connect.sid=s%3Aabc123xyz789.encryptedSignature

Server receives request:
  ├─ Extracts session ID from cookie
  ├─ Looks up session data: req.session = { authenticated: true }
  └─ Middleware checks: req.session.authenticated === true ✅
```

## Your Current Configuration

```javascript
app.use(session({
  secret: 'sand-rocket-secret-key',  // Used to sign/encrypt the cookie
  resave: false,                      // Don't save if nothing changed
  saveUninitialized: false,           // Don't create session until needed
  cookie: { 
    secure: false,                    // true = HTTPS only
    maxAge: 8 * 60 * 60 * 1000,      // 8 hours (28800000 ms)
    httpOnly: true,                   // JavaScript can't access (XSS protection)
    sameSite: 'strict'                // CSRF protection
  }
}));
```

### What Each Setting Does:

1. **`secret`**: 
   - Used to **sign** the cookie value
   - Prevents tampering (if someone changes the cookie, the signature won't match)
   - **Current issue**: Hardcoded - should use environment variable

2. **`resave: false`**:
   - Only saves session if it was modified
   - Saves database/memory writes

3. **`saveUninitialized: false`**:
   - Only creates a session if you actually use `req.session`
   - Saves memory (no empty sessions)

4. **`httpOnly: true`**:
   - Cookie is **not accessible** via JavaScript (`document.cookie`)
   - Protects against XSS attacks (malicious scripts can't steal your session)
   - ✅ **This is good!**

5. **`sameSite: 'strict'`**:
   - Cookie only sent on same-site requests
   - Protects against CSRF attacks
   - ✅ **This is good!**

6. **`maxAge: 8 hours`**:
   - Cookie expires after 8 hours
   - User needs to log in again after expiration

7. **`secure: false`**:
   - Cookie can be sent over HTTP (not just HTTPS)
   - ⚠️ **Should be `true` in production** (requires HTTPS)

## Security Model

### ✅ **What's Protected:**

1. **Session ID is Random**: 
   - Generated securely (cryptographically random)
   - Hard to guess or brute-force

2. **Cookie is Signed**:
   - Value includes signature: `s%3Aabc123xyz789.signature`
   - Server can detect tampering

3. **HttpOnly Prevents XSS**:
   - Even if malicious script runs, it can't read the cookie
   ```javascript
   // This won't work (returns empty string):
   document.cookie  // Can't see connect.sid cookie
   ```

4. **SameSite Prevents CSRF**:
   - Cookie not sent on cross-site requests
   - Prevents other sites from using your session

### ⚠️ **What's NOT Protected (without HTTPS):**

1. **Session ID in Transit**:
   - If using HTTP, session ID is sent in plaintext
   - Anyone intercepting can steal and reuse it

2. **Session Hijacking**:
   - If someone gets your session ID, they can impersonate you
   - That's why HTTPS is critical

## How the Session ID Looks

### **Raw Session ID** (on server):
```
abc123xyz789def456
```

### **Signed Cookie Value** (in browser):
```
s%3Aabc123xyz789.encryptedSignature
```
- `s%3A` = "s:" (session prefix, URL encoded)
- `abc123xyz789` = actual session ID
- `.encryptedSignature` = HMAC signature using the secret

## What Happens During Login (Your App)

```javascript
// 1. User submits password
POST /api/auth/login { passwordHash: "abc..." }

// 2. Server verifies password
const isValid = await db.verifyPasswordHash(passwordHash);

// 3. If valid, server creates/updates session
if (isValid) {
  req.session.authenticated = true;  // ← This creates/updates session
  // Express automatically:
  //   - Generates session ID
  //   - Stores { authenticated: true } in session store
  //   - Sends cookie: connect.sid=...
}

// 4. Browser receives Set-Cookie header:
Set-Cookie: connect.sid=s%3Aabc123xyz789.signature; HttpOnly; SameSite=Strict; Max-Age=28800

// 5. Browser automatically stores cookie

// 6. Next request includes cookie automatically:
Cookie: connect.sid=s%3Aabc123xyz789.signature
```

## Checking Authentication (Your App)

```javascript
// Middleware checks session
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {  // ← Reads from session store using ID from cookie
    next();  // User is authenticated
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};
```

## Logout Process

```javascript
// When user logs out:
req.session.destroy();  // ← Deletes session from server store
// Cookie becomes invalid (can't be reused)
```

## Important Notes

### **Session Storage** (Default: Memory)
- By default, Express sessions are stored in **memory**
- ⚠️ **Problem**: Sessions lost on server restart
- ⚠️ **Problem**: Doesn't work with multiple servers (load balancing)
- **Solution**: Use persistent store (Redis, database) for production

### **Session vs Cookie Size**
- Cookie stores **only the session ID** (small, ~100 bytes)
- Session data stored **on server** (can be large)
- Cookie is sent with **every request** (keep it small!)

### **Cookie Expiration**
- Cookie expires after `maxAge` (8 hours in your case)
- Server session also expires
- User must log in again after expiration

## Visual Flow

```
┌─────────┐                    ┌─────────┐
│ Browser │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │ POST /api/auth/login         │
     │ { passwordHash: "abc..." }   │
     ├─────────────────────────────>│
     │                              │ Verify password
     │                              │ Create session: { authenticated: true }
     │                              │ Generate SID: "abc123xyz789"
     │                              │ Store: { "abc123xyz789": { authenticated: true } }
     │                              │
     │ Set-Cookie: connect.sid=...  │
     │ { success: true }            │
     │<─────────────────────────────┤
     │                              │
     │ Store cookie                 │
     │ connect.sid=abc123xyz789     │
     │                              │
     │ GET /api/epics               │
     │ Cookie: connect.sid=...      │
     ├─────────────────────────────>│
     │                              │ Extract SID from cookie
     │                              │ Lookup session: req.session = { authenticated: true }
     │                              │ Check: authenticated === true ✅
     │                              │
     │ [epics data]                 │
     │<─────────────────────────────┤
```

## Summary

- **Session ID (sid)**: Random identifier that links your browser to server-side session data
- **Cookie**: Stores the session ID (small, ~100 bytes)
- **Session Store**: Stores actual session data (server-side, can be large)
- **Security**: Cookie is signed, HttpOnly, SameSite - but needs HTTPS for full protection
- **Expiration**: Both cookie and session expire after 8 hours

The session ID is like a "ticket number" - the cookie gives the server the ticket number, and the server looks up your data using that number.

