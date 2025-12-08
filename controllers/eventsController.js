const Event = require('../models/Event');
const validator = require('validator');

/* -----------------------------------------------------
   VALIDATION: EVENT CREATION
----------------------------------------------------- */
const validateEventCreation = (req, res, next) => {
  const { title, description, date, time, location, category } = req.body;

  const errors = [];

  if (!title || title.trim().length < 3) errors.push('Title must be at least 3 characters long');
  if (title && title.length > 100) errors.push('Title cannot exceed 100 characters');

  if (description && description.length > 2000)
    errors.push('Description cannot exceed 2000 characters');

  if (!date || !validator.isDate(date, { format: 'YYYY-MM-DD', strictMode: true }))
    errors.push('Valid date in YYYY-MM-DD format is required');

  if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
    errors.push('Time must be in HH:MM format (24-hour)');

  if (!location || location.trim().length < 3)
    errors.push('Location must be at least 3 characters long');

  if (location && location.length > 200)
    errors.push('Location cannot exceed 200 characters');

  if (category && !['wedding', 'birthday', 'conference', 'meeting', 'party', 'other'].includes(category))
    errors.push('Invalid category – choose from wedding, birthday, conference, meeting, party, other');

  if (errors.length > 0)
    return res.status(400).json({ success: false, message: 'Validation failed', errors });

  next();
};

/* -----------------------------------------------------
   VALIDATION: EVENT UPDATE
----------------------------------------------------- */
const validateEventUpdate = (req, res, next) => {
  const { title, description, date, time, location, category, status } = req.body;

  const errors = [];

  if (title !== undefined) {
    if (title.trim().length < 3) errors.push('Title must be at least 3 characters long');
    if (title.length > 100) errors.push('Title cannot exceed 100 characters');
  }

  if (description !== undefined && description.length > 2000)
    errors.push('Description cannot exceed 2000 characters');

  if (date !== undefined && !validator.isDate(date, { format: 'YYYY-MM-DD', strictMode: true }))
    errors.push('Valid date in YYYY-MM-DD format is required');

  if (time !== undefined && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
    errors.push('Time must be in HH:MM format (24-hour)');

  if (location !== undefined) {
    if (location.trim().length < 3) errors.push('Location must be at least 3 characters long');
    if (location.length > 200) errors.push('Location cannot exceed 200 characters');
  }

  if (category !== undefined && !['wedding', 'birthday', 'conference', 'meeting', 'party', 'other'].includes(category))
    errors.push('Invalid category');

  if (status !== undefined && !['draft', 'published', 'cancelled', 'completed'].includes(status))
    errors.push('Invalid status');

  if (errors.length > 0)
    return res.status(400).json({ success: false, message: 'Validation failed', errors });

  next();
};

/* -----------------------------------------------------
   CREATE EVENT
----------------------------------------------------- */
const createEvent = async (req, res) => {  // Changed from createEventHandler
  try {
    const { title, description, date, time, location, category, capacity, price } = req.body;
    const organizerId = req.user._id;

    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today)
      return res.status(400).json({ success: false, message: 'Event date must be in the future' });

    if (capacity && (capacity < 1 || capacity > 10000))
      return res.status(400).json({ success: false, message: 'Capacity must be 1 to 10,000' });

    if (price && price < 0)
      return res.status(400).json({ success: false, message: 'Price cannot be negative' });

    const event = await Event.create({
      title,
      description,
      date: eventDate,
      time,
      location,
      category: category || 'other',
      capacity: capacity || 100,
      price: price || 0,
      organizerId,
      status: 'draft',
    });

    await event.populate('organizerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });

  } catch (error) {
    console.error('Create event error:', error);

    if (error.name === 'ValidationError')
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });

    res.status(500).json({ success: false, message: 'Server error creating event' });
  }
};

/* -----------------------------------------------------
   GET ALL EVENTS
----------------------------------------------------- */
const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizerId', 'name email')
      .sort({ date: 1, createdAt: -1 });

    res.json({ success: true, count: events.length, data: events });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching events' });
  }
};

/* -----------------------------------------------------
   GET SINGLE EVENT
----------------------------------------------------- */
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email');

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    res.json({ success: true, data: event });

  } catch (error) {
    console.error('Get event error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    res.status(500).json({ success: false, message: 'Server error fetching event' });
  }
};

/* -----------------------------------------------------
   UPDATE EVENT
----------------------------------------------------- */
const updateEvent = async (req, res) => {  // Changed from updateEventHandler
  try {
    let event = await Event.findById(req.params.id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizerId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });

    if (req.body.date) {
      const incomingDate = new Date(req.body.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (incomingDate < today)
        return res.status(400).json({
          success: false,
          message: 'Event date must be in the future'
        });
    }

    if (req.body.capacity && (req.body.capacity < 1 || req.body.capacity > 10000))
      return res.status(400).json({ success: false, message: 'Capacity must be 1 to 10,000' });

    if (req.body.price && req.body.price < 0)
      return res.status(400).json({ success: false, message: 'Price cannot be negative' });

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizerId', 'name email');

    res.json({ success: true, message: 'Event updated successfully', data: event });

  } catch (error) {
    console.error('Update event error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    if (error.name === 'ValidationError')
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });

    res.status(500).json({ success: false, message: 'Server error updating event' });
  }
};

/* -----------------------------------------------------
   DELETE EVENT
----------------------------------------------------- */
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event)
      return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizerId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });

    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Delete event error:', error);

    if (error.kind === 'ObjectId')
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    res.status(500).json({ success: false, message: 'Server error deleting event' });
  }
};

/* -----------------------------------------------------
   EXPORT (CORRECTED - NO ARRAYS!)
----------------------------------------------------- */
module.exports = {
  // Controller functions
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  
  // Validation middleware functions (export separately)
  validateEventCreation,
  validateEventUpdate
};