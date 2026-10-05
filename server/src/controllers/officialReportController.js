const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const InstitutionDiscoveryLog = require('../models/InstitutionDiscoveryLog');
const College = require('../models/College');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const { discoverReportsForCollege } = require('../services/reportDiscoveryService');
const { downloadAndExtractReport } = require('../services/reportExtractionService');
const { runScheduledScan, getScannerStatus } = require('../services/scheduledScannerService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');

// @desc Get official placement reports with filtering
// @route GET /api/official-reports
const getOfficialReports = async (req, res, next) => {
  try {
    const { collegeId, academicSession, status, category, limit = 50, page = 1 } = req.query;

    const query = {};
    if (collegeId) query.collegeId = collegeId;
    if (academicSession && academicSession !== 'all') query.academicSession = academicSession;
    if (status && status !== 'all') query.status = status;

    // Filter by institution category if requested
    if (category && category !== 'all') {
      const collegesInCategory = await College.find({
        'institutionCategory.category': new RegExp(category, 'i'),
      }).select('_id');
      query.collegeId = { $in: collegesInCategory.map((c) => c._id) };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await OfficialPlacementReport.countDocuments(query);

    const reports = await OfficialPlacementReport.find(query)
      .populate('collegeId', 'name shortName slug website institutionCategory tierClassification')
      .populate('seasonId', 'academicYear seasonType')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Attach count of extracted metrics per report
    const reportIds = reports.map((r) => r._id);
    const metricsCounts = await OfficialReportMetric.aggregate([
      { $match: { reportId: { $in: reportIds } } },
      { $group: { _id: '$reportId', count: { $sum: 1 } } },
    ]);
    const metricsMap = new Map(metricsCounts.map((m) => [String(m._id), m.count]));

    const enrichedReports = reports.map((r) => ({
      ...r.toObject(),
      metricsCount: metricsMap.get(String(r._id)) || 0,
    }));

    return sendSuccess(res, {
      reports: enrichedReports,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get single report with all extracted metrics and citations
// @route GET /api/official-reports/:id
const getReportById = async (req, res, next) => {
  try {
    const report = await OfficialPlacementReport.findById(req.params.id)
      .populate('collegeId')
      .populate('seasonId')
      .populate('reviewedBy', 'name email role');

    if (!report) {
      return sendError(res, 'Official placement report not found', 404);
    }

    const metrics = await OfficialReportMetric.find({ reportId: report._id })
      .populate('reviewedBy', 'name email role')
      .sort({ pageNumber: 1, metricName: 1 });

    return sendSuccess(res, { report, metrics });
  } catch (err) {
    next(err);
  }
};

// @desc Manual scan trigger for a selected institution
// @route POST /api/official-reports/scan/:collegeId
const scanCollegeWebsite = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const college = await College.findById(collegeId);
    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const discoveryResult = await discoverReportsForCollege(collegeId, {
      initiatedBy: req.user._id,
      scanType: 'manual',
    });

    // Auto-fetch newly discovered reports
    const newReports = await OfficialPlacementReport.find({
      collegeId,
      status: 'Discovered',
    }).limit(5);

    let extractedCount = 0;
    for (const rep of newReports) {
      try {
        await downloadAndExtractReport(rep._id);
        extractedCount++;
      } catch (e) {
        console.warn(`[Scan] Auto-extract notice for report ${rep._id}:`, e.message);
      }
    }

    await recordAuditLog({
      actionType: 'SCAN_OFFICIAL_WEBSITE',
      entityType: 'College',
      entityId: college._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Manual scan triggered for official website: ${college.website}`,
      newValues: {
        reportsDiscovered: discoveryResult.reportsFoundCount,
        reportsExtracted: extractedCount,
      },
      req,
    });

    return sendSuccess(
      res,
      {
        discoveryResult,
        extractedCount,
      },
      `Scan completed for ${college.name}. ${discoveryResult.reportsFoundCount} report(s) found, ${extractedCount} processed.`
    );
  } catch (err) {
    next(err);
  }
};

// @desc Re-run document extraction on an existing report
// @route POST /api/official-reports/:id/extract
const triggerReportExtraction = async (req, res, next) => {
  try {
    const result = await downloadAndExtractReport(req.params.id);
    if (!result.success) {
      return sendError(res, result.error || 'Document extraction failed', 422);
    }

    await recordAuditLog({
      actionType: 'EXTRACT_REPORT_METRICS',
      entityType: 'OfficialPlacementReport',
      entityId: req.params.id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: 'Manual re-extraction triggered for official report document',
      newValues: { metricsExtracted: result.metricsCount },
      req,
    });

    return sendSuccess(res, result, `Extracted ${result.metricsCount} metric(s) successfully.`);
  } catch (err) {
    next(err);
  }
};

// @desc Review & approve or reject an official placement report
// @route PUT /api/official-reports/:id/review
const reviewOfficialReport = async (req, res, next) => {
  try {
    const { action, rejectionReason, moderatorNotes } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return sendError(res, 'Action must be either "approve" or "reject"', 400);
    }

    const report = await OfficialPlacementReport.findById(req.params.id);
    if (!report) {
      return sendError(res, 'Report not found', 404);
    }

    const previousStatus = report.status;

    if (action === 'approve') {
      report.status = 'Approved';
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
      report.rejectionReason = null;
      await report.save();

      // Approve and publish all associated metrics
      await OfficialReportMetric.updateMany(
        { reportId: report._id, reviewStatus: { $ne: 'Rejected' } },
        {
          reviewStatus: 'Approved',
          isPublished: true,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        }
      );

      // Harmonize approved figures into the Advertised PlacementRecord
      if (report.seasonId) {
        const approvedMetrics = await OfficialReportMetric.find({
          reportId: report._id,
          reviewStatus: 'Approved',
        });

        let highestLPA = null;
        let averageLPA = null;
        let medianLPA = null;
        let placedCount = null;
        let eligibleCount = null;
        let totalOffers = null;
        let recruitersCount = null;

        for (const m of approvedMetrics) {
          if (m.metricName === 'Highest Package') highestLPA = m.normalizedValue;
          if (m.metricName === 'Average Package') averageLPA = m.normalizedValue;
          if (m.metricName === 'Median Package') medianLPA = m.normalizedValue;
          if (m.metricName === 'Students Placed') placedCount = m.normalizedValue;
          if (m.metricName === 'Eligible Students') eligibleCount = m.normalizedValue;
          if (m.metricName === 'Total Job Offers') totalOffers = m.normalizedValue;
          if (m.metricName === 'Companies Visiting') recruitersCount = m.normalizedValue;
        }

        // Upsert official placement record
        await PlacementRecord.findOneAndUpdate(
          {
            collegeId: report.collegeId,
            seasonId: report.seasonId,
            reportingSource: 'Official Institute Report',
          },
          {
            $set: {
              highestPackageLPA: highestLPA,
              averagePackageLPA: averageLPA,
              medianPackageLPA: medianLPA,
              uniqueStudentsPlaced: placedCount || 0,
              eligibleStudents: eligibleCount,
              totalJobOffers: totalOffers || 0,
              recruiterCount: recruitersCount,
              verificationStatus: 'Officially Reported',
              isVerifiedByAdmin: true,
              sourceDocumentUrl: report.reportUrl,
              sourceCitationNote: `Extracted from official document "${report.documentTitle}" (${report.sourceUrl})`,
              lastUpdatedDate: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      }

      await recordAuditLog({
        actionType: 'APPROVE_OFFICIAL_REPORT',
        entityType: 'OfficialPlacementReport',
        entityId: report._id,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByRole: req.user.role,
        changeReason: moderatorNotes || 'Moderator verified extraction fidelity against cited official source',
        oldValues: { status: previousStatus },
        newValues: { status: 'Approved' },
        req,
      });

      return sendSuccess(res, { report }, 'Official placement report approved and published.');
    } else {
      // Reject
      if (!rejectionReason) {
        return sendError(res, 'Rejection reason is mandatory', 400);
      }

      report.status = 'Rejected';
      report.rejectionReason = rejectionReason;
      report.reviewedBy = req.user._id;
      report.reviewedAt = new Date();
      await report.save();

      // Reject all pending metrics
      await OfficialReportMetric.updateMany(
        { reportId: report._id },
        { reviewStatus: 'Rejected', isPublished: false, reviewedBy: req.user._id, reviewedAt: new Date() }
      );

      await recordAuditLog({
        actionType: 'REJECT_OFFICIAL_REPORT',
        entityType: 'OfficialPlacementReport',
        entityId: report._id,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByRole: req.user.role,
        changeReason: rejectionReason,
        oldValues: { status: previousStatus },
        newValues: { status: 'Rejected', rejectionReason },
        req,
      });

      return sendSuccess(res, { report }, 'Official placement report rejected.');
    }
  } catch (err) {
    next(err);
  }
};

// @desc Review individual extracted metric
// @route PUT /api/official-reports/metrics/:metricId/review
const reviewReportMetric = async (req, res, next) => {
  try {
    const { action, correctedValue, moderatorNotes } = req.body;
    const metric = await OfficialReportMetric.findById(req.params.metricId);
    if (!metric) {
      return sendError(res, 'Metric not found', 404);
    }

    const previousValues = {
      reviewStatus: metric.reviewStatus,
      rawReportedValue: metric.rawReportedValue,
      normalizedValue: metric.normalizedValue,
    };

    if (action === 'approve') {
      metric.reviewStatus = 'Approved';
      metric.isPublished = true;
      metric.moderatorNotes = moderatorNotes || null;
      metric.reviewedBy = req.user._id;
      metric.reviewedAt = new Date();
      await metric.save();

      await recordAuditLog({
        actionType: 'APPROVE_REPORT_METRIC',
        entityType: 'OfficialReportMetric',
        entityId: metric._id,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByRole: req.user.role,
        changeReason: moderatorNotes || 'Individual metric extraction approved',
        oldValues: previousValues,
        newValues: { reviewStatus: 'Approved' },
        req,
      });

      return sendSuccess(res, { metric }, 'Metric approved.');
    } else if (action === 'reject') {
      metric.reviewStatus = 'Rejected';
      metric.isPublished = false;
      metric.moderatorNotes = moderatorNotes || 'Rejected by moderator';
      metric.reviewedBy = req.user._id;
      metric.reviewedAt = new Date();
      await metric.save();

      await recordAuditLog({
        actionType: 'REJECT_REPORT_METRIC',
        entityType: 'OfficialReportMetric',
        entityId: metric._id,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByRole: req.user.role,
        changeReason: moderatorNotes || 'Individual metric rejected',
        oldValues: previousValues,
        newValues: { reviewStatus: 'Rejected' },
        req,
      });

      return sendSuccess(res, { metric }, 'Metric rejected.');
    } else if (action === 'correct') {
      if (correctedValue === undefined || correctedValue === null) {
        return sendError(res, 'Corrected value is required', 400);
      }

      metric.normalizedValue = parseFloat(correctedValue);
      metric.rawReportedValue = `${correctedValue} ${metric.unit}`;
      metric.reviewStatus = 'Corrected';
      metric.isPublished = true;
      metric.moderatorNotes = moderatorNotes || 'Corrected manually by moderator';
      metric.reviewedBy = req.user._id;
      metric.reviewedAt = new Date();
      await metric.save();

      await recordAuditLog({
        actionType: 'CORRECT_REPORT_METRIC',
        entityType: 'OfficialReportMetric',
        entityId: metric._id,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByRole: req.user.role,
        changeReason: moderatorNotes || 'Metric value corrected to match document text',
        oldValues: previousValues,
        newValues: {
          normalizedValue: metric.normalizedValue,
          reviewStatus: 'Corrected',
        },
        req,
      });

      return sendSuccess(res, { metric }, 'Metric corrected and published.');
    } else {
      return sendError(res, 'Action must be approve, reject, or correct', 400);
    }
  } catch (err) {
    next(err);
  }
};

// @desc Public overview for the Official Placement Reports page
// @route GET /api/official-reports/public-overview
const getPublicOverview = async (req, res, next) => {
  try {
    const { collegeId, academicSession, category } = req.query;

    const filter = {};
    if (collegeId) filter.collegeId = collegeId;
    if (academicSession && academicSession !== 'all') filter.academicSession = academicSession;

    if (category && category !== 'all') {
      const collegesInCategory = await College.find({
        'institutionCategory.category': new RegExp(category, 'i'),
      }).select('_id');
      filter.collegeId = { $in: collegesInCategory.map((c) => c._id) };
    }

    const reports = await OfficialPlacementReport.find(filter)
      .populate('collegeId', 'name shortName slug website institutionCategory tierClassification')
      .populate('seasonId', 'academicYear')
      .sort({ academicSession: -1, createdAt: -1 });

    const reportIds = reports.map((r) => r._id);
    const publishedMetrics = await OfficialReportMetric.find({
      reportId: { $in: reportIds },
      isPublished: true,
    });

    const metricsByReport = new Map();
    for (const m of publishedMetrics) {
      const repKey = String(m.reportId);
      if (!metricsByReport.has(repKey)) {
        metricsByReport.set(repKey, []);
      }
      metricsByReport.get(repKey).push(m);
    }

    const enriched = reports.map((r) => ({
      ...r.toObject(),
      metrics: metricsByReport.get(String(r._id)) || [],
    }));

    // Deduplicate by College + Academic Session (Requirements 8 & 9)
    // Ensures final overview displays different years for each college, without repeated copies of the same year's record
    const sessionSeen = new Map();
    const deduplicatedEnriched = [];

    // Prioritize reports with extracted metrics, approved status, or PDF fileType
    const sortedEnriched = [...enriched].sort((a, b) => {
      const aScore = (a.metrics?.length || 0) * 10 + (a.status === 'Approved' ? 5 : 0) + (a.fileType === 'pdf' ? 2 : 0);
      const bScore = (b.metrics?.length || 0) * 10 + (b.status === 'Approved' ? 5 : 0) + (b.fileType === 'pdf' ? 2 : 0);
      return bScore - aScore;
    });

    for (const r of sortedEnriched) {
      const colId = r.collegeId?._id ? String(r.collegeId._id) : String(r.collegeId);
      const sessionKey = `${colId}_${r.academicSession}`;
      if (!sessionSeen.has(sessionKey)) {
        sessionSeen.set(sessionKey, true);
        deduplicatedEnriched.push(r);
      }
    }

    // Sort chronologically descending by academic session
    deduplicatedEnriched.sort((a, b) => (b.academicSession || '').localeCompare(a.academicSession || ''));

    return sendSuccess(res, { reports: deduplicatedEnriched });
  } catch (err) {
    next(err);
  }
};

// @desc Get discovery logs
// @route GET /api/official-reports/discovery-logs
const getDiscoveryLogs = async (req, res, next) => {
  try {
    const { collegeId, limit = 20 } = req.query;
    const query = collegeId ? { collegeId } : {};

    const logs = await InstitutionDiscoveryLog.find(query)
      .populate('collegeId', 'name shortName website')
      .populate('initiatedBy', 'name email role')
      .sort({ scannedAt: -1 })
      .limit(parseInt(limit, 10));

    return sendSuccess(res, {
      logs,
      scannerStatus: getScannerStatus(),
    });
  } catch (err) {
    next(err);
  }
};

// @desc Download or stream official report document (or redirect to official source)
// @route GET /api/official-reports/:id/download
const downloadReportDocument = async (req, res, next) => {
  try {
    const report = await OfficialPlacementReport.findById(req.params.id);
    if (!report) {
      return sendError(res, 'Report not found', 404);
    }

    if (report.localFilePath && require('fs').existsSync(report.localFilePath)) {
      res.setHeader('Content-Type', report.fileType === 'pdf' ? 'application/pdf' : 'text/html');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(report.documentTitle)}.${report.fileType === 'pdf' ? 'pdf' : 'html'}"`
      );
      return res.sendFile(report.localFilePath);
    }

    // Fallback: redirect directly to official URL
    return res.redirect(report.reportUrl);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOfficialReports,
  getReportById,
  scanCollegeWebsite,
  triggerReportExtraction,
  reviewOfficialReport,
  reviewReportMetric,
  getPublicOverview,
  getDiscoveryLogs,
  downloadReportDocument,
};
