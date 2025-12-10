const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

console.log('🔐 Loading passport configuration...');
console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);

// Get callback URL based on environment - UPDATED FOR PORT 5000
const getCallbackURL = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? 
    'https://eventease-planner.onrender.com' : 
    `http://localhost:${process.env.PORT || 5000}`;  // CHANGED: Use PORT from env
  
  return `${baseUrl}/api/auth/google/callback`;
};

const callbackURL = getCallbackURL();
console.log('🌐 Callback URL:', callbackURL);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('📨 Received Google profile for:', profile.displayName);
      
      // Try to find user by Google ID first
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        // If not found by Google ID, try by email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Update existing user with Google ID
          user.googleId = profile.id;
          await user.save();
          console.log('🔄 Updated existing user with Google ID:', user.email);
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            role: 'user'
          });
          console.log('👤 Created new user:', user.email);
        }
      } else {
        console.log('✅ Found existing Google user:', user.email);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('❌ Passport strategy error:', error);
      return done(error, null);
    }
  }
));

// Serialize/Deserialize for sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

console.log('✅ Passport configured successfully!');
module.exports = passport;