const express = require('express');
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  validateEventCreation,
  validateEventUpdate
} = require('../controllers/eventsController');
const { protect } = require('../middleware/auth'); // Changed from auth to { protect }

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - date
 *         - location
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         title:
 *           type: string
 *           description: Event title
 *         description:
 *           type: string
 *           description: Event description
 *         date:
 *           type: string
 *           format: date
 *           description: Event date (YYYY-MM-DD)
 *         time:
 *           type: string
 *           description: Event time (HH:MM)
 *         location:
 *           type: string
 *           description: Event location
 *         category:
 *           type: string
 *           enum: [wedding, birthday, conference, meeting, party, other]
 *           default: other
 *         capacity:
 *           type: integer
 *           description: Maximum attendees
 *           default: 100
 *         price:
 *           type: number
 *           description: Event price
 *           default: 0
 *         organizerId:
 *           type: string
 *           description: ID of the event organizer
 *         status:
 *           type: string
 *           enum: [draft, published, cancelled, completed]
 *           default: draft
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Events route is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - date
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Summer BBQ Party
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: Annual summer barbecue with friends and family
 *               date:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2024-07-15'
 *               time:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: '18:00'
 *               location:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: Central Park, New York
 *               category:
 *                 type: string
 *                 enum: [wedding, birthday, conference, meeting, party, other]
 *                 example: party
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 example: 150
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 25.99
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input or validation failed
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/', protect, validateEventCreation, createEvent); // Added validation

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [wedding, birthday, conference, meeting, party, other]
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled, completed]
 *         description: Filter by status
 *       - in: query
 *         name: organizerId
 *         schema:
 *           type: string
 *         description: Filter by organizer ID
 *     responses:
 *       200:
 *         description: List of all events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       500:
 *         description: Server error
 */
router.get('/', getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Event data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid event ID format
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Updated Summer BBQ Party
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: Updated description with more details
 *               date:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 example: '2024-07-20'
 *               time:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: '19:00'
 *               location:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: 'Updated Park Location'
 *               category:
 *                 type: string
 *                 enum: [wedding, birthday, conference, meeting, party, other]
 *                 example: party
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10000
 *                 example: 200
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 30.00
 *               status:
 *                 type: string
 *                 enum: [draft, published, cancelled, completed]
 *                 example: published
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input or validation failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.put('/:id', protect, validateEventUpdate, updateEvent); // Added validation

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Event ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event deleted successfully
 *       400:
 *         description: Invalid event ID format
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', protect, deleteEvent);

module.exports = router;