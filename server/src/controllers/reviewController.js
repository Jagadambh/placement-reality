const CollegeReview = require('../models/CollegeReview');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');

// @desc Get approved reviews for a college
// @route GET /api/reviews/college/:collegeId
const getCollegeReviews = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { page = 1, limit = 10, minRating } = req.query;

    const query = {
      collegeId,
      moderationStatus: 'Approved',
      isDeleted: false,
    };

    if (minRating) {
      query.overallRating = { $gte: parseFloat(minRating) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CollegeReview.countDocuments(query);

    const reviews = await CollegeReview.find(query)
      .select('-studentId -flaggedReasons -reportCount') // Protect student identity
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate aggregated category score averages
    const allApproved = await CollegeReview.find({ collegeId, moderationStatus: 'Approved', isDeleted: false });
    const categoryAverages = {
      overall: 0,
      placementSupport: 0,
      internshipSupport: 0,
      teachingAcademics: 0,
      infrastructure: 0,
      campusExperience: 0,
      careerPrep: 0,
      totalReviews: allApproved.length,
    };

    if (allApproved.length > 0) {
      allApproved.forEach((r) => {
        categoryAverages.overall += r.overallRating || 0;
        categoryAverages.placementSupport += r.ratings.placementSupport;
        categoryAverages.internshipSupport += r.ratings.internshipSupport;
        categoryAverages.teachingAcademics += r.ratings.teachingAcademics;
        categoryAverages.infrastructure += r.ratings.infrastructure;
        categoryAverages.campusExperience += r.ratings.campusExperience;
        categoryAverages.careerPrep += r.ratings.careerPrep;
      });
      const count = allApproved.length;
      categoryAverages.overall = Number((categoryAverages.overall / count).toFixed(1));
      categoryAverages.placementSupport = Number((categoryAverages.placementSupport / count).toFixed(1));
      categoryAverages.internshipSupport = Number((categoryAverages.internshipSupport / count).toFixed(1));
      categoryAverages.teachingAcademics = Number((categoryAverages.teachingAcademics / count).toFixed(1));
      categoryAverages.infrastructure = Number((categoryAverages.infrastructure / count).toFixed(1));
      categoryAverages.campusExperience = Number((categoryAverages.campusExperience / count).toFixed(1));
      categoryAverages.careerPrep = Number((categoryAverages.careerPrep / count).toFixed(1));
    }

    return sendSuccess(
      res,
      {
        reviews,
        categoryAverages,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
      'Reviews retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Submit a new student review
// @route POST /api/reviews
const submitReview = async (req, res, next) => {
  try {
    const {
      collegeId,
      graduationYear,
      ratings,
      title,
      reviewText,
      pros,
      cons,
      isPseudonymous = true,
      customAuthorName,
    } = req.body;

    const user = await User.findById(req.user._id);

    // Spam / Quality check
    let moderationStatus = 'Approved';
    const flaggedReasons = [];

    // Basic heuristic: check repeated characters or spam keywords
    if (/([a-zA-Z])\1{5,}/.test(reviewText)) {
      moderationStatus = 'Pending';
      flaggedReasons.push('Repetitive character sequence detected');
    }

    const authorDisplayName = isPseudonymous
      ? (customAuthorName || user.pseudonym || 'Anonymous Alum/Student')
      : user.name;

    const review = await CollegeReview.create({
      collegeId,
      studentId: req.user._id,
      graduationYear: graduationYear || user.graduationYear || new Date().getFullYear(),
      authorDisplayName,
      isPseudonymous,
      isVerifiedStudentBadge: user.isCollegeVerified && user.collegeId?.toString() === collegeId.toString(),
      ratings: {
        placementSupport: Number(ratings?.placementSupport || 3),
        internshipSupport: Number(ratings?.internshipSupport || 3),
        teachingAcademics: Number(ratings?.teachingAcademics || 3),
        infrastructure: Number(ratings?.infrastructure || 3),
        campusExperience: Number(ratings?.campusExperience || 3),
        careerPrep: Number(ratings?.careerPrep || 3),
      },
      title,
      reviewText,
      pros,
      cons,
      moderationStatus,
      flaggedReasons,
    });

    return sendSuccess(
      res,
      { review },
      moderationStatus === 'Approved'
        ? 'Review published successfully. Thank you for contributing to placement transparency!'
        : 'Review submitted and queued for moderation verification.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Report a review for abuse/doxxing
// @route POST /api/reviews/:id/report
const reportReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await CollegeReview.findById(id);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    review.reportCount += 1;
    if (reason) review.flaggedReasons.push(reason);

    // If report count crosses threshold, flag for moderation review
    if (review.reportCount >= 3) {
      review.moderationStatus = 'Flagged';
    }
    await review.save();

    return sendSuccess(res, null, 'Review has been reported to the moderation queue for review.');
  } catch (error) {
    next(error);
  }
};

// @desc Moderate review (Admin / Moderator)
// @route PUT /api/reviews/:id/moderate
const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, moderationNotes } = req.body;

    if (!['Approved', 'Pending', 'Flagged', 'Rejected'].includes(status)) {
      return sendError(res, 'Invalid moderation status', 400);
    }

    const review = await CollegeReview.findById(id);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    const oldState = review.toObject();
    review.moderationStatus = status;
    review.moderatedBy = req.user._id;
    review.moderationNotes = moderationNotes || '';
    await review.save();

    await recordAuditLog({
      actionType: 'MODERATE_REVIEW',
      entityType: 'CollegeReview',
      entityId: review._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Review moderation status updated to ${status}. Notes: ${moderationNotes || 'Policy adherence'}`,
      oldValues: oldState,
      newValues: review.toObject(),
    });

    return sendSuccess(res, { review }, `Review marked as ${status}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCollegeReviews,
  submitReview,
  reportReview,
  moderateReview,
};
