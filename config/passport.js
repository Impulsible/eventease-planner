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

// Passport Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth Profile Received:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });

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
              password: `google-auth-${Date.now()}`, // Avoid static dummy password
              role: 'guest', // Default role
              isVerified: true,
              avatar: profile.photos[0]?.value
            });

            console.log('✅ Created new user with Google OAuth:', user.email);
          }
        }

        // Update last login timestamp
        user.lastLogin = new Date();
        await user.save();

        // Attach JWT token for immediate API use
        user.token = generateToken(user._id);

        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error);
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
    done(error, null);
  }
});

module.exports = passport;
