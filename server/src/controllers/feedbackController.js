const Feedback = require('../models/Feedback');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Public
exports.submitFeedback = async (req, res, next) => {
  try {
    const { 
      name, 
      email, 
      websiteRating, 
      websiteFeedback, 
      realityRating, 
      realityFeedback, 
      otherFeedback 
    } = req.body;

    const feedbackData = {
      websiteRating,
      websiteFeedback,
      realityRating,
      realityFeedback,
      otherFeedback
    };

    if (name) feedbackData.name = name;
    if (email) feedbackData.email = email;
    if (req.user) feedbackData.user = req.user._id;

    const feedback = await Feedback.create(feedbackData);

    sendSuccess(res, { feedback }, 'Feedback submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
// @access  Private/Admin
exports.getAllFeedback = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    const total = await Feedback.countDocuments(query);

    sendSuccess(res, {
      feedback,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      }
    }, 'Feedback fetched successfully', 200);
  } catch (error) {
    next(error);
  }
};
