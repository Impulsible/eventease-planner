const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate test JWT token
const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'organizer'
  };
  
  const user = await User.create({ ...defaultUser, ...userData });
  user.token = generateTestToken(user._id);
  return user;
};

// Create test event
const createTestEvent = async (Event, user, eventData = {}) => {
  const defaultEvent = {
    title: 'Test Event',
    description: 'Test event description',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    time: '14:00',
    location: 'Test Location',
    category: 'meeting',
    capacity: 100,
    price: 0,
    status: 'published'
  };
  
  return await Event.create({
    ...defaultEvent,
    organizerId: user._id,
    ...eventData
  });
};

// Create test invitation
const createTestInvitation = async (Invitation, event, guest, invitationData = {}) => {
  const defaultInvitation = {
    eventId: event._id,
    guestId: guest._id,
    organizerId: event.organizerId,
    message: 'You are invited!',
    status: 'pending'
  };
  
  return await Invitation.create({
    ...defaultInvitation,
    ...invitationData
  });
};

// Create test RSVP
const createTestRSVP = async (RSVP, invitation, rsvpData = {}) => {
  const defaultRSVP = {
    invitationId: invitation._id,
    userId: invitation.guestId,
    eventId: invitation.eventId,
    status: 'going',
    guestsCount: 1,
    notes: 'Looking forward to it!'
  };
  
  return await RSVP.create({
    ...defaultRSVP,
    ...rsvpData
  });
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestEvent,
  createTestInvitation,
  createTestRSVP
};