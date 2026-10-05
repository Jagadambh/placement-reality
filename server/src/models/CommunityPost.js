const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    postType: {
      type: String,
      enum: ['question', 'discussion', 'placement_insight', 'campus_life'],
      default: 'question',
    },
    flair: {
      type: String,
      enum: [
        'Ask Campus',
        'Placement Reality',
        'Discussion',
        'Academics',
        'Campus Life',
        'Fees & ROI',
        'Interview Prep',
        'Internships',
      ],
      default: 'Ask Campus',
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
      index: true,
    },
    collegeName: {
      type: String,
      default: 'General Campus Talk',
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    authorName: {
      type: String,
      default: 'Student',
    },
    authorPseudonym: {
      type: String,
      default: 'Campus_User',
    },
    isPseudonymous: {
      type: Boolean,
      default: false,
    },
    authorCollege: {
      type: String,
      default: '',
    },
    isVerifiedStudent: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for Reddit sorting
communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ upvoteCount: -1 });
communityPostSchema.index({ viewCount: -1 });
communityPostSchema.index({ collegeId: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
