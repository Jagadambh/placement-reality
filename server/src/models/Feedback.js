const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Optional, if they are logged in
  },
  name: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
  },
  websiteRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  websiteFeedback: {
    type: String,
    trim: true,
  },
  realityRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  realityFeedback: {
    type: String,
    trim: true,
  },
  otherFeedback: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'resolved'],
    default: 'new',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Feedback', feedbackSchema);
