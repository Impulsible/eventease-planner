const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * PROTECT ROUTES — Requires valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.header('Authorization')?.startsWith('Bearer ')) {
      token = req.header('Authorization').replace('Bearer ', '');
    }
    // Extract token from cookies (OAuth or browser sessions)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message:
          error.name === 'TokenExpiredError'
            ? 'Token has expired.'
            : 'Invalid token.'
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

/**
 * ROLE-BASED AUTHORIZATION
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user?.role} is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * OPTIONAL AUTH — Allows public access but attaches user if token exists
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.header('Authorization')?.startsWith('Bearer ')) {
      token = req.header('Authorization').replace('Bearer ', '');
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // Ignore invalid tokens and proceed as unauthenticated
      }
    }

    next();
  } catch (error) {
    next(); // Always allow request to continue
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};
