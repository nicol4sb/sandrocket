// Application configuration
const config = {
  port: process.env.PORT || 3000,
  session: {
    secret: process.env.SESSION_SECRET || 'sand-rocket-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  },
  helmet: {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' // Disable for development
  }
};

module.exports = config;


