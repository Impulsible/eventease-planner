const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');

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
    sameSite: 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
};

/* -------------------------------------------------------
   GOOGLE OAUTH (Web Redirect Flow)
--------------------------------------------------------- */

// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
router.get(
  '/google',
  (req, res, next) => {
    console.log('🌐 Initiating Google OAuth from:', req.get('origin'));
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    accessType: 'offline',
    prompt: 'consent'
  })
);

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
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

      // Set cookie
      res.cookie('token', token, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      // Pretty HTML success response
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
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
              max-width: 400px;
            }
            h1 {
              color: #4a5568;
              margin-bottom: 20px;
            }
            .token {
              background: #f7fafc;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
              font-size: 12px;
              color: #2d3748;
            }
            .info {
              color: #718096;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Authentication Successful!</h1>
            <p>Your JWT Token:</p>
            <div class="token">${token}</div>
            <div class="info">
              <p>Add to headers: <code>Authorization: Bearer ${token}</code></p>
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #4299e1;">Go to Homepage</a></p>
          </div>
          <script>
            localStorage.setItem('token', '${token}');
            console.log('Token stored in localStorage');
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

// OAuth failure
router.get('/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google OAuth authentication failed'
  });
});

/* -------------------------------------------------------
   GOOGLE ID TOKEN LOGIN (API → Mobile / React Native Flow)
--------------------------------------------------------- */

// @route   POST /api/auth/google/login
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

    console.log('✅ Token verified:', email);

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        user.googleId = googleId;
        user.isVerified = true;
        user.avatar = picture;
        await user.save();
      } else {
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

    return res.status(500).json({
      success: false,
      message: 'Invalid Google token or server error'
    });
  }
});

/* -------------------------------------------------------
   TEST ENDPOINTS / UTILITIES
--------------------------------------------------------- */

// @route   GET /api/auth/google/login
router.get('/google/login', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth API Running',
    endpoints: {
      web_oauth: 'GET /api/auth/google',
      id_token_login: 'POST /api/auth/google/login',
      status: 'GET /api/auth/status',
      me: 'GET /api/auth/me'
    }
  });
});

// Create test user
router.post('/test-user', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
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
    res.status(500).json({ success: false });
  }
});

/* -------------------------------------------------------
   AUTH HELPERS
--------------------------------------------------------- */

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    let token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Check auth status
router.get('/status', (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.json({ authenticated: false });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

/* ------------------------------------------------------- */
module.exports = router;
