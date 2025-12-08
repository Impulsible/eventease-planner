const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Invitation = require('../models/Invitation');
const RSVP = require('../models/RSVP');
const { createTestUser, createTestEvent, createTestInvitation, createTestRSVP } = require('./helpers');

describe('RSVPs API Tests', () => {
  let organizer, guest, event, invitation;

  beforeEach(async () => {
    organizer = await createTestUser({ email: 'organizer@example.com' });
    guest = await createTestUser({ email: 'guest@example.com', role: 'guest' });
    event = await createTestEvent(Event, organizer);
    invitation = await createTestInvitation(Invitation, event, guest, { status: 'accepted' });
  });

  describe('GET /api/rsvps', () => {
    test('should return RSVPs for organizer', async () => {
      const rsvp = await createTestRSVP(RSVP, invitation);
      
      const response = await request(app)
        .get('/api/rsvps')
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data[0]._id).toBe(rsvp._id.toString());
    });

    test('should return RSVPs for guest', async () => {
      const rsvp = await createTestRSVP(RSVP, invitation);
      
      const response = await request(app)
        .get('/api/rsvps')
        .set('Authorization', `Bearer ${guest.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.userId._id === guest._id.toString())).toBe(true);
    });

    test('should filter RSVPs by status', async () => {
      await createTestRSVP(RSVP, invitation, { status: 'going' });
      await createTestRSVP(RSVP, invitation, { status: 'maybe' });
      
      const response = await request(app)
        .get('/api/rsvps?status=going')
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(r => r.status === 'going')).toBe(true);
    });
  });

  describe('POST /api/rsvps', () => {
    test('should create a new RSVP', async () => {
      const rsvpData = {
        invitationId: invitation._id,
        status: 'going',
        guestsCount: 2,
        notes: 'Looking forward to it!'
      };
      
      const response = await request(app)
        .post('/api/rsvps')
        .set('Authorization', `Bearer ${guest.token}`)
        .send(rsvpData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('going');
      expect(response.body.data.guestsCount).toBe(2);
    });

    test('should return 403 if not the invited guest', async () => {
      const otherGuest = await createTestUser({ email: 'other@example.com', role: 'guest' });
      
      const rsvpData = {
        invitationId: invitation._id,
        status: 'going'
      };
      
      const response = await request(app)
        .post('/api/rsvps')
        .set('Authorization', `Bearer ${otherGuest.token}`)
        .send(rsvpData)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    test('should return 400 for invalid guest count', async () => {
      const rsvpData = {
        invitationId: invitation._id,
        status: 'going',
        guestsCount: 25 // Exceeds maximum
      };
      
      const response = await request(app)
        .post('/api/rsvps')
        .set('Authorization', `Bearer ${guest.token}`)
        .send(rsvpData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be between');
    });
  });

  describe('GET /api/rsvps/event/:eventId', () => {
    test('should return RSVPs for specific event', async () => {
      await createTestRSVP(RSVP, invitation);
      
      const response = await request(app)
        .get(`/api/rsvps/event/${event._id}`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data[0].eventId._id).toBe(event._id.toString());
      expect(response.body.stats).toBeDefined();
    });

    test('should return 403 if not event organizer', async () => {
      const response = await request(app)
        .get(`/api/rsvps/event/${event._id}`)
        .set('Authorization', `Bearer ${guest.token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
    });
  });
});