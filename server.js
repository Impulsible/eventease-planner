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

// Conditionally load passport configuration
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
if (hasGoogleCredentials) {
  require('./config/passport');
  console.log('✅ Google OAuth credentials found');
} else {
  console.log('⚠️ Google OAuth not configured - /api/auth/google routes will not work');
}

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
console.log(`🔐 Google OAuth: ${hasGoogleCredentials ? '✅ Configured' : '❌ Missing'}`);

/* --------------------------------
   GLOBAL MIDDLEWARE
---------------------------------- */
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: isProduction,
}));

// CORS configuration based on environment
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://eventease-planner.onrender.com',
      'https://eventease-api.onrender.com' // Keep both for safety
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
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
    console.log('🔗 Attempting MongoDB connection...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');
    
    // Safely get connection information
    if (conn.connection) {
      console.log(`📍 Host: ${conn.connection.host || 'Unknown'}`);
      console.log(`🔌 Port: ${conn.connection.port || 'Unknown'}`);
      
      // Try to get database name safely
      if (conn.connection.db) {
        console.log(`📊 Database: ${conn.connection.db.databaseName || 'Unknown'}`);
      } else {
        console.log('📊 Database connected (name unavailable)');
      }
    } else {
      console.log('📊 MongoDB connected (connection details unavailable)');
    }

    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    
    if (isProduction) {
      console.log('💡 Production MongoDB Tips:');
      console.log('1. Check if IP is whitelisted in MongoDB Atlas');
      console.log('2. Verify connection string is correct');
      console.log('3. Check network access in MongoDB Atlas');
      console.log('4. Make sure MONGODB_URI is set in Render environment variables');
    } else {
      console.log('💡 Development MongoDB Tips:');
      console.log('1. Check your .env file has MONGODB_URI');
      console.log('2. Check if MongoDB is running locally: mongod');
      console.log('3. Try connecting with MongoDB Compass');
    }
    
    // In production, exit if DB fails
    if (isProduction) {
      console.log('⏳ Waiting 5 seconds before exit...');
      setTimeout(() => process.exit(1), 5000);
    }
    
    throw err;
  }
};

mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
  console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
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
// Swagger UI options
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
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    displayOperationId: false,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
  }
};

// Serve Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req, res) => {
  res.json(swaggerSpecs);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerUiOptions));

/* --------------------------------
   HEALTH & INFO ENDPOINTS
---------------------------------- */
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = dbStatus === 1 ? 'connected' : 
                       dbStatus === 2 ? 'connecting' :
                       dbStatus === 3 ? 'disconnecting' : 'disconnected';
  
  const productionUrl = 'https://eventease-planner.onrender.com'; // CORRECTED URL
  
  res.json({
    success: true,
    message: `EventEase API is running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`,
    environment: process.env.NODE_ENV,
    version: '2.0.0',
    week: 6,
    deployed_on: isProduction ? 'Render' : 'Local',
    documentation: '/api-docs',
    health_check: '/health',
    api_info: '/api/info',
    production_url: productionUrl,
    current_url: isProduction ? productionUrl : `http://localhost:${PORT}`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatusText,
      readyState: dbStatus
    },
    features: [
      '✅ 4 Collections with Full CRUD',
      '✅ Enhanced Data Validation',
      '✅ Google OAuth Authentication',
      '✅ Unit Testing with Jest',
      '✅ Swagger Documentation'
    ]
  });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  const health = {
    success: true,
    status: 'running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: dbStatus,
    google_oauth: hasGoogleCredentials ? 'configured' : 'not configured',
    render: isProduction ? 'deployed' : 'local',
    version: '2.0.0'
  };

  if (isProduction) {
    health.deployment = {
      url: 'https://eventease-planner.onrender.com', // CORRECTED URL
      service: 'eventease-planner',
      commit: process.env.RENDER_GIT_COMMIT?.substring(0, 7) || 'unknown'
    };
  }

  res.json(health);
});

app.get('/api/info', (req, res) => {
  const features = [
    '✅ Users CRUD with Enhanced Validation',
    '✅ Events CRUD with Enhanced Validation',
    '✅ Invitations Collection (Week 06)',
    '✅ RSVPs Collection (Week 06)',
    '✅ JWT Token Authentication',
    '✅ Unit Testing with Jest',
    '✅ MongoDB Atlas Integration',
    '✅ Swagger API Documentation',
    '✅ Deployment on Render'
  ];
  
  if (hasGoogleCredentials) {
    features.splice(4, 0, '✅ Google OAuth 2.0 Authentication');
  } else {
    features.splice(4, 0, '⚠️ Google OAuth (configure environment variables)');
  }
  
  const productionUrl = 'https://eventease-planner.onrender.com'; // CORRECTED URL
  
  res.json({
    success: true,
    message: 'EventEase API - Week 06 Complete Implementation',
    version: '2.0.0',
    week: 6,
    environment: process.env.NODE_ENV,
    deployed_on: isProduction ? 'Render' : 'Local',
    production_url: productionUrl,
    current_url: isProduction ? productionUrl : `http://localhost:${PORT}`,
    documentation: '/api-docs',
    features: features,
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
async function startServer() {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`\n🎉 ============================================`);
      console.log(`   EventEase API Server Started`);
      console.log(`   ============================================`);
      console.log(`   🚀 Server: http://localhost:${PORT}`);
      console.log(`   📚 Docs: http://localhost:${PORT}/api-docs`);
      console.log(`   🏥 Health: http://localhost:${PORT}/health`);
      console.log(`   ℹ️  Info: http://localhost:${PORT}/api/info`);
      console.log(`   🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`   🔐 Google OAuth: ${hasGoogleCredentials ? '✅ Configured' : '❌ Missing'}`);
      console.log(`   📊 Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`   🎯 Week 06: ✅ Complete`);
      
      if (isProduction) {
        console.log(`   🚀 Production URL: https://eventease-planner.onrender.com`); // CORRECTED
        console.log(`   ☁️  Deployed on: Render.com`);
      }
      
      console.log(`   ============================================\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    if (!isProduction) {
      console.log('💡 Development Tips:');
      console.log('1. Check if MongoDB is running locally: mongod');
      console.log('2. Check your .env file MONGODB_URI');
      console.log('3. For Atlas: Check IP whitelist and network access');
    }
    process.exit(1);
  }
}

startServer();