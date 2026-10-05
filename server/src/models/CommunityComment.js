const mongoose = require('mongoose');

const communityCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: [true, 'Post ID is required'],
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityComment',
      default: null,
      index: true,
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
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [4000, 'Comment cannot exceed 4000 characters'],
    },
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

communityCommentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model('CommunityComment', communityCommentSchema);
