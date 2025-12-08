const request = require('supertest');
const app = require('../server'); // Your Express app
const User = require('../models/User');
const { createTestUser, generateTestToken } = require('./helpers');

describe('Users API Tests', () => {
  describe('GET /api/users', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    test('should return all users with valid token', async () => {
      // Create test users
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com', role: 'guest' });
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${user1.token}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    test('should filter users by role', async () => {
      const organizer = await createTestUser({ email: 'organizer@example.com', role: 'organizer' });
      
      const response = await request(app)
        .get('/api/users?role=organizer')
        .set('Authorization', `Bearer ${organizer.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(user => user.role === 'organizer')).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return user by ID', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(user._id.toString());
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    test('should return 404 for non-existent user', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011') // Non-existent ObjectId
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    test('should return 400 for invalid user ID format', async () => {
      const user = await createTestUser();
      
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid user ID');
    });
  });

  describe('POST /api/users', () => {
    test('should create a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'guest'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User created successfully');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    test('should return 400 for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should return 400 for short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password must be at least 6');
    });

    test('should return 400 for duplicate email', async () => {
      const existingUser = await createTestUser({ email: 'duplicate@example.com' });
      
      const userData = {
        name: 'Another User',
        email: 'duplicate@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
});