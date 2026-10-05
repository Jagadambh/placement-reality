const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  citations: [
    {
      collegeName: String,
      academicYear: String,
      sourceType: String,
      verificationTier: String,
      metricCited: String,
    }
  ],
  isVerifiedContextOnly: {
    type: Boolean,
    default: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const aiConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Placement Exploration',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AIConversation', aiConversationSchema);
