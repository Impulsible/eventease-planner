const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EventEase Planner API',
      version: '1.0.0',
      description: 'A comprehensive event planning and RSVP management API',
      contact: {
        name: 'EventEase Team',
        email: 'support@eventease.com'
      },
      license: {
        name: 'Apache 2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://yourapp.onrender.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Events',
        description: 'Event management endpoints'
      }
    ]
  },
  apis: ['./routes/*.js'] // Path to the API routes
};

const specs = swaggerJsdoc(options);
module.exports = specs;