const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');
const auth = require('../middleware/auth'); // Import auth middleware

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Send token response (used by API login)
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message: 'Authentication successful',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Authentication successful
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439011
 *                 name:
 *                   type: string
 *                   example: John Doe
 *                 email:
 *                   type: string
 *                   example: john@example.com
 *                 role:
 *                   type: string
 *                   example: guest
 *                 avatar:
 *                   type: string
 *                   example: https://example.com/avatar.jpg
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: OAuth 2.0 authentication endpoints
 */

/* -------------------------------------------------------
   GOOGLE OAUTH (Web Redirect Flow)
--------------------------------------------------------- */

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth 2.0 flow
 *     description: Redirects to Google OAuth consent screen for authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth
 *         headers:
 *           Location:
 *             description: Google OAuth URL
 *             schema:
 *               type: string
 */
router.get(
  '/google',
  (req, res, next) => {
    console.log('🌐 Initiating Google OAuth from:', req.get('origin'));
    console.log('📝 Callback URL will be:', 
      process.env.NODE_ENV === 'production' 
        ? 'https://eventease-planner.onrender.com/api/auth/google/callback'
        : 'http://localhost:3000/api/auth/google/callback'
    );
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    accessType: 'offline',
    prompt: 'consent'
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback endpoint
 *     description: Google redirects here after authentication. Returns JWT token.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication successful, returns HTML page with token
 *       401:
 *         description: Authentication failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/failure',
    session: false
  }),
  (req, res) => {
    try {
      console.log('✅ Google OAuth successful for user:', req.user.email);

      const token = generateToken(req.user._id);

      // Set cookie with correct sameSite for production
      const cookieOptions = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      };

      res.cookie('token', token, cookieOptions);

      // Pretty HTML success response
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>EventEase - Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #4a5568;
              margin-bottom: 20px;
            }
            .success-icon {
              font-size: 60px;
              color: #48bb78;
              margin-bottom: 20px;
            }
            .token-box {
              background: #f7fafc;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
              font-size: 12px;
              color: #2d3748;
              border: 1px solid #e2e8f0;
            }
            .instructions {
              background: #e6fffa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              text-align: left;
              font-size: 14px;
            }
            code {
              background: #edf2f7;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
            .button {
              display: inline-block;
              background: #4299e1;
              color: white;
              padding: 12px 24px;
              border-radius: 5px;
              text-decoration: none;
              margin-top: 20px;
              font-weight: bold;
            }
            .button:hover {
              background: #3182ce;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>🎉 Authentication Successful!</h1>
            <p>Welcome to EventEase, <strong>${req.user.name}</strong>!</p>
            
            <p>Your JWT Token:</p>
            <div class="token-box">${token}</div>
            
            <div class="instructions">
              <p><strong>How to use this token:</strong></p>
              <p>1. Copy the token above</p>
              <p>2. In Swagger UI, click "Authorize"</p>
              <p>3. Enter: <code>Bearer ${token}</code></p>
              <p>4. Click "Authorize"</p>
            </div>
            
            <p>
              <a href="${process.env.FRONTEND_URL || 'https://eventease-planner.onrender.com'}" class="button">
                Go to EventEase
              </a>
            </p>
          </div>
          <script>
            // Store token in localStorage for frontend use
            localStorage.setItem('eventease_token', '${token}');
            localStorage.setItem('eventease_user', JSON.stringify({
              id: '${req.user._id}',
              name: '${req.user.name}',
              email: '${req.user.email}',
              role: '${req.user.role}'
            }));
            console.log('Token stored in localStorage');
            
            // Auto-close after 5 seconds if opened in popup
            if (window.opener) {
              setTimeout(() => {
                window.close();
              }, 5000);
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('❌ Google callback error:', error);
      res.redirect('/api/auth/failure');
    }
  }
);

// OAuth failure endpoint
/**
 * @swagger
 * /api/auth/failure:
 *   get:
 *     summary: OAuth failure endpoint
 *     tags: [Authentication]
 *     responses:
 *       401:
 *         description: OAuth authentication failed
 */
router.get('/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google OAuth authentication failed',
    error: 'Please check your Google OAuth credentials and callback URL'
  });
});

/* -------------------------------------------------------
   GOOGLE ID TOKEN LOGIN (API → Mobile / React Native Flow)
--------------------------------------------------------- */

/**
 * @swagger
 * /api/auth/google/login:
 *   post:
 *     summary: Google ID token login (for mobile apps)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from mobile SDK
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing ID token
 *       500:
 *         description: Invalid token or server error
 */
router.post('/google/login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    console.log('🔐 Verifying Google ID token...');

    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    const { sub: googleId, email, name, picture } = googleResponse.data;

    console.log('✅ Token verified for email:', email);

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.isVerified = true;
        user.avatar = picture;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          googleId,
          name,
          email,
          password: `google-auth-${Date.now()}`,
          role: 'guest',
          isVerified: true,
          avatar: picture
        });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('❌ Google login error:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid Google token or server error',
      error: error.message
    });
  }
});

/* -------------------------------------------------------
   TEST ENDPOINTS / UTILITIES
--------------------------------------------------------- */

/**
 * @swagger
 * /api/auth/test:
 *   get:
 *     summary: Test authentication endpoints
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Returns available auth endpoints
 */
router.get('/test', (req, res) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://eventease-planner.onrender.com'
    : `http://localhost:${process.env.PORT || 3000}`;
  
  res.json({
    success: true,
    message: 'EventEase OAuth System is Running',
    environment: process.env.NODE_ENV,
    baseUrl,
    endpoints: {
      web_oauth: `${baseUrl}/api/auth/google`,
      id_token_login: 'POST /api/auth/google/login',
      status: 'GET /api/auth/status',
      me: 'GET /api/auth/me (protected)',
      logout: 'GET /api/auth/logout',
      test_user: 'POST /api/auth/test-user',
      failure: 'GET /api/auth/failure'
    },
    google_oauth_configured: !!process.env.GOOGLE_CLIENT_ID
  });
});

/**
 * @swagger
 * /api/auth/google/login:
 *   get:
 *     summary: Get Google login information
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Returns Google OAuth information
 */
router.get('/google/login', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth API Running',
    callback_url: process.env.NODE_ENV === 'production'
      ? 'https://eventease-planner.onrender.com/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback',
    client_id: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
    endpoints: {
      web_oauth: 'GET /api/auth/google',
      id_token_login: 'POST /api/auth/google/login'
    }
  });
});

/**
 * @swagger
 * /api/auth/test-user:
 *   post:
 *     summary: Create test user (for development)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Test User
 *               email:
 *                 type: string
 *                 example: test@example.com
 *               role:
 *                 type: string
 *                 enum: [organizer, guest]
 *                 example: guest
 *     responses:
 *       200:
 *         description: Test user created and logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/test-user', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || 'Test User',
        email,
        password: 'password123',
        role: role || 'guest'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Test user error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error creating test user',
      error: err.message 
    });
  }
});

/* -------------------------------------------------------
   AUTH HELPERS (PROTECTED ENDPOINTS)
--------------------------------------------------------- */

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.get('/logout', auth, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns current user data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user data' 
    });
  }
});

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Returns authentication status
 */
router.get('/status', (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.json({ 
        authenticated: false,
        message: 'No authentication token found' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    res.json({ 
      authenticated: true,
      message: 'User is authenticated' 
    });
  } catch (error) {
    res.json({ 
      authenticated: false,
      message: 'Invalid or expired token' 
    });
  }
});

// Simple redirect for easier testing
router.get('/redirect', (req, res) => {
  res.redirect('/api/auth/google');
});

/* ------------------------------------------------------- */
module.exports = router;