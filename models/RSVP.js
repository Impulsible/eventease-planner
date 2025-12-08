const mongoose = require('mongoose');

const rsvpSchema = new mongoose.Schema({
  invitationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invitation',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['going', 'maybe', 'not_going'],
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  respondedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RSVP', rsvpSchema);