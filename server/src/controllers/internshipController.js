const Internship = require('../models/Internship');
const VerificationEvidence = require('../models/VerificationEvidence');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { getCollegeInternshipAnalytics } = require('../services/analyticsService');
const { recordAuditLog } = require('../services/auditService');

// @desc Get internships list with filters (PUBLIC: STRICTLY VERIFIED ONLY)
// @route GET /api/internships
const getInternships = async (req, res, next) => {
  try {
    const { collegeId, departmentId, stipendCategory, workMode, ppoConversion, page = 1, limit = 20 } = req.query;

    // REQUIREMENT 8: Only verified records exposed publicly
    const query = {
      verificationStatus: 'Verified',
    };
    if (collegeId) query.collegeId = collegeId;
    if (departmentId) query.departmentId = departmentId;
    if (stipendCategory) query.stipendCategory = stipendCategory;
    if (workMode) query.workMode = workMode;
    if (ppoConversion) query.ppoConversion = ppoConversion;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Internship.countDocuments(query);

    const internships = await Internship.find(query)
      .select('-studentId') // Protect student identity
      .populate('collegeId', 'name shortName tierClassification')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(
      res,
      {
        internships,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
      'Internship listings fetched'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Submit internship record
// @route POST /api/internships
const submitInternship = async (req, res, next) => {
  try {
    const {
      collegeId,
      departmentId,
      companyName,
      internshipRole,
      internshipPeriodMonths,
      startMonthYear,
      endMonthYear,
      monthlyStipendInr,
      stipendCategory,
      workMode,
      ppoConversion,
      notes,
    } = req.body;

    let evidenceRecord = null;
    if (req.file) {
      evidenceRecord = await VerificationEvidence.create({
        studentId: req.user._id,
        documentType: 'Internship Certificate',
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        verificationStatus: 'Pending',
      });
    }

    const internship = await Internship.create({
      studentId: req.user._id,
      collegeId,
      departmentId,
      companyName: companyName.trim(),
      internshipRole: internshipRole.trim(),
      internshipPeriodMonths: parseInt(internshipPeriodMonths || '2', 10),
      startMonthYear,
      endMonthYear,
      monthlyStipendInr: stipendCategory === 'Paid' ? parseFloat(monthlyStipendInr || '0') : 0,
      stipendCategory: stipendCategory || 'Paid',
      workMode: workMode || 'In-Office',
      ppoConversion: ppoConversion || 'Undisclosed',
      verificationEvidenceId: evidenceRecord ? evidenceRecord._id : null,
      verificationStatus: evidenceRecord ? 'Under review' : 'Pending',
      notes,
    });

    if (evidenceRecord) {
      evidenceRecord.internshipId = internship._id;
      await evidenceRecord.save();
    }

    return sendSuccess(
      res,
      { internship },
      'Internship experience submitted successfully. Anonymized in platform analytics.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get analytics for internships for a college
// @route GET /api/internships/analytics/:collegeId
const getInternshipAnalytics = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const analytics = await getCollegeInternshipAnalytics(collegeId);
    return sendSuccess(res, analytics, 'Internship analytics retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc Get student's own submitted internships
// @route GET /api/internships/my-internships
const getMyInternships = async (req, res, next) => {
  try {
    const internships = await Internship.find({ studentId: req.user._id })
      .populate('collegeId', 'name shortName')
      .populate('departmentId', 'name code')
      .populate('verificationEvidenceId', 'originalFileName verificationStatus reviewNotes')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { internships }, 'Student internships retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Get internship verification queue (Admin / Moderator)
// @route GET /api/internships/queue
const getInternshipVerificationQueue = async (req, res, next) => {
  try {
    const { status = 'Pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.verificationStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Internship.countDocuments(query);
    const internships = await Internship.find(query)
      .populate('studentId', 'name email graduationYear isCollegeVerified')
      .populate('collegeId', 'name shortName tierClassification')
      .populate('departmentId', 'name code')
      .populate('verificationEvidenceId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { internships, total }, 'Internship verification queue loaded');
  } catch (error) {
    next(error);
  }
};

// @desc Moderate / Verify internship (Admin / Moderator)
// @route PUT /api/internships/:id/verify
const verifyInternship = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, notes } = req.body;

    if (!['Pending', 'Under review', 'Verified', 'Rejected'].includes(status)) {
      return sendError(res, 'Invalid verification status.', 400);
    }

    const internship = await Internship.findById(id).populate('studentId', 'email name');
    if (!internship) {
      return sendError(res, 'Internship record not found', 404);
    }

    const oldState = internship.toObject();
    internship.verificationStatus = status;
    internship.reviewedBy = req.user._id;
    internship.reviewedAt = new Date();
    if (notes) internship.notes = notes;
    if (status === 'Rejected') {
      internship.rejectionReason = rejectionReason || 'Internship documentation could not be verified.';
    } else if (status === 'Verified') {
      internship.rejectionReason = null;
    }

    await internship.save();

    if (internship.verificationEvidenceId) {
      await VerificationEvidence.findByIdAndUpdate(internship.verificationEvidenceId, {
        verificationStatus: status === 'Verified' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Pending',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        reviewNotes: rejectionReason || notes || '',
      });
    }

    if (internship.studentId && internship.studentId._id) {
      await Notification.create({
        userId: internship.studentId._id,
        title: `Internship Verification: ${status}`,
        message: `Your internship experience at ${internship.companyName} has been marked as ${status}.${status === 'Rejected' && rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'Verification Update',
      });
    }

    await recordAuditLog({
      actionType: status === 'Verified' ? 'VERIFY_INTERNSHIP' : 'REJECT_INTERNSHIP',
      entityType: 'Internship',
      entityId: internship._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Internship status modified to ${status}. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
      oldValues: oldState,
      newValues: internship.toObject(),
    });

    return sendSuccess(res, { internship }, `Internship successfully updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInternships,
  submitInternship,
  getInternshipAnalytics,
  getMyInternships,
  getInternshipVerificationQueue,
  verifyInternship,
};
