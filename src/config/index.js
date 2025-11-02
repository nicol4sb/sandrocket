module.exports = {
  port: process.env.PORT || 9000,
  sessionSecret: process.env.SESSION_SECRET || 'sand-rocket-secret-key',
  sessionConfig: {
    resave: false,
    saveUninitialized: false,
    cookie: { 
      // secure: false for HTTP (set to true in production with HTTPS)
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || 'lax'
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
      error: 'Too many requests, please try again later'
    }
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || "*",
    methods: ["GET", "POST"]
  }
};

