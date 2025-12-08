const Invitation = require('../models/Invitation');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Create a new invitation
// @route   POST /api/invitations
// @access  Private (Organizer only)
const createInvitation = async (req, res) => {
  try {
    const { eventId, guestId, message } = req.body;
    const organizerId = req.user._id;

    // Validation
    if (!eventId || !guestId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and Guest ID are required'
      });
    }

    // Check if event exists and user is the organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.organizerId.toString() !== organizerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to invite guests to this event'
      });
    }

    // Check if guest exists
    const guest = await User.findById(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check if guest is not the organizer
    if (guestId.toString() === organizerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot invite yourself to your own event'
      });
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({ eventId, guestId });
    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already exists for this guest'
      });
    }

    // Create invitation
    const invitation = await Invitation.create({
      eventId,
      guestId,
      organizerId,
      message: message || 'You are invited to this event!',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: invitation
    });

  } catch (error) {
    console.error('Create invitation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already exists for this guest'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error creating invitation'
    });
  }
};

// @desc    Get all invitations
// @route   GET /api/invitations
// @access  Private
const getInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find()
      .populate('eventId', 'title date location')
      .populate('guestId', 'name email')
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: invitations.length,
      data: invitations
    });
    
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching invitations'
    });
  }
};

// @desc    Get single invitation
// @route   GET /api/invitations/:id
// @access  Private
const getInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id)
      .populate('eventId', 'title description date time location')
      .populate('guestId', 'name email')
      .populate('organizerId', 'name email');
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    res.json({
      success: true,
      data: invitation
    });
    
  } catch (error) {
    console.error('Get invitation error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching invitation'
    });
  }
};

// @desc    Update invitation
// @route   PUT /api/invitations/:id
// @access  Private
const updateInvitation = async (req, res) => {
  try {
    const { message, status } = req.body;
    
    let invitation = await Invitation.findById(req.params.id);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Authorization: Only organizer can update
    if (invitation.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this invitation'
      });
    }
    
    // Update invitation
    invitation = await Invitation.findByIdAndUpdate(
      req.params.id,
      { message, status },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Invitation updated successfully',
      data: invitation
    });
    
  } catch (error) {
    console.error('Update invitation error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error updating invitation'
    });
  }
};

// @desc    Delete invitation
// @route   DELETE /api/invitations/:id
// @access  Private
const deleteInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Authorization: Only organizer can delete
    if (invitation.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this invitation'
      });
    }
    
    await Invitation.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Invitation deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete invitation error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error deleting invitation'
    });
  }
};

// @desc    Get my invitations (for guest)
// @route   GET /api/invitations/my-invitations
// @access  Private
const getMyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ guestId: req.user._id })
      .populate('eventId', 'title description date time location')
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: invitations.length,
      data: invitations
    });
    
  } catch (error) {
    console.error('Get my invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your invitations'
    });
  }
};

module.exports = {
  createInvitation,
  getInvitations,
  getInvitation,
  updateInvitation,
  deleteInvitation,
  getMyInvitations
};