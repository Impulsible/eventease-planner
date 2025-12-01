const express = require('express');
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventsController');
const auth = require('../middleware/auth');

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
 *         - time
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
 *           description: Event date
 *         time:
 *           type: string
 *           description: Event time
 *         location:
 *           type: string
 *           description: Event location
 *         organizerId:
 *           type: string
 *           description: ID of the event organizer
 *         status:
 *           type: string
 *           enum: [active, cancelled, completed]
 *           default: active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

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
 *               - time
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: Summer BBQ Party
 *               description:
 *                 type: string
 *                 example: Annual summer barbecue with friends and family
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2024-07-15
 *               time:
 *                 type: string
 *                 example: "18:00"
 *               location:
 *                 type: string
 *                 example: Central Park, New York
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', auth, createEvent);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of all events
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
 *     responses:
 *       200:
 *         description: Event data
 *       404:
 *         description: Event not found
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Summer BBQ Party
 *               description:
 *                 type: string
 *                 example: Updated description
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2024-07-20
 *               time:
 *                 type: string
 *                 example: "19:00"
 *               location:
 *                 type: string
 *                 example: Updated Location
 *               status:
 *                 type: string
 *                 enum: [active, cancelled, completed]
 *                 example: active
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       403:
 *         description: Not authorized to update this event
 *       404:
 *         description: Event not found
 */
router.put('/:id', auth, updateEvent);

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
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       403:
 *         description: Not authorized to delete this event
 *       404:
 *         description: Event not found
 */
router.delete('/:id', auth, deleteEvent);

module.exports = router;