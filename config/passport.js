const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Determine callback URL based on environment
const getCallbackURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOOGLE_PRODUCTION_CALLBACK_URL || 
           'https://eventease-planner.onrender.com/api/auth/google/callback';
  }
  return process.env.GOOGLE_CALLBACK_URL || 
         'http://localhost:3000/api/auth/google/callback';
};

console.log('🔐 Passport Config Initialized');
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔗 Callback URL:', getCallbackURL());
console.log('📱 Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing');

// Passport Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackURL(),
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('🎯 Google OAuth Profile Received:', profile.id);
        console.log('📧 Email:', profile.emails?.[0]?.value);

        // Check if user already exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists with same email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.isVerified = true;
            user.avatar = profile.photos[0]?.value || user.avatar;

            console.log('✅ Linked Google account to existing user:', user.email);
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              password: `google-auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'guest',
              isVerified: true,
              avatar: profile.photos[0]?.value,
              authMethod: 'google'
            });

            console.log('✅ Created new user with Google OAuth:', user.email);
          }
        }

        // Update last login timestamp
        user.lastLogin = new Date();
        await user.save();

        // Attach JWT token for immediate API use
        user.token = generateToken(user._id);

        console.log('🎉 Google OAuth successful for:', user.email);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error.message);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialize error:', error);
    done(error, null);
  }
});

module.exports = passport;