const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || '4ccadca05c867e6d482c90a21ced7bdede1addedc9';

/* ================= GOOGLE OAUTH ROUTES ================= */

// 1. INITIATE GOOGLE LOGIN
// GET /api/auth/google
router.get('/google',
  (req, res, next) => {
    console.log('🚀 Starting Google OAuth login...');
    console.log('📋 Client ID configured:', !!process.env.GOOGLE_CLIENT_ID);
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

// 2. GOOGLE CALLBACK
// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/auth/failed',
    session: false
  }),
  async (req, res) => {
    try {
      console.log('✅ Google login successful!');
      console.log('👤 User:', req.user.email);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: req.user._id,
          email: req.user.email,
          name: req.user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Set HTTP-only cookie for browsers
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // If request wants JSON (API client)
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name
          }
        });
      }
      
      // For browser - simple success page
      const successHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Successful - EventEase</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              color: white;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            .user-info {
              background: rgba(255, 255, 255, 0.2);
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .token-box {
              background: rgba(0, 0, 0, 0.3);
              padding: 15px;
              border-radius: 10px;
              font-family: monospace;
              word-break: break-all;
              font-size: 14px;
              margin: 20px 0;
            }
            .btn {
              display: inline-block;
              background: white;
              color: #667eea;
              padding: 12px 30px;
              border-radius: 50px;
              text-decoration: none;
              font-weight: bold;
              margin: 10px;
              transition: transform 0.3s;
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Login Successful!</h1>
            <div class="user-info">
              <p><strong>Welcome, ${req.user.name}!</strong></p>
              <p>Email: ${req.user.email}</p>
            </div>
            <p>Your JWT Token (use for API requests):</p>
            <div class="token-box">${token}</div>
            <p>Copy this token and use it in the Authorization header:</p>
            <p><code>Authorization: Bearer ${token.substring(0, 30)}...</code></p>
            <div style="margin-top: 30px;">
              <a href="/api/auth/logout" class="btn">Logout</a>
              <a href="/" class="btn">Go to Home</a>
              <a href="/api-docs" class="btn">API Documentation</a>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.send(successHTML);

    } catch (error) {
      console.error('❌ Google callback error:', error);
      res.redirect('/api/auth/failed');
    }
  }
);

/* ================= AUTH STATUS & LOGOUT ================= */

// 3. LOGIN FAILED
// GET /api/auth/failed
router.get('/failed', (req, res) => {
  res.status(401).send(`
    <!DOCTYPE html>
    <html>
    <head><title>Login Failed</title></head>
    <body style="font-family: Arial; padding: 40px; text-align: center;">
      <h1 style="color: #ff4757;">❌ Login Failed</h1>
      <p>There was an error with Google authentication.</p>
      <p><a href="/api/auth/google" style="color: #3742fa;">Try Again</a></p>
      <p><a href="/">Go Home</a></p>
    </body>
    </html>
  `);
});

// 4. LOGOUT
// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('connect.sid');
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// 5. AUTH STATUS
// GET /api/auth/status
router.get('/status', protect, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

/* ================= DEBUG & INFO ================= */

// 6. TEST ROUTE - Check if auth routes are working
// GET /api/auth/test
router.get('/test', (req, res) => {
  const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    success: true,
    message: '✅ Authentication routes are working!',
    base_url: `${req.protocol}://${req.get('host')}`,
    environment: process.env.NODE_ENV || 'development',
    google_oauth: {
      configured: hasGoogleConfig,
      client_id: process.env.GOOGLE_CLIENT_ID ? 'Set ✓' : 'Not set ✗',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ? 'Set ✓' : 'Not set ✗'
    },
    endpoints: [
      { method: 'GET', path: '/api/auth/google', description: 'Start Google OAuth login' },
      { method: 'GET', path: '/api/auth/google/callback', description: 'Google OAuth callback' },
      { method: 'GET', path: '/api/auth/status', description: 'Check auth status (protected)' },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout user' },
      { method: 'GET', path: '/api/auth/test', description: 'Test endpoint' }
    ],
    instructions: hasGoogleConfig ? 
      'Visit /api/auth/google to start Google login' :
      'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file',
    timestamp: new Date().toISOString()
  });
});

// 7. SIMPLE LOGIN PAGE (for testing)
// GET /api/auth/login
router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>EventEase - Login</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
        }
        .login-box {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          text-align: center;
          width: 400px;
        }
        h1 { color: #333; margin-bottom: 30px; }
        .google-btn {
          background: #4285F4;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          transition: background 0.3s;
        }
        .google-btn:hover {
          background: #3367D6;
        }
        .google-icon {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          padding: 5px;
        }
        .test-links {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .test-links a {
          display: block;
          margin: 10px 0;
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>🔐 EventEase Login</h1>
        <p>Sign in with your Google account</p>
        <a href="/api/auth/google" style="text-decoration: none;">
          <button class="google-btn">
            <div class="google-icon">G</div>
            Sign in with Google
          </button>
        </a>
        <div class="test-links">
          <p>Test links:</p>
          <a href="/api/auth/test">Test Auth Routes</a>
          <a href="/api/auth/status">Check Auth Status</a>
          <a href="/api-docs">API Documentation</a>
          <a href="/">Home Page</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;