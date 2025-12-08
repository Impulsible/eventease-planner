require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

// Import Passport configuration
require('./config/passport');

// Import routes
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const invitationRoutes = require('./routes/invitations');
const rsvpRoutes = require('./routes/rsvps');
const authRoutes = require('./routes/auth');

// Swagger docs
const swaggerSpecs = require('./docs/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

console.log(`🚀 Starting EventEase API in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 API URL: ${process.env.API_URL}`);
console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL}`);

/* --------------------------------
   GLOBAL MIDDLEWARE
---------------------------------- */
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: isProduction,
}));

// CORS configuration based on environment
const corsOptions = {
  origin: isProduction 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* --------------------------------
   SESSION CONFIGURATION
---------------------------------- */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'eventease-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (isProduction) {
  // Trust proxy for production (Render uses proxy)
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
  sessionConfig.cookie.sameSite = 'none';
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

/* --------------------------------
   DATABASE CONNECTION
---------------------------------- */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Remove useNewUrlParser and useUnifiedTopology - deprecated in Mongoose 6+
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🔌 Port: ${conn.connection.port}`);

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    
    if (isProduction) {
      console.log('💡 Production MongoDB Tips:');
      console.log('1. Check if IP is whitelisted in MongoDB Atlas');
      console.log('2. Verify connection string is correct');
      console.log('3. Check network access in MongoDB Atlas');
    }
    
    // In production, exit if DB fails
    if (isProduction) {
      process.exit(1);
    }
  }
};

connectDB();

mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

/* --------------------------------
   API ROUTES
---------------------------------- */
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/rsvps', rsvpRoutes);
app.use('/api/auth', authRoutes);

/* --------------------------------
   SWAGGER DOCUMENTATION
---------------------------------- */
// Base URLs
const developmentUrl = process.env.API_URL || `http://localhost:${PORT}`;
const productionUrl = process.env.RENDER_URL || 'https://eventease-api.onrender.com';

// Swagger UI options - using default styling (no custom CSS)
const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: `EventEase API - ${isProduction ? 'Production' : 'Development'}`,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    operationsSorter: 'method',
    tagsSorter: 'alpha',
    validatorUrl: null,
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerUiOptions));

/* --------------------------------
   HEALTH & INFO ENDPOINTS
---------------------------------- */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `EventEase API is running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`,
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    week: 6,
    deployed_on: isProduction ? 'Render' : 'Local',
    documentation: '/api-docs',
    health_check: '/health',
    api_info: '/api/info',
    production_url: 'https://eventease-api.onrender.com',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.db?.databaseName || 'unknown'
    }
  });
});

app.get('/health', (req, res) => {
  const health = {
    success: true,
    status: 'running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    render: isProduction ? 'deployed' : 'local',
    version: '1.0.0'
  };

  if (isProduction) {
    health.deployment = {
      url: process.env.RENDER_URL,
      service: process.env.RENDER_SERVICE_NAME,
      commit: process.env.RENDER_GIT_COMMIT?.substring(0, 7) || 'unknown'
    };
  }

  res.json(health);
});

app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    message: 'EventEase API - Week 06 Complete Implementation',
    version: '1.0.0',
    week: 6,
    environment: process.env.NODE_ENV,
    deployed_on: isProduction ? 'Render' : 'Local',
    production_url: 'https://eventease-api.onrender.com',
    documentation: '/api-docs',
    features: [
      '✅ Users CRUD with Enhanced Validation',
      '✅ Events CRUD with Enhanced Validation',
      '✅ Invitations Collection (Week 06)',
      '✅ RSVPs Collection (Week 06)',
      '✅ Google OAuth 2.0 Authentication',
      '✅ JWT Token Authentication',
      '✅ Unit Testing with Jest',
      '✅ MongoDB Atlas Integration',
      '✅ Swagger API Documentation',
      '✅ Deployment on Render'
    ],
    endpoints: {
      documentation: '/api-docs',
      health: '/health',
      api_info: '/api/info',
      users: '/api/users',
      events: '/api/events',
      invitations: '/api/invitations',
      rsvps: '/api/rsvps',
      auth: '/api/auth'
    },
    team: [
      'Henry Osuagwu - OAuth & Authentication',
      'Daniel Okoye - Invitations Collection',
      'Amina Collins - RSVPs Collection',
      'Michael Adeyemi - Validation & Testing'
    ]
  });
});

/* --------------------------------
   404 HANDLER
---------------------------------- */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    documentation: '/api-docs',
    available_endpoints: {
      users: '/api/users',
      events: '/api/events',
      invitations: '/api/invitations',
      rsvps: '/api/rsvps',
      auth: '/api/auth'
    }
  });
});

/* --------------------------------
   ERROR HANDLER
---------------------------------- */
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  const response = {
    success: false,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };

  // Only show stack trace in development
  if (isDevelopment) {
    response.stack = err.stack;
    response.error = err.toString();
  }

  res.status(statusCode).json(response);
});

/* --------------------------------
   START SERVER 
---------------------------------- */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🎉 ============================================`);
    console.log(`   EventEase API Server Started`);
    console.log(`   ============================================`);
    console.log(`   🚀 Server: http://localhost:${PORT}`);
    console.log(`   📚 Docs: http://localhost:${PORT}/api-docs`);
    console.log(`   🏥 Health: http://localhost:${PORT}/health`);
    console.log(`   ℹ️  Info: http://localhost:${PORT}/api/info`);
    console.log(`   🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`   🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   📊 Database: ✅ Connected`);
    console.log(`   🎯 Week 06: ✅ Complete`);
    
    if (isProduction) {
      console.log(`   🚀 Production URL: https://eventease-api.onrender.com`);
      console.log(`   ☁️  Deployed on: Render.com`);
    }
    
    console.log(`   ============================================\n`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database. Server not started.');
  if (!isProduction) {
    console.log('💡 Development Tips:');
    console.log('1. Check if MongoDB is running locally: mongod');
    console.log('2. Check your .env file MONGODB_URI');
    console.log('3. For Atlas: Check IP whitelist and network access');
  }
  process.exit(1);
});