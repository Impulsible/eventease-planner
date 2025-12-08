const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Event = require('../models/Event');
const Invitation = require('../models/Invitation');
const { createTestUser, createTestEvent, createTestInvitation } = require('./helpers');

describe('Invitations API Tests', () => {
  let organizer, guest, event;

  beforeEach(async () => {
    // Create organizer and guest users
    organizer = await createTestUser({ email: 'organizer@example.com' });
    guest = await createTestUser({ email: 'guest@example.com', role: 'guest' });
    
    // Create an event
    event = await createTestEvent(Event, organizer);
  });

  describe('GET /api/invitations', () => {
    test('should return invitations for organizer', async () => {
      const invitation = await createTestInvitation(Invitation, event, guest);
      
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0]._id).toBe(invitation._id.toString());
    });

    test('should return invitations for guest', async () => {
      const invitation = await createTestInvitation(Invitation, event, guest);
      
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${guest.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(inv => inv.guestId._id === guest._id.toString())).toBe(true);
    });

    test('should filter invitations by status', async () => {
      await createTestInvitation(Invitation, event, guest, { status: 'sent' });
      await createTestInvitation(Invitation, event, guest, { status: 'pending' });
      
      const response = await request(app)
        .get('/api/invitations?status=sent')
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(inv => inv.status === 'sent')).toBe(true);
    });
  });

  describe('POST /api/invitations', () => {
    test('should create a new invitation', async () => {
      const invitationData = {
        eventId: event._id,
        guestId: guest._id,
        message: 'Please join our event!'
      };
      
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send(invitationData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId._id).toBe(event._id.toString());
      expect(response.body.data.guestId._id).toBe(guest._id.toString());
    });

    test('should return 403 if not organizer', async () => {
      const invitationData = {
        eventId: event._id,
        guestId: guest._id
      };
      
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${guest.token}`)
        .send(invitationData)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    test('should return 400 for duplicate invitation', async () => {
      await createTestInvitation(Invitation, event, guest);
      
      const invitationData = {
        eventId: event._id,
        guestId: guest._id
      };
      
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send(invitationData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/invitations/my-invitations', () => {
    test('should return only user\'s invitations', async () => {
      // Create invitations for different guests
      const guest2 = await createTestUser({ email: 'guest2@example.com', role: 'guest' });
      await createTestInvitation(Invitation, event, guest);
      await createTestInvitation(Invitation, event, guest2);
      
      const response = await request(app)
        .get('/api/invitations/my-invitations')
        .set('Authorization', `Bearer ${guest.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(inv => inv.guestId._id === guest._id.toString())).toBe(true);
    });
  });
});