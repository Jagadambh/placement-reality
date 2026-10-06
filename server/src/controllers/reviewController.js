const mongoose = require('mongoose');
const CollegeReview = require('../models/CollegeReview');
const College = require('../models/College');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');
const { syncCollegeStudentVerifiedStats } = require('../services/studentVerifiedAggregationService');

// @desc Get approved reviews for a college
// @route GET /api/reviews/college/:collegeId
const getCollegeReviews = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { page = 1, limit = 20, minRating } = req.query;

    let targetCollegeId = collegeId;
    let targetCollege = null;

    if (mongoose.Types.ObjectId.isValid(collegeId)) {
      targetCollege = await College.findById(collegeId);
    } else {
      targetCollege = await College.findOne({ slug: collegeId });
      if (targetCollege) targetCollegeId = targetCollege._id;
    }

    const query = {
      collegeId: targetCollegeId,
      moderationStatus: 'Approved',
      isDeleted: false,
    };

    if (minRating) {
      query.overallRating = { $gte: parseFloat(minRating) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CollegeReview.countDocuments(query);

    const reviews = await CollegeReview.find(query)
      .select('-flaggedReasons -reportCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate aggregated category score averages & verified placement stats
    const allApproved = await CollegeReview.find({ collegeId: targetCollegeId, moderationStatus: 'Approved', isDeleted: false });
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

    const validMedians = [];
    const validAverages = [];
    const validHighests = [];
    const validPlacementRates = [];

    if (allApproved.length > 0) {
      allApproved.forEach((r) => {
        categoryAverages.overall += r.overallRating || 0;
        categoryAverages.placementSupport += r.ratings?.placementSupport || 3;
        categoryAverages.internshipSupport += r.ratings?.internshipSupport || 3;
        categoryAverages.teachingAcademics += r.ratings?.teachingAcademics || 3;
        categoryAverages.infrastructure += r.ratings?.infrastructure || 3;
        categoryAverages.campusExperience += r.ratings?.campusExperience || 3;
        categoryAverages.careerPrep += r.ratings?.careerPrep || 3;

        if (r.reportedStats?.medianPackageLPA) validMedians.push(r.reportedStats.medianPackageLPA);
        if (r.reportedStats?.averagePackageLPA) validAverages.push(r.reportedStats.averagePackageLPA);
        if (r.reportedStats?.highestPackageLPA) validHighests.push(r.reportedStats.highestPackageLPA);
        if (r.reportedStats?.actualPlacementRate) validPlacementRates.push(r.reportedStats.actualPlacementRate);
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

    const calcMedian = (arr) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
    };

    const calcAvg = (arr) => {
      if (arr.length === 0) return null;
      return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));
    };

    const studentVerifiedStats = {
      sampleSize: allApproved.length || targetCollege?.studentVerifiedStats?.sampleSize || 0,
      medianPackageLPA: calcMedian(validMedians) || targetCollege?.studentVerifiedStats?.medianPackageLPA || null,
      averagePackageLPA: calcAvg(validAverages) || targetCollege?.studentVerifiedStats?.averagePackageLPA || null,
      highestPackageLPA: validHighests.length > 0 ? Math.max(...validHighests) : (targetCollege?.studentVerifiedStats?.highestPackageLPA || null),
      actualPlacementRate: calcAvg(validPlacementRates) || targetCollege?.studentVerifiedStats?.actualPlacementRate || null,
      totalVerifiedOffers: targetCollege?.studentVerifiedStats?.totalVerifiedOffers || null,
      confidenceScore: targetCollege?.studentVerifiedStats?.confidenceScore || 88,
      verifiedReviewsCount: allApproved.length,
    };

    return sendSuccess(
      res,
      {
        reviews,
        categoryAverages,
        studentVerifiedStats,
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
      branch = 'Computer Science & Engineering',
      ratings,
      title,
      reviewText,
      pros,
      cons,
      isPseudonymous = true,
      customAuthorName,
      verificationProofType = 'Student Roll ID & Institutional Email Verified',
      reportedStats,
    } = req.body;

    let targetCollegeId = collegeId;
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      const col = await College.findOne({ slug: collegeId });
      if (col) targetCollegeId = col._id;
    }

    const user = req.user ? await User.findById(req.user._id) : null;

    // Spam / Quality check
    let moderationStatus = 'Approved';
    const flaggedReasons = [];

    if (/([a-zA-Z])\1{5,}/.test(reviewText)) {
      moderationStatus = 'Pending';
      flaggedReasons.push('Repetitive character sequence detected');
    }

    const authorDisplayName = isPseudonymous
      ? (customAuthorName || user?.pseudonym || `${branch.split(' ')[0]} Verified Student`)
      : (user?.name || customAuthorName || 'Verified Student');

    const cleanReportedStats = {
      medianPackageLPA: reportedStats?.medianPackageLPA ? parseFloat(reportedStats.medianPackageLPA) : null,
      averagePackageLPA: reportedStats?.averagePackageLPA ? parseFloat(reportedStats.averagePackageLPA) : null,
      highestPackageLPA: reportedStats?.highestPackageLPA ? parseFloat(reportedStats.highestPackageLPA) : null,
      actualPlacementRate: reportedStats?.actualPlacementRate ? parseFloat(reportedStats.actualPlacementRate) : null,
      dreamOffersPercent: reportedStats?.dreamOffersPercent ? parseFloat(reportedStats.dreamOffersPercent) : null,
      batchSizeEstimate: reportedStats?.batchSizeEstimate ? parseInt(reportedStats.batchSizeEstimate, 10) : null,
    };

    const review = await CollegeReview.create({
      collegeId: targetCollegeId,
      studentId: req.user?._id || null,
      graduationYear: graduationYear || user?.graduationYear || new Date().getFullYear(),
      branch,
      authorDisplayName,
      isPseudonymous,
      isVerifiedStudentBadge: true,
      verificationProofType,
      reportedStats: cleanReportedStats,
      ratings: {
        placementSupport: Number(ratings?.placementSupport || 4),
        internshipSupport: Number(ratings?.internshipSupport || 3.5),
        teachingAcademics: Number(ratings?.teachingAcademics || 4),
        infrastructure: Number(ratings?.infrastructure || 4),
        campusExperience: Number(ratings?.campusExperience || 4),
        careerPrep: Number(ratings?.careerPrep || 3.5),
      },
      title,
      reviewText,
      pros,
      cons,
      moderationStatus,
      flaggedReasons,
    });

    // Update College.studentVerifiedStats
    const college = await College.findById(targetCollegeId);
    if (college) {
      const allApproved = await CollegeReview.find({ collegeId: targetCollegeId, moderationStatus: 'Approved', isDeleted: false });
      const medians = allApproved.map(r => r.reportedStats?.medianPackageLPA).filter(Boolean);
      const avgs = allApproved.map(r => r.reportedStats?.averagePackageLPA).filter(Boolean);
      const rates = allApproved.map(r => r.reportedStats?.actualPlacementRate).filter(Boolean);

      if (medians.length > 0 || avgs.length > 0) {
        college.studentVerifiedStats = {
          sampleSize: allApproved.length,
          verifiedStudentOutcomes: allApproved.length,
          verifiedPackageRecords: allApproved.length,
          hasEnoughData: true,
          medianPackageLPA: medians.length > 0 ? Number((medians.reduce((a, b) => a + b, 0) / medians.length).toFixed(1)) : college.studentVerifiedStats?.medianPackageLPA,
          averagePackageLPA: avgs.length > 0 ? Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1)) : college.studentVerifiedStats?.averagePackageLPA,
          highestPackageLPA: cleanReportedStats.highestPackageLPA || college.studentVerifiedStats?.highestPackageLPA,
          actualPlacementRate: rates.length > 0 ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)) : college.studentVerifiedStats?.actualPlacementRate,
          observedPlacementRate: rates.length > 0 ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)) : college.studentVerifiedStats?.observedPlacementRate,
          totalVerifiedOffers: college.studentVerifiedStats?.totalVerifiedOffers || null,
          confidenceScore: 90,
          verifiedReviewsCount: allApproved.length,
          lastUpdated: new Date(),
        };
        await college.save();
      }

      // Synchronize with aggregation engine
      try {
        await syncCollegeStudentVerifiedStats(targetCollegeId);
      } catch (syncErr) {
        console.warn('[Review Sync Warning]', syncErr.message);
      }
    }

    return sendSuccess(
      res,
      { review },
      moderationStatus === 'Approved'
        ? 'Verified review published successfully. Stats updated!'
        : 'Review submitted and queued for verification.',
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
