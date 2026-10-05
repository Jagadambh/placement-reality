const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const College = require('../models/College');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { getCollegeSeasonAnalytics } = require('../services/analyticsService');
const { getAdvertisedVsRealityComparison } = require('../services/advertisedVsRealityService');
const {
  getComprehensiveHistoricalTrends,
  compareMultipleSessions,
} = require('../services/historicalAnalyticsService');
const {
  normalizeSessionKey,
  formatSessionLabel,
  ensureCollegeSessions,
} = require('../utils/academicSessionHelper');
const { recordAuditLog } = require('../services/auditService');

// @desc Get Advertised vs Reality comparison for a college, season and branch
// @route GET /api/placements/:collegeId/advertised-vs-reality
const getAdvertisedVsReality = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { seasonId, academicYear, departmentId } = req.query;

    const comparison = await getAdvertisedVsRealityComparison(collegeId, {
      seasonId,
      academicYear,
      departmentId,
    });

    return sendSuccess(res, comparison, 'Advertised vs Reality comparison retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Get analytics for specific college and season
// @route GET /api/placements/:collegeId/seasons/:seasonId
const getPlacementDashboard = async (req, res, next) => {
  try {
    const { collegeId, seasonId } = req.params;

    const analytics = await getCollegeSeasonAnalytics(collegeId, seasonId);
    return sendSuccess(res, analytics, 'Placement season analytics retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc Get comprehensive historical trends for college (2018-19 to current session)
// @route GET /api/placements/:collegeId/history
const getHistoricalTrends = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const history = await getComprehensiveHistoricalTrends(collegeId);
    return sendSuccess(res, history, 'Historical placement trends retrieved');
  } catch (error) {
    next(error);
  }
};

// @desc Compare multiple sessions side-by-side
// @route GET /api/placements/:collegeId/compare-sessions
const compareSessions = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { sessionIds } = req.query;
    const ids = Array.isArray(sessionIds) ? sessionIds : (sessionIds ? sessionIds.split(',') : []);
    const comparison = await compareMultipleSessions(collegeId, ids);
    return sendSuccess(res, comparison, 'Multi-session comparison retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Create or update official placement record (Admin only)
// @route POST /api/placements/records
const savePlacementRecord = async (req, res, next) => {
  try {
    const {
      collegeId,
      seasonId,
      reportingSource,
      reportingPeriod,
      reportingYear,
      sourceUrl,
      approvalStatus,
      totalGraduatingStudents,
      totalEligibleStudents,
      uniqueStudentsPlaced,
      totalJobOffers,
      studentsSeekingPlacement,
      highestPackageLPA,
      averagePackageLPA,
      medianPackageLPA,
      salaryDistribution,
      uniqueRecruitersCount,
      totalRecruitmentDrives,
      dreamOffersCount,
      superDreamOffersCount,
      domesticOffersCount,
      internationalOffersCount,
      branchBreakdown,
      topRecruiters,
      verificationStatus,
      changeReason,
      officialPaidInternshipsCount,
      officialUnpaidInternshipsCount,
      officialHighestStipendInr,
      officialAverageStipendInr,
      officialMedianStipendInr,
      documentName,
      lastCheckedDate,
      academicSession,
    } = req.body;

    let existingRecord = await PlacementRecord.findOne({ collegeId, seasonId });
    let oldValues = existingRecord ? existingRecord.toObject() : null;

    const payload = {
      collegeId,
      seasonId,
      reportingSource: reportingSource || 'Official Institute Report',
      reportingPeriod: reportingPeriod || 'Annual Academic Session',
      reportingYear: reportingYear || null,
      academicSession: academicSession || (reportingYear ? formatSessionLabel(reportingYear) : null),
      documentName: documentName || null,
      lastCheckedDate: lastCheckedDate ? new Date(lastCheckedDate) : new Date(),
      sourceUrl: sourceUrl || null,
      approvalStatus: approvalStatus || (existingRecord?.approvalStatus || 'Pending'),
      verificationLevel: req.body.verificationLevel || ((approvalStatus === 'Verified') ? 'Officially reported' : 'Unverified'),
      recordType: req.body.recordType || (req.body.isAdvertisedClaim ? 'Advertised Claim' : 'Official Report'),
      isAdvertisedClaim: Boolean(req.body.isAdvertisedClaim),
      verifiedBy: (approvalStatus === 'Verified') ? (req.user ? req.user._id : null) : null,
      verifiedAt: (approvalStatus === 'Verified') ? new Date() : null,
      totalGraduatingStudents: totalGraduatingStudents ?? null,
      totalEligibleStudents: totalEligibleStudents ?? null,
      eligibleDenominatorDisclosed: Boolean(totalEligibleStudents && totalEligibleStudents > 0),
      uniqueStudentsPlaced,
      totalJobOffers,
      studentsSeekingPlacement: studentsSeekingPlacement ?? null,
      highestPackageLPA,
      averagePackageLPA,
      medianPackageLPA,
      salaryDistribution: salaryDistribution || [],
      uniqueRecruitersCount,
      totalRecruitmentDrives: totalRecruitmentDrives ?? null,
      dreamOffersCount: dreamOffersCount ?? 0,
      superDreamOffersCount: superDreamOffersCount ?? 0,
      domesticOffersCount: domesticOffersCount ?? null,
      internationalOffersCount: internationalOffersCount ?? null,
      officialPaidInternshipsCount: officialPaidInternshipsCount !== undefined ? officialPaidInternshipsCount : null,
      officialUnpaidInternshipsCount: officialUnpaidInternshipsCount !== undefined ? officialUnpaidInternshipsCount : null,
      officialHighestStipendInr: officialHighestStipendInr !== undefined ? officialHighestStipendInr : null,
      officialAverageStipendInr: officialAverageStipendInr !== undefined ? officialAverageStipendInr : null,
      officialMedianStipendInr: officialMedianStipendInr !== undefined ? officialMedianStipendInr : null,
      branchBreakdown: branchBreakdown || [],
      topRecruiters: topRecruiters || [],
      verificationStatus: verificationStatus || 'Officially Reported',
      lastUpdatedDate: new Date(),
    };

    let record;
    if (existingRecord) {
      Object.assign(existingRecord, payload);
      record = await existingRecord.save();
    } else {
      record = await PlacementRecord.create(payload);
    }

    // MANDATORY AUDIT LOG: Never silently overwrite previously verified statistics!
    await recordAuditLog({
      actionType: existingRecord ? 'OVERWRITE_RECORD' : 'CREATE',
      entityType: 'PlacementRecord',
      entityId: record._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: changeReason || 'Placement figures updated with official documentation',
      oldValues,
      newValues: record.toObject(),
    });

    return sendSuccess(res, { record }, 'Placement record saved and audit log documented successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Import placement information from official college website / report (Admin only)
// @route POST /api/placements/import-official
const importOfficialPlacementRecord = async (req, res, next) => {
  try {
    const {
      collegeId,
      academicYear,
      seasonId,
      sourceUrl,
      reportingYear,
      reportingSource,
      reportingPeriod,
      totalGraduatingStudents,
      totalEligibleStudents,
      uniqueStudentsPlaced,
      totalJobOffers,
      studentsSeekingPlacement,
      highestPackageLPA,
      averagePackageLPA,
      medianPackageLPA,
      salaryDistribution,
      uniqueRecruitersCount,
      totalRecruitmentDrives,
      dreamOffersCount,
      superDreamOffersCount,
      domesticOffersCount,
      internationalOffersCount,
      branchBreakdown,
      topRecruiters,
      verificationNotes,
      officialPaidInternshipsCount,
      officialUnpaidInternshipsCount,
      officialHighestStipendInr,
      officialAverageStipendInr,
      officialMedianStipendInr,
      documentName,
      lastCheckedDate,
      academicSession,
    } = req.body;

    if (!collegeId) {
      return sendError(res, 'College ID is required', 400);
    }
    if (!sourceUrl) {
      return sendError(res, 'Source URL from official college website/report is required', 400);
    }
    if (!reportingYear) {
      return sendError(res, 'Reporting year is required', 400);
    }

    const normYear = normalizeSessionKey(reportingYear);

    // Resolve or find season
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      let season = await PlacementSeason.findOne({
        collegeId,
        academicYear: { $in: [normYear, reportingYear] },
      });
      if (!season) {
        season = await PlacementSeason.create({
          collegeId,
          academicYear: normYear,
          seasonStatus: 'Concluded',
          methodologyNotes: 'Created automatically for official report import',
        });
      }
      targetSeasonId = season._id;
    }

    const payload = {
      collegeId,
      seasonId: targetSeasonId,
      reportingSource: reportingSource || 'Official Institute Website',
      reportingPeriod: reportingPeriod || `${reportingYear} Annual Session`,
      reportingYear: normYear,
      academicSession: academicSession || formatSessionLabel(reportingYear),
      documentName: documentName || null,
      lastCheckedDate: lastCheckedDate ? new Date(lastCheckedDate) : new Date(),
      sourceUrl,
      importDate: new Date(),
      importedBy: req.user._id,
      // REQUIREMENT 7: Do not automatically mark records as verified. Require source validation.
      approvalStatus: 'Pending',
      verificationStatus: 'Officially Reported',
      verificationLevel: 'Unverified',
      recordType: req.body.isAdvertisedClaim ? 'Advertised Claim' : 'Official Report',
      isAdvertisedClaim: Boolean(req.body.isAdvertisedClaim),
      verificationNotes: verificationNotes || `Imported from official source: ${sourceUrl}`,
      totalGraduatingStudents: totalGraduatingStudents ? parseInt(totalGraduatingStudents, 10) : null,
      totalEligibleStudents: totalEligibleStudents ? parseInt(totalEligibleStudents, 10) : null,
      eligibleDenominatorDisclosed: Boolean(totalEligibleStudents && parseInt(totalEligibleStudents, 10) > 0),
      uniqueStudentsPlaced: parseInt(uniqueStudentsPlaced || '0', 10),
      totalJobOffers: parseInt(totalJobOffers || '0', 10),
      studentsSeekingPlacement: studentsSeekingPlacement ? parseInt(studentsSeekingPlacement, 10) : null,
      highestPackageLPA: highestPackageLPA ? parseFloat(highestPackageLPA) : null,
      averagePackageLPA: averagePackageLPA ? parseFloat(averagePackageLPA) : null,
      medianPackageLPA: medianPackageLPA ? parseFloat(medianPackageLPA) : null,
      salaryDistribution: salaryDistribution || [],
      uniqueRecruitersCount: uniqueRecruitersCount ? parseInt(uniqueRecruitersCount, 10) : null,
      totalRecruitmentDrives: totalRecruitmentDrives ? parseInt(totalRecruitmentDrives, 10) : null,
      dreamOffersCount: dreamOffersCount ? parseInt(dreamOffersCount, 10) : 0,
      superDreamOffersCount: superDreamOffersCount ? parseInt(superDreamOffersCount, 10) : 0,
      domesticOffersCount: domesticOffersCount ? parseInt(domesticOffersCount, 10) : null,
      internationalOffersCount: internationalOffersCount ? parseInt(internationalOffersCount, 10) : null,
      officialPaidInternshipsCount: officialPaidInternshipsCount ? parseInt(officialPaidInternshipsCount, 10) : null,
      officialUnpaidInternshipsCount: officialUnpaidInternshipsCount ? parseInt(officialUnpaidInternshipsCount, 10) : null,
      officialHighestStipendInr: officialHighestStipendInr ? parseFloat(officialHighestStipendInr) : null,
      officialAverageStipendInr: officialAverageStipendInr ? parseFloat(officialAverageStipendInr) : null,
      officialMedianStipendInr: officialMedianStipendInr ? parseFloat(officialMedianStipendInr) : null,
      branchBreakdown: branchBreakdown || [],
      topRecruiters: topRecruiters || [],
      lastUpdatedDate: new Date(),
    };

    let existingRecord = await PlacementRecord.findOne({ collegeId, seasonId: targetSeasonId });
    let oldValues = existingRecord ? existingRecord.toObject() : null;
    let record;

    if (existingRecord) {
      Object.assign(existingRecord, payload);
      record = await existingRecord.save();
    } else {
      record = await PlacementRecord.create(payload);
    }

    await recordAuditLog({
      actionType: 'IMPORT_OFFICIAL_REPORT',
      entityType: 'PlacementRecord',
      entityId: record._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Imported official placement metrics from ${sourceUrl} for year ${reportingYear}. Pending verification.`,
      oldValues,
      newValues: record.toObject(),
    });

    return sendSuccess(
      res,
      { record },
      'Official placement metrics imported with Pending verification status. Requires moderator validation before public release.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Verify or reject official placement record (Admin / Moderator)
// @route PUT /api/placements/records/:id/verify
const verifyPlacementRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus, verificationLevel, rejectionReason, notes } = req.body;

    if (!['Pending', 'Verified', 'Rejected'].includes(approvalStatus)) {
      return sendError(res, 'Invalid approval status. Must be Pending, Verified, or Rejected.', 400);
    }

    const record = await PlacementRecord.findById(id).populate('collegeId', 'name shortName institutionCategory');
    if (!record) {
      return sendError(res, 'Placement record not found', 404);
    }

    const oldState = record.toObject();
    record.approvalStatus = approvalStatus;
    record.reviewedBy = req.user._id;
    record.reviewedAt = new Date();
    if (notes) record.verificationNotes = notes;

    if (approvalStatus === 'Verified') {
      // Standardize Requirement 5 Verification Level
      record.verificationLevel = verificationLevel || record.verificationLevel || 'Officially reported';
      record.verifiedBy = req.user._id;
      record.verifiedAt = new Date();
      record.rejectionReason = null;
    } else if (approvalStatus === 'Rejected') {
      record.verificationLevel = 'Unverified';
      record.rejectionReason = rejectionReason || 'Source documentation or statistics could not be validated.';
    } else {
      record.verificationLevel = 'Unverified';
    }

    await record.save();

    await recordAuditLog({
      actionType: approvalStatus === 'Verified' ? 'VERIFY_RECORD' : 'REJECT_RECORD',
      entityType: 'PlacementRecord',
      entityId: record._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Placement record approvalStatus changed to ${approvalStatus} (Level: ${record.verificationLevel}). ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
      oldValues: oldState,
      newValues: record.toObject(),
    });

    return sendSuccess(res, { record }, `Placement record marked as ${approvalStatus} (${record.verificationLevel})`);
  } catch (error) {
    next(error);
  }
};

// @desc Get pending official placement records queue (Admin / Moderator)
// @route GET /api/placements/pending-records
const getPendingPlacementRecords = async (req, res, next) => {
  try {
    const { status = 'Pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.approvalStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PlacementRecord.countDocuments(query);
    const records = await PlacementRecord.find(query)
      .populate('collegeId', 'name shortName tierClassification campusType institutionCategory')
      .populate('seasonId', 'academicYear')
      .populate('importedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('verifiedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, { records, total }, 'Pending placement records retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdvertisedVsReality,
  getPlacementDashboard,
  getHistoricalTrends,
  compareSessions,
  savePlacementRecord,
  importOfficialPlacementRecord,
  verifyPlacementRecord,
  getPendingPlacementRecords,
};
