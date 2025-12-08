const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'accepted', 'declined'],
    default: 'pending'
  },
  sentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure one invitation per guest per event
invitationSchema.index({ eventId: 1, guestId: 1 }, { unique: true });

module.exports = mongoose.model('Invitation', invitationSchema);