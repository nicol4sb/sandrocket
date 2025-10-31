module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'sand-rocket-secret-key',
  sessionConfig: {
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      httpOnly: true,
      sameSite: 'strict'
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

