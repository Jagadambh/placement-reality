const Offer = require('../models/Offer');
const User = require('../models/User');
const VerificationEvidence = require('../models/VerificationEvidence');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { checkOfferDuplicate } = require('../services/duplicateDetectionService');
const { recordAuditLog } = require('../services/auditService');
const { syncCollegeStudentVerifiedStats } = require('../services/studentVerifiedAggregationService');

// @desc Submit placement offer
// @route POST /api/offers
const submitOffer = async (req, res, next) => {
  try {
    const {
      collegeId,
      departmentId,
      seasonId,
      graduationYear,
      companyName,
      jobRole,
      offerDate,
      annualCtcLpa,
      fixedCompensationLpa,
      variableCompensationLpa,
      offerType,
      acceptedOffer,
      joinedCompany,
      consentToAggregate,
    } = req.body;

    if (consentToAggregate === false || consentToAggregate === 'false') {
      return sendError(res, 'Consent to use submission in statistical models is required for transparency.', 400);
    }

    const parsedCtc = parseFloat(annualCtcLpa);
    if (isNaN(parsedCtc) || parsedCtc <= 0 || parsedCtc > 300) {
      return sendError(res, 'Annual CTC must be a valid positive number up to 300 LPA.', 400);
    }

    // 1. Run Duplicate Detection Service
    const duplicateCheck = await checkOfferDuplicate({
      studentId: req.user._id,
      companyName,
      jobRole,
      seasonId,
      annualCtcLpa: parsedCtc,
    });

    if (duplicateCheck.isDuplicate) {
      return sendError(res, duplicateCheck.reason, 409);
    }

    // 2. Handle optional supporting document upload
    let evidenceRecord = null;
    if (req.file) {
      evidenceRecord = await VerificationEvidence.create({
        studentId: req.user._id,
        documentType: 'Offer Letter',
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        verificationStatus: 'Pending',
      });
    }

    // 3. Create Offer
    const offer = await Offer.create({
      studentId: req.user._id,
      collegeId,
      departmentId,
      seasonId,
      graduationYear: parseInt(graduationYear, 10),
      companyName: companyName.trim(),
      jobRole: jobRole.trim(),
      offerDate: new Date(offerDate),
      annualCtcLpa: parsedCtc,
      fixedCompensationLpa: fixedCompensationLpa ? parseFloat(fixedCompensationLpa) : null,
      variableCompensationLpa: variableCompensationLpa ? parseFloat(variableCompensationLpa) : null,
      offerType: offerType || 'On-Campus Full-Time',
      acceptedOffer: acceptedOffer || 'Yes',
      joinedCompany: joinedCompany || 'Yet to Join',
      supportingDocument: evidenceRecord ? evidenceRecord._id : null,
      consentToAggregate: true,
      verificationStatus: evidenceRecord ? 'Under review' : 'Pending',
      submissionStage: 'SUBMITTED',
      isPublished: false,
      isDuplicateFlag: duplicateCheck.isFlagged,
      duplicateReason: duplicateCheck.reason || '',
    });

    if (evidenceRecord) {
      evidenceRecord.offerId = offer._id;
      await evidenceRecord.save();
    }

    // Notify user
    await Notification.create({
      userId: req.user._id,
      title: 'Offer Submission Received',
      message: `Your offer submission for ${companyName} (${annualCtcLpa} LPA) has been received. Current status: ${offer.verificationStatus}.`,
      type: 'Verification Update',
    });

    return sendSuccess(
      res,
      { offer },
      duplicateCheck.isFlagged
        ? `Offer submitted successfully with duplicate notice: ${duplicateCheck.reason}`
        : 'Offer submitted successfully. Your personal identity remains strictly protected.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get student's submitted offers
// @route GET /api/offers/my-offers
const getMyOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({ studentId: req.user._id })
      .populate('collegeId', 'name shortName')
      .populate('departmentId', 'name code')
      .populate('seasonId', 'academicYear')
      .populate('supportingDocument', 'originalFileName verificationStatus reviewNotes')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { offers }, 'My offers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Get public verified offers for a college (Strictly Anonymized - No PII!)
// @route GET /api/offers/college/:collegeId
const getCollegePublicOffers = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { seasonId, limit = 50 } = req.query;

    const query = {
      collegeId,
      verificationStatus: 'Verified',
      consentToAggregate: true,
    };
    if (seasonId) query.seasonId = seasonId;

    const offers = await Offer.find(query)
      .select('-studentId -supportingDocument -rejectionReason -moderatorNotes') // STRICT IDENTITY PROTECTION
      .populate('departmentId', 'name code')
      .populate('seasonId', 'academicYear')
      .sort({ annualCtcLpa: -1 })
      .limit(parseInt(limit));

    return sendSuccess(res, { offers }, 'Public verified offers retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc Moderate / Verify offer (Admin / Moderator)
// @route PUT /api/offers/:id/verify
const verifyOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, moderatorNotes } = req.body;

    if (!['Pending', 'Under review', 'Verified', 'Rejected', 'More information required'].includes(status)) {
      return sendError(res, 'Invalid verification status.', 400);
    }

    const offer = await Offer.findById(id).populate('studentId', 'email name');
    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    const oldState = offer.toObject();

    offer.verificationStatus = status;
    offer.moderatorNotes = moderatorNotes || '';
    if (status === 'Rejected') {
      offer.rejectionReason = rejectionReason || 'Documentation could not be validated.';
    }
    if (status === 'Verified') {
      offer.verifiedBy = req.user._id;
      offer.verifiedAt = new Date();
      offer.submissionStage = 'VERIFIED';
      offer.isPublished = true;
      offer.publishedAt = offer.publishedAt || new Date();
      if (offer.studentId && offer.studentId._id) {
        await User.findByIdAndUpdate(offer.studentId._id, {
          isCollegeVerified: true,
          collegeVerificationStatus: 'verified',
        });
      }
    } else if (status === 'Rejected') {
      offer.submissionStage = 'REJECTED';
      offer.isPublished = false;
    } else {
      offer.submissionStage = 'PENDING_VERIFICATION';
      offer.isPublished = false;
    }
    await offer.save();

    // Real-Time Institutional Aggregation Update (Requirement 11)
    if (offer.collegeId) {
      try {
        await syncCollegeStudentVerifiedStats(offer.collegeId, offer.seasonId);
      } catch (syncErr) {
        console.error('[Offer Verification] Background stats sync notice:', syncErr.message);
      }
    }

    // Update attached document status if applicable
    if (offer.supportingDocument) {
      await VerificationEvidence.findByIdAndUpdate(offer.supportingDocument, {
        verificationStatus: status === 'Verified' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Pending',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        reviewNotes: moderatorNotes || rejectionReason || '',
      });
    }

    // Send user notification
    if (offer.studentId?._id) {
      await Notification.create({
        userId: offer.studentId._id,
        title: `Offer Verification: ${status}`,
        message: `Your submission for ${offer.companyName} has been marked as ${status}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'Verification Update',
      });
    }

    // Mandatory Audit Trail
    await recordAuditLog({
      actionType: status === 'Verified' ? 'VERIFY_OFFER' : 'REJECT_OFFER',
      entityType: 'Offer',
      entityId: offer._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Offer status modified to ${status}. Notes: ${moderatorNotes || rejectionReason || 'Standard review'}`,
      oldValues: oldState,
      newValues: offer.toObject(),
    });

    return sendSuccess(res, { offer }, `Offer successfully updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

// @desc Unpublish offer from public aggregation (Moderator / Admin or submitting Student)
// @route PUT /api/offers/:id/unpublish
const unpublishOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const offer = await Offer.findById(id);
    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    const isOwner = req.user._id.toString() === offer.studentId?.toString();
    const isPrivileged = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return sendError(res, 'Not authorized to unpublish this offer', 403);
    }

    const oldState = offer.toObject();
    offer.isPublished = false;
    offer.verificationStatus = 'Unpublished';
    offer.moderatorNotes = reason || 'Unpublished by user or moderator';
    await offer.save();

    if (offer.collegeId) {
      try {
        await syncCollegeStudentVerifiedStats(offer.collegeId, offer.seasonId);
      } catch (syncErr) {
        console.error('[Offer Unpublish] Stats sync notice:', syncErr.message);
      }
    }

    await recordAuditLog({
      actionType: 'UNPUBLISH_OFFER',
      entityType: 'Offer',
      entityId: offer._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Offer unpublished: ${reason || 'Removed from public calculations'}`,
      oldValues: oldState,
      newValues: offer.toObject(),
    });

    return sendSuccess(res, { offer }, 'Offer successfully unpublished and removed from public aggregation');
  } catch (error) {
    next(error);
  }
};

// @desc Delete offer (Soft delete & remove from aggregation)
// @route DELETE /api/offers/:id
const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const offer = await Offer.findById(id);
    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    const isOwner = req.user._id.toString() === offer.studentId?.toString();
    const isPrivileged = ['moderator', 'admin'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return sendError(res, 'Not authorized to delete this offer', 403);
    }

    const oldState = offer.toObject();
    offer.isDeleted = true;
    offer.deletedAt = new Date();
    offer.isPublished = false;
    offer.verificationStatus = 'Rejected';
    await offer.save();

    if (offer.collegeId) {
      try {
        await syncCollegeStudentVerifiedStats(offer.collegeId, offer.seasonId);
      } catch (syncErr) {
        console.error('[Offer Deletion] Stats sync notice:', syncErr.message);
      }
    }

    await recordAuditLog({
      actionType: 'DELETE_OFFER',
      entityType: 'Offer',
      entityId: offer._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Offer soft deleted: ${reason || 'Record deleted'}`,
      oldValues: oldState,
      newValues: offer.toObject(),
    });

    return sendSuccess(res, { offerId: offer._id }, 'Offer deleted and excluded from aggregation');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitOffer,
  getMyOffers,
  getCollegePublicOffers,
  verifyOffer,
  unpublishOffer,
  deleteOffer,
};
