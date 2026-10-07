const User = require('../models/User');
const College = require('../models/College');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const CollegeReview = require('../models/CollegeReview');
const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const VerificationEvidence = require('../models/VerificationEvidence');
const AuditLog = require('../models/AuditLog');
const UploadedReport = require('../models/UploadedReport');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');
const emailService = require('../services/emailService');

// @desc Platform-wide overview statistics for admin
// @route GET /api/admin/overview
const getAdminOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalColleges = await College.countDocuments();
    const pendingOffers = await Offer.countDocuments({ verificationStatus: { $in: ['Pending', 'Under review'] } });
    const verifiedOffers = await Offer.countDocuments({ verificationStatus: 'Verified' });
    const pendingInternships = await Internship.countDocuments({ verificationStatus: { $in: ['Pending', 'Under review'] } });
    const verifiedInternships = await Internship.countDocuments({ verificationStatus: 'Verified' });
    const pendingOfficialImports = await PlacementRecord.countDocuments({ approvalStatus: 'Pending' });
    const verifiedPlacementRecords = await PlacementRecord.countDocuments({ approvalStatus: 'Verified' });
    const pendingReviews = await CollegeReview.countDocuments({ moderationStatus: { $in: ['Pending', 'Flagged'] } });
    const pendingStudentVerifications = await User.countDocuments({ collegeVerificationStatus: 'pending' });
    const totalAuditEvents = await AuditLog.countDocuments();
    const totalUploadedReports = await UploadedReport.countDocuments();

    // Calculate platform-wide average data completeness
    const colleges = await College.find().select('dataCompletenessScore');
    const avgCompleteness = colleges.length > 0
      ? Number((colleges.reduce((acc, c) => acc + (c.dataCompletenessScore || 0), 0) / colleges.length).toFixed(1))
      : 0;

    return sendSuccess(
      res,
      {
        totalUsers,
        totalColleges,
        pendingOffers,
        verifiedOffers,
        pendingInternships,
        verifiedInternships,
        pendingOfficialImports,
        verifiedPlacementRecords,
        pendingReviews,
        pendingStudentVerifications,
        totalAuditEvents,
        totalUploadedReports,
        averageDataCompletenessScore: avgCompleteness,
      },
      'Admin overview statistics retrieved'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get audit logs with filter & pagination
// @route GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { actionType, entityType, page = 1, limit = 25 } = req.query;

    const query = {};
    if (actionType) query.actionType = actionType;
    if (entityType) query.entityType = entityType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(
      res,
      {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
      'Audit log trail fetched'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get moderation queue for offers
// @route GET /api/admin/offers/queue
const getOfferVerificationQueue = async (req, res, next) => {
  try {
    const { status = 'Pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.verificationStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Offer.countDocuments(query);
    const offers = await Offer.find(query)
      .populate('studentId', 'name email graduationYear isCollegeVerified')
      .populate('collegeId', 'name shortName tierClassification')
      .populate('departmentId', 'name code')
      .populate('seasonId', 'academicYear')
      .populate('supportingDocument')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { offers, total }, 'Offer verification queue loaded');
  } catch (error) {
    next(error);
  }
};

// @desc Get review moderation queue
// @route GET /api/admin/reviews/queue
const getReviewModerationQueue = async (req, res, next) => {
  try {
    const { status = 'Flagged', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.moderationStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CollegeReview.countDocuments(query);
    const reviews = await CollegeReview.find(query)
      .populate('collegeId', 'name shortName')
      .populate('studentId', 'name email isCollegeVerified')
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { reviews, total }, 'Review moderation queue loaded');
  } catch (error) {
    next(error);
  }
};

// @desc Manage users list & role change
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('collegeId', 'name shortName')
      .populate('collegeVerificationDocument', 'originalFileName verificationStatus createdAt')
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { users, total }, 'Users retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc Update user role (e.g. promote to moderator)
// @route PUT /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, changeReason } = req.body;

    if (!['student', 'moderator', 'admin'].includes(role)) {
      return sendError(res, 'Invalid role assignment', 400);
    }

    const user = await User.findById(id);
    if (!user) return sendError(res, 'User not found', 404);

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await recordAuditLog({
      actionType: 'STATUS_CHANGE',
      entityType: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: changeReason || `User role updated from ${oldRole} to ${role}`,
      oldValues: { role: oldRole },
      newValues: { role },
    });

    return sendSuccess(res, { user }, `User role updated to ${role}`);
  } catch (error) {
    next(error);
  }
};

// @desc Get student college affiliation verification queue
// @route GET /api/admin/verifications/queue
const getStudentVerificationsQueue = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.collegeVerificationStatus = status;
    } else {
      query.collegeVerificationStatus = { $in: ['pending', 'verified', 'rejected'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const verifications = await User.find(query)
      .populate('collegeId', 'name shortName tierClassification city state')
      .populate('departmentId', 'name code')
      .populate('collegeVerificationDocument')
      .select('-passwordHash')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { verifications, total }, 'Student verification queue loaded');
  } catch (error) {
    next(error);
  }
};

// @desc Verify or reject student college affiliation (Evidence-based verification)
// @route PUT /api/admin/users/:id/verify-college
const verifyStudentAffiliation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, changeReason } = req.body; // 'verified', 'rejected', 'unverified'

    if (!['verified', 'rejected', 'unverified'].includes(status)) {
      return sendError(res, 'Invalid verification status. Must be "verified", "rejected", or "unverified".', 400);
    }

    const user = await User.findById(id).populate('collegeId', 'name shortName');
    if (!user) return sendError(res, 'User not found', 404);

    const oldState = {
      isCollegeVerified: user.isCollegeVerified,
      status: user.collegeVerificationStatus,
      rejectionReason: user.collegeVerificationRejectionReason,
    };

    const isVerified = status === 'verified';
    user.isCollegeVerified = isVerified;
    user.collegeVerificationStatus = status;

    const finalReason = status === 'rejected'
      ? (rejectionReason || changeReason || 'Submitted document does not meet institutional validation standards.')
      : null;

    user.collegeVerificationRejectionReason = finalReason;
    await user.save();

    // If an associated VerificationEvidence exists, update its status & review notes
    let updatedEvidence = null;
    if (user.collegeVerificationDocument) {
      const evidence = await VerificationEvidence.findById(user.collegeVerificationDocument);
      if (evidence) {
        evidence.verificationStatus = isVerified ? 'Approved' : (status === 'rejected' ? 'Rejected' : 'Pending');
        evidence.reviewedBy = req.user._id;
        evidence.reviewedAt = new Date();
        evidence.reviewNotes = status === 'rejected'
          ? finalReason
          : (changeReason || 'College affiliation confirmed by moderator review.');
        await evidence.save();
        updatedEvidence = evidence;
      }
    }

    // Record Immutable Audit Log
    await recordAuditLog({
      actionType: 'STATUS_CHANGE',
      entityType: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: status === 'rejected'
        ? `Rejected student college affiliation: ${finalReason}`
        : (changeReason || `Marked student college affiliation as ${status}`),
      oldValues: oldState,
      newValues: {
        isCollegeVerified: user.isCollegeVerified,
        status: user.collegeVerificationStatus,
        rejectionReason: user.collegeVerificationRejectionReason,
      },
    });

    // Create Notification for the student
    const collegeName = user.collegeId?.shortName || user.collegeId?.name || 'your institution';
    if (status === 'verified') {
      await Notification.create({
        userId: user._id,
        title: 'College Affiliation Verified',
        message: `Congratulations! Your affiliation with ${collegeName} has been verified by the moderation team. Your profile now displays the Verified Student badge.`,
        type: 'Verification Update',
        link: '/profile',
      });
    } else if (status === 'rejected') {
      await Notification.create({
        userId: user._id,
        title: 'College Verification Update',
        message: `Your college ID verification request was not approved. Reason: ${finalReason}. You may upload a clearer ID card or certificate on your profile.`,
        type: 'Verification Update',
        link: '/profile',
      });
    }

    // Asynchronously dispatch transactional email notice to the student
    emailService.sendStudentVerificationStatusEmail({
      to: user.email,
      name: user.name,
      collegeName,
      status,
      reason: finalReason,
    }).catch((mailErr) => {
      console.warn('[Student Verification Email Warning]', mailErr.message);
    });


    const populatedUser = await User.findById(user._id)
      .populate('collegeId', 'name shortName tierClassification')
      .populate('departmentId', 'name code')
      .populate('collegeVerificationDocument')
      .select('-passwordHash');

    return sendSuccess(
      res,
      { user: populatedUser, evidence: updatedEvidence },
      `Student verification status set to ${status}${status === 'rejected' ? ` with documented reason: "${finalReason}"` : ''}`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getAuditLogs,
  getOfferVerificationQueue,
  getReviewModerationQueue,
  getStudentVerificationsQueue,
  getUsers,
  updateUserRole,
  verifyStudentAffiliation,
};
