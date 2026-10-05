const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');
const College = require('../models/College');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// @desc Get community posts with Reddit-style sorting & filters
// @route GET /api/community/posts
const getPosts = async (req, res, next) => {
  try {
    const {
      search,
      collegeId,
      flair,
      postType,
      sortBy = 'hot',
      page = 1,
      limit = 25,
    } = req.query;

    const query = { isDeleted: false };

    if (collegeId && collegeId !== 'all') {
      query.collegeId = collegeId;
    }

    if (flair && flair !== 'all') {
      query.flair = flair;
    }

    if (postType && postType !== 'all') {
      query.postType = postType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { collegeName: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortSpec = { isPinned: -1 };
    if (sortBy === 'top') {
      sortSpec.upvoteCount = -1;
      sortSpec.createdAt = -1;
    } else if (sortBy === 'new') {
      sortSpec.createdAt = -1;
    } else if (sortBy === 'questions') {
      query.postType = 'question';
      sortSpec.commentCount = 1; // unanswered first
      sortSpec.createdAt = -1;
    } else {
      // Hot: Default sort by upvotes & recency
      sortSpec.upvoteCount = -1;
      sortSpec.viewCount = -1;
      sortSpec.createdAt = -1;
    }

    const total = await CommunityPost.countDocuments(query);
    const posts = await CommunityPost.find(query)
      .populate('collegeId', 'name shortName city state logoUrl')
      .sort(sortSpec)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const userId = req.user ? req.user._id.toString() : null;

    const formattedPosts = posts.map((post) => {
      let userVote = null;
      if (userId) {
        if (post.upvotes && post.upvotes.some((id) => id.toString() === userId)) {
          userVote = 'up';
        } else if (post.downvotes && post.downvotes.some((id) => id.toString() === userId)) {
          userVote = 'down';
        }
      }

      return {
        ...post,
        userVote,
        // Don't leak full upvotes array in listing
        upvotes: undefined,
        downvotes: undefined,
      };
    });

    return sendSuccess(
      res,
      {
        posts: formattedPosts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
      'Community posts fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get single post by ID and increment view count
// @route GET /api/community/posts/:id
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Atomically increment view count
    const post = await CommunityPost.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('collegeId', 'name shortName city state logoUrl')
      .lean();

    if (!post || post.isDeleted) {
      return sendError(res, 'Post not found', 404);
    }

    // Fetch comments for this post
    const comments = await CommunityComment.find({ postId: id, isDeleted: false })
      .sort({ createdAt: 1 })
      .lean();

    const userId = req.user ? req.user._id.toString() : null;

    let userVote = null;
    if (userId) {
      if (post.upvotes && post.upvotes.some((uid) => uid.toString() === userId)) {
        userVote = 'up';
      } else if (post.downvotes && post.downvotes.some((uid) => uid.toString() === userId)) {
        userVote = 'down';
      }
    }

    const formattedComments = comments.map((c) => {
      let commentVote = null;
      if (userId) {
        if (c.upvotes && c.upvotes.some((uid) => uid.toString() === userId)) {
          commentVote = 'up';
        } else if (c.downvotes && c.downvotes.some((uid) => uid.toString() === userId)) {
          commentVote = 'down';
        }
      }
      return {
        ...c,
        userVote: commentVote,
        upvotes: undefined,
        downvotes: undefined,
      };
    });

    return sendSuccess(
      res,
      {
        post: {
          ...post,
          userVote,
          upvotes: undefined,
          downvotes: undefined,
        },
        comments: formattedComments,
      },
      'Post fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Create new Reddit-style question or discussion post
// @route POST /api/community/posts
const createPost = async (req, res, next) => {
  try {
    const {
      title,
      content,
      postType = 'question',
      flair = 'Ask Campus',
      collegeId,
      tags = [],
      isPseudonymous = false,
    } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 'Post title is required', 400);
    }
    if (!content || !content.trim()) {
      return sendError(res, 'Post content is required', 400);
    }

    let collegeName = 'General Campus Talk';
    let validCollegeId = null;

    if (collegeId) {
      const col = await College.findById(collegeId);
      if (col) {
        validCollegeId = col._id;
        collegeName = col.name;
      }
    }

    const user = req.user;
    const authorName = user?.name || 'Student';
    const authorPseudonym = user?.pseudonym || `u/Student_${Math.floor(1000 + Math.random() * 9000)}`;
    const isVerifiedStudent = !!(user && user.isCollegeVerified);
    const authorCollege = user?.collegeId?.name || (user?.collegeId ? 'College Student' : '');

    const newPost = await CommunityPost.create({
      title: title.trim(),
      content: content.trim(),
      postType,
      flair,
      collegeId: validCollegeId,
      collegeName,
      authorId: user?._id || null,
      authorName,
      authorPseudonym,
      isPseudonymous,
      authorCollege,
      isVerifiedStudent,
      tags: Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      upvotes: user?._id ? [user._id] : [],
      upvoteCount: 1, // Reddit authors start with 1 upvote by default
      viewCount: 1,
      commentCount: 0,
    });

    return sendSuccess(res, { post: newPost }, 'Post created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc Upvote or Downvote a post (Reddit-style)
// @route POST /api/community/posts/:id/vote
const votePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' | 'down' | 'clear'
    const userId = req.user._id;

    const post = await CommunityPost.findById(id);
    if (!post || post.isDeleted) {
      return sendError(res, 'Post not found', 404);
    }

    // Remove existing vote
    post.upvotes = post.upvotes.filter((uid) => uid.toString() !== userId.toString());
    post.downvotes = post.downvotes.filter((uid) => uid.toString() !== userId.toString());

    let finalUserVote = null;
    if (direction === 'up') {
      post.upvotes.push(userId);
      finalUserVote = 'up';
    } else if (direction === 'down') {
      post.downvotes.push(userId);
      finalUserVote = 'down';
    }

    post.upvoteCount = post.upvotes.length - post.downvotes.length;
    await post.save();

    return sendSuccess(
      res,
      {
        postId: post._id,
        upvoteCount: post.upvoteCount,
        userVote: finalUserVote,
      },
      'Vote recorded successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Add comment or reply to post
// @route POST /api/community/posts/:id/comments
const createComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId, isPseudonymous = false } = req.body;

    if (!content || !content.trim()) {
      return sendError(res, 'Comment text is required', 400);
    }

    const post = await CommunityPost.findById(id);
    if (!post || post.isDeleted) {
      return sendError(res, 'Post not found', 404);
    }

    const user = req.user;
    const authorName = user?.name || 'Student';
    const authorPseudonym = user?.pseudonym || `u/Student_${Math.floor(1000 + Math.random() * 9000)}`;
    const isVerifiedStudent = !!(user && user.isCollegeVerified);
    const authorCollege = user?.collegeId?.name || '';

    const newComment = await CommunityComment.create({
      postId: post._id,
      parentCommentId: parentCommentId || null,
      authorId: user?._id || null,
      authorName,
      authorPseudonym,
      isPseudonymous,
      authorCollege,
      isVerifiedStudent,
      content: content.trim(),
      upvotes: user?._id ? [user._id] : [],
      upvoteCount: 1, // Author starts with 1 upvote
    });

    // Increment post comment count
    await CommunityPost.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

    return sendSuccess(res, { comment: newComment }, 'Comment posted successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc Vote on a comment
// @route POST /api/community/comments/:id/vote
const voteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' | 'down' | 'clear'
    const userId = req.user._id;

    const comment = await CommunityComment.findById(id);
    if (!comment || comment.isDeleted) {
      return sendError(res, 'Comment not found', 404);
    }

    comment.upvotes = comment.upvotes.filter((uid) => uid.toString() !== userId.toString());
    comment.downvotes = comment.downvotes.filter((uid) => uid.toString() !== userId.toString());

    let finalUserVote = null;
    if (direction === 'up') {
      comment.upvotes.push(userId);
      finalUserVote = 'up';
    } else if (direction === 'down') {
      comment.downvotes.push(userId);
      finalUserVote = 'down';
    }

    comment.upvoteCount = comment.upvotes.length - comment.downvotes.length;
    await comment.save();

    return sendSuccess(
      res,
      {
        commentId: comment._id,
        upvoteCount: comment.upvoteCount,
        userVote: finalUserVote,
      },
      'Comment vote recorded'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get community sidebar stats & trending topics
// @route GET /api/community/stats
const getCommunityStats = async (req, res, next) => {
  try {
    const totalPosts = await CommunityPost.countDocuments({ isDeleted: false });
    const totalQuestions = await CommunityPost.countDocuments({
      isDeleted: false,
      postType: 'question',
    });
    const totalComments = await CommunityComment.countDocuments({ isDeleted: false });

    // Top discussed colleges
    const topColleges = await CommunityPost.aggregate([
      { $match: { isDeleted: false, collegeId: { $ne: null } } },
      { $group: { _id: '$collegeName', count: { $sum: 1 }, collegeId: { $first: '$collegeId' } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    return sendSuccess(
      res,
      {
        totalPosts,
        totalQuestions,
        totalComments,
        topColleges,
        communityRules: [
          'Be constructive and respectful to peer students and aspirants.',
          'Provide authentic details; if discussing placements, cite session/offer evidence.',
          'No institutional spam, unauthorized advertising, or defamatory hearsay.',
          'Protect student privacy (no sharing personal roll numbers or private phone numbers).',
        ],
      },
      'Community stats fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getPostById,
  createPost,
  votePost,
  createComment,
  voteComment,
  getCommunityStats,
};
