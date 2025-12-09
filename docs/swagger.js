const swaggerJsdoc = require('swagger-jsdoc');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Base URLs
const developmentUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const productionUrl = process.env.RENDER_URL || 'https://eventease-api.onrender.com';


const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EventEase Planner API',
      version: '1.0.0',
      description: '🎉 **Event Planning and Management API with OAuth Authentication**\n\n### 🔗 **API Servers:**\n- **Development:** `http://localhost:3000`\n- **Production:** `https://eventease-api.onrender.com`\n\n### 🔐 **Authentication:**\n1. Register/Login to get JWT token\n2. Use Google OAuth for social login\n3. Add token to headers: `Authorization: Bearer <token>`\n\n### 📚 **Collections:**\n- **Users** - User management\n- **Events** - Event management\n- **Invitations** - Event invitations\n- **RSVPs** - Guest responses\n\n### 🚀 **Deployed on:** Render.com',
      contact: {
        name: 'EventEase Team',
        email: 'support@eventease.com',
        url: 'https://eventease-api.onrender.com'
      },
      license: {
        name: 'Apache 2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
      },
      termsOfService: 'https://eventease-api.onrender.com/terms'
    },
    
    // Multiple servers for different environments
    servers: [
      {
        url: developmentUrl,
        description: '🛠️ Development Server (Localhost)',
        variables: {
          port: {
            enum: [3000, 5000, 8080],
            default: 3000
          }
        }
      },
      {
        url: productionUrl,
        description: '🚀 Production Server (Render)',
        variables: {
          version: {
            default: 'v1',
            description: 'API Version'
          }
        }
      }
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from login/register endpoints'
        },
        googleOAuth: {
          type: 'oauth2',
          description: 'Google OAuth 2.0 Authentication',
          flows: {
            authorizationCode: {
              authorizationUrl: `${productionUrl}/api/auth/google`,
              tokenUrl: `${productionUrl}/api/auth/google/callback`,
              scopes: {
                profile: 'Access your profile information',
                email: 'Access your email address'
              }
            }
          }
        }
      },
      
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      },
      
      parameters: {
        authHeader: {
          name: 'Authorization',
          in: 'header',
          description: 'JWT token for authentication',
          required: true,
          schema: {
            type: 'string',
            example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        },
        eventIdParam: {
          name: 'eventId',
          in: 'path',
          description: 'Event ID',
          required: true,
          schema: {
            type: 'string',
            format: 'ObjectId',
            example: '507f1f77bcf86cd799439011'
          }
        },
        invitationIdParam: {
          name: 'invitationId',
          in: 'path',
          description: 'Invitation ID',
          required: true,
          schema: {
            type: 'string',
            format: 'ObjectId',
            example: '507f1f77bcf86cd799439012'
          }
        }
      }
    },

    security: [
      {
        bearerAuth: []
      }
    ],

    tags: [
      { 
        name: 'Authentication', 
        description: '🔐 OAuth and JWT authentication endpoints',
        externalDocs: {
          description: 'Learn about OAuth',
          url: 'https://oauth.net/2/'
        }
      },
      { 
        name: 'Users', 
        description: '👥 User management and profiles',
        externalDocs: {
          description: 'User Model Schema',
          url: 'https://eventease-api.onrender.com/api-docs#/components/schemas/User'
        }
      },
      { 
        name: 'Events', 
        description: '📅 Event creation, management, and discovery',
        externalDocs: {
          description: 'Event Model Schema',
          url: 'https://eventease-api.onrender.com/api-docs#/components/schemas/Event'
        }
      },
      { 
        name: 'Invitations', 
        description: '📩 Send and manage event invitations',
        externalDocs: {
          description: 'Week 06 Feature',
          url: 'https://github.com/yourusername/eventease-api'
        }
      },
      { 
        name: 'RSVPs', 
        description: '✅ Guest responses and attendance tracking',
        externalDocs: {
          description: 'Week 06 Feature',
          url: 'https://github.com/yourusername/eventease-api'
        }
      },
      { 
        name: 'Health', 
        description: '🏥 API health and status checks' 
      }
    ],
    
    externalDocs: {
      description: 'GitHub Repository',
      url: 'https://github.com/yourusername/eventease-api'
    }
  },

  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
    './docs/*.js'
  ]
};

const specs = swaggerJsdoc(options);
module.exports = specs;

/* =============================
    HEALTH ENDPOINT DOCUMENTATION
   ============================= */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: running
 *                 db:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: production
 *                 deployed_url:
 *                   type: string
 *                   example: https://eventease-api.onrender.com
 *       500:
 *         description: API is not healthy
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: EventEase API is running
 *                 docs:
 *                   type: string
 *                   example: /api-docs
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 week:
 *                   type: number
 *                   example: 6
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "Users CRUD"
 *                     - "Events CRUD"
 *                     - "Invitations CRUD"
 *                     - "RSVPs CRUD"
 *                     - "Google OAuth"
 *                     - "JWT Authentication"
 *                 deployed_on:
 *                   type: string
 *                   example: Render
 *                 production_url:
 *                   type: string
 *                   example: https://eventease-api.onrender.com
 */


/* =============================
    WEEK 06 FEATURES DOCUMENTATION
   ============================= */

/**
 * @swagger
 * /api/invitations/test:
 *   get:
 *     summary: Test Invitations endpoint
 *     tags: [Invitations]
 *     description: Week 06 Feature - Test if Invitations API is working
 *     responses:
 *       200:
 *         description: Invitations API is working
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @swagger
 * /api/rsvps/test:
 *   get:
 *     summary: Test RSVPs endpoint
 *     tags: [RSVPs]
 *     description: Week 06 Feature - Test if RSVPs API is working
 *     responses:
 *       200:
 *         description: RSVPs API is working
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */