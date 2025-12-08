const RSVP = require('../models/RSVP');
const Invitation = require('../models/Invitation');

// @desc    Create RSVP response
// @route   POST /api/rsvps
// @access  Private
const createRSVP = async (req, res) => {
  try {
    const { invitationId, status, guestsCount, notes } = req.body;
    const userId = req.user._id;

    // Validation
    if (!invitationId) {
      return res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
    }

    if (!status || !['going', 'maybe', 'not_going'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid RSVP status (going, maybe, not_going) is required'
      });
    }

    // Check if invitation exists and user is the guest
    const invitation = await Invitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (invitation.guestId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to RSVP for this invitation'
      });
    }

    // Check if RSVP already exists
    const existingRSVP = await RSVP.findOne({ invitationId });
    if (existingRSVP) {
      return res.status(400).json({
        success: false,
        message: 'RSVP already submitted for this invitation'
      });
    }

    // Validate guestsCount
    const validatedGuestsCount = guestsCount || 1;
    if (validatedGuestsCount < 1 || validatedGuestsCount > 20) {
      return res.status(400).json({
        success: false,
        message: 'Number of guests must be between 1 and 20'
      });
    }

    // Create RSVP
    const rsvp = await RSVP.create({
      invitationId,
      userId,
      eventId: invitation.eventId,
      status,
      guestsCount: validatedGuestsCount,
      notes: notes || '',
      respondedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'RSVP submitted successfully',
      data: rsvp
    });

  } catch (error) {
    console.error('Create RSVP error:', error);
    
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
        message: 'RSVP already exists for this invitation'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error submitting RSVP'
    });
  }
};

// @desc    Get all RSVPs
// @route   GET /api/rsvps
// @access  Private
const getRSVPs = async (req, res) => {
  try {
    const rsvps = await RSVP.find()
      .populate('invitationId', 'message status')
      .populate('userId', 'name email')
      .populate('eventId', 'title date location')
      .sort({ respondedAt: -1 });
    
    res.json({
      success: true,
      count: rsvps.length,
      data: rsvps
    });
    
  } catch (error) {
    console.error('Get RSVPs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching RSVPs'
    });
  }
};

// @desc    Get single RSVP
// @route   GET /api/rsvps/:id
// @access  Private
const getRSVP = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(req.params.id)
      .populate('invitationId', 'message status')
      .populate('userId', 'name email')
      .populate('eventId', 'title date location');
    
    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }
    
    res.json({
      success: true,
      data: rsvp
    });
    
  } catch (error) {
    console.error('Get RSVP error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid RSVP ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching RSVP'
    });
  }
};

// @desc    Update RSVP
// @route   PUT /api/rsvps/:id
// @access  Private
const updateRSVP = async (req, res) => {
  try {
    const { status, guestsCount, notes } = req.body;
    
    let rsvp = await RSVP.findById(req.params.id);
    
    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }
    
    // Authorization: Only the user who created the RSVP can update it
    if (rsvp.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this RSVP'
      });
    }
    
    // Update RSVP
    rsvp = await RSVP.findByIdAndUpdate(
      req.params.id,
      { status, guestsCount, notes, respondedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'RSVP updated successfully',
      data: rsvp
    });
    
  } catch (error) {
    console.error('Update RSVP error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid RSVP ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error updating RSVP'
    });
  }
};

// @desc    Delete RSVP
// @route   DELETE /api/rsvps/:id
// @access  Private
const deleteRSVP = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(req.params.id);
    
    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }
    
    // Authorization: Only the user who created the RSVP can delete it
    if (rsvp.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this RSVP'
      });
    }
    
    await RSVP.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'RSVP deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete RSVP error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid RSVP ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error deleting RSVP'
    });
  }
};

// @desc    Get my RSVPs
// @route   GET /api/rsvps/my-rsvps
// @access  Private
const getMyRSVPs = async (req, res) => {
  try {
    const rsvps = await RSVP.find({ userId: req.user._id })
      .populate('invitationId', 'message status')
      .populate('eventId', 'title date location')
      .sort({ respondedAt: -1 });
    
    res.json({
      success: true,
      count: rsvps.length,
      data: rsvps
    });
    
  } catch (error) {
    console.error('Get my RSVPs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your RSVPs'
    });
  }
};

module.exports = {
  createRSVP,
  getRSVPs,
  getRSVP,
  updateRSVP,
  deleteRSVP,
  getMyRSVPs
};