const UploadedReport = require('../models/UploadedReport');
const PlacementRecord = require('../models/PlacementRecord');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');

// @desc Upload official placement report document
// @route POST /api/reports/upload
const uploadOfficialReport = async (req, res, next) => {
  try {
    const { collegeId, seasonId, title, reportType, extractedStats } = req.body;

    if (!req.file && !req.body.documentUrl) {
      return sendError(res, 'Please provide an official document file or document URL.', 400);
    }

    const documentUrl = req.file ? req.file.path : req.body.documentUrl;

    let parsedStats = null;
    if (extractedStats) {
      try {
        parsedStats = typeof extractedStats === 'string' ? JSON.parse(extractedStats) : extractedStats;
      } catch (e) {
        // use raw or fallback
      }
    }

    const report = await UploadedReport.create({
      collegeId,
      seasonId,
      uploadedBy: req.user._id,
      title: title || 'Official Placement Report Document',
      reportType: reportType || 'Official Brochure',
      documentUrl,
      parsingStatus: parsedStats ? 'Processed' : 'Needs Review',
      extractedStats: parsedStats || {},
    });

    await recordAuditLog({
      actionType: 'CREATE',
      entityType: 'UploadedReport',
      entityId: report._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Uploaded official report: ${title}`,
      newValues: report.toObject(),
    });

    return sendSuccess(res, { report }, 'Official report registered and queued for verification', 201);
  } catch (error) {
    next(error);
  }
};

// @desc Get uploaded reports for a college
// @route GET /api/reports/college/:collegeId
const getCollegeReports = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const reports = await UploadedReport.find({ collegeId })
      .populate('uploadedBy', 'name email')
      .populate('seasonId', 'academicYear')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { reports }, 'Official reports retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadOfficialReport,
  getCollegeReports,
};
