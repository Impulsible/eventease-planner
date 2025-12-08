const request = require('supertest');
const app = require('../server');
const Event = require('../models/Event');
const { createTestUser, createTestEvent } = require('./helpers');

describe('Events API Tests', () => {
  describe('GET /api/events', () => {
    test('should return all events', async () => {
      const user = await createTestUser();
      await createTestEvent(Event, user);
      await createTestEvent(Event, user, { title: 'Second Event' });
      
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter events by status', async () => {
      const user = await createTestUser();
      await createTestEvent(Event, user, { status: 'published' });
      await createTestEvent(Event, user, { status: 'draft' });
      
      const response = await request(app)
        .get('/api/events?status=published')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(event => event.status === 'published')).toBe(true);
    });

    test('should filter events by category', async () => {
      const user = await createTestUser();
      await createTestEvent(Event, user, { category: 'wedding' });
      await createTestEvent(Event, user, { category: 'conference' });
      
      const response = await request(app)
        .get('/api/events?category=wedding')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(event => event.category === 'wedding')).toBe(true);
    });
  });

  describe('GET /api/events/:id', () => {
    test('should return event by ID', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(Event, user);
      
      const response = await request(app)
        .get(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(event._id.toString());
      expect(response.body.data.title).toBe(event.title);
    });

    test('should return 404 for non-existent event', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .get('/api/events/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Event not found');
    });
  });

  describe('POST /api/events', () => {
    test('should create a new event with valid data', async () => {
      const user = await createTestUser();
      
      const eventData = {
        title: 'Test Conference',
        description: 'Annual technology conference',
        date: '2024-12-15',
        time: '09:00',
        location: 'Convention Center',
        category: 'conference',
        capacity: 500,
        price: 100
      };
      
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${user.token}`)
        .send(eventData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.organizerId).toBe(user._id.toString());
    });

    test('should return 400 for invalid date format', async () => {
      const user = await createTestUser();
      
      const eventData = {
        title: 'Test Event',
        date: '15-12-2024', // Wrong format
        time: '14:00',
        location: 'Test Location'
      };
      
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${user.token}`)
        .send(eventData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should return 400 for past date', async () => {
      const user = await createTestUser();
      
      const eventData = {
        title: 'Past Event',
        date: '2020-01-01',
        time: '14:00',
        location: 'Test Location'
      };
      
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${user.token}`)
        .send(eventData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Event date must be in the future');
    });
  });
});