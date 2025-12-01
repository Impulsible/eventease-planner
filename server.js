const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');

// Import Swagger configuration
const swaggerSpecs = require('./docs/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 Please check:');
    console.log('   - MongoDB Atlas connection string');
    console.log('   - Internet connection');
    console.log('   - IP whitelist in MongoDB Atlas');
    process.exit(1);
  }
};

// Connect to database
connectDB();

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EventEase Planner API'
}));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'EventEase Planner API is running!',
    documentation: '/api-docs',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.db?.databaseName || 'unknown'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    success: true,
    server: 'running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV}`);
});