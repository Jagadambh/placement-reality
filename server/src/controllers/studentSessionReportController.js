const StudentSessionReport = require('../models/StudentSessionReport');
const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const College = require('../models/College');
const AuditLog = require('../models/AuditLog');

/**
 * Submits or updates student-verified placement figures for an academic session.
 * POST /api/student-session-reports
 */
const submitStudentSessionReport = async (req, res, next) => {
  try {
    const {
      collegeId,
      seasonId,
      academicSession,
      departmentId,
      highestPackageLPA,
      averagePackageLPA,
      medianPackageLPA,
      totalStudentsPlaced,
      totalRecruitingCompanies,
      totalJobOffers,
      evidenceNotes,
    } = req.body;

    if (!collegeId || !seasonId) {
      return res.status(400).json({
        success: false,
        message: 'College ID and Season ID are required.',
      });
    }

    if (
      highestPackageLPA === undefined ||
      averagePackageLPA === undefined ||
      medianPackageLPA === undefined ||
      totalStudentsPlaced === undefined ||
      totalRecruitingCompanies === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Highest package, Average package, Median package, Total students placed, and Total recruiting companies are required.',
      });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    const season = await PlacementSeason.findById(seasonId);
    const sessionStr = academicSession || (season ? season.academicYear : '2023-24');

    const numHighest = parseFloat(highestPackageLPA);
    const numAvg = parseFloat(averagePackageLPA);
    const numMedian = parseFloat(medianPackageLPA);
    const numPlaced = parseInt(totalStudentsPlaced, 10);
    const numCompanies = parseInt(totalRecruitingCompanies, 10);
    const numOffers = totalJobOffers ? parseInt(totalJobOffers, 10) : null;

    let report = await StudentSessionReport.findOne({
      collegeId,
      seasonId,
      departmentId: departmentId || null,
    });

    if (report) {
      report.highestPackageLPA = numHighest;
      report.averagePackageLPA = numAvg;
      report.medianPackageLPA = numMedian;
      report.totalStudentsPlaced = numPlaced;
      report.totalRecruitingCompanies = numCompanies;
      report.totalJobOffers = numOffers;
      report.evidenceNotes = evidenceNotes || report.evidenceNotes;
      report.submittedBy = req.user?.id || req.user?._id;
      report.studentName = req.user?.name || 'Verified Student';
      report.academicSession = sessionStr;
      report.verificationStatus = 'Verified';
      await report.save();
    } else {
      report = await StudentSessionReport.create({
        collegeId,
        seasonId,
        academicSession: sessionStr,
        departmentId: departmentId || null,
        submittedBy: req.user?.id || req.user?._id,
        studentName: req.user?.name || 'Verified Student',
        highestPackageLPA: numHighest,
        averagePackageLPA: numAvg,
        medianPackageLPA: numMedian,
        totalStudentsPlaced: numPlaced,
        totalRecruitingCompanies: numCompanies,
        totalJobOffers: numOffers,
        evidenceNotes: evidenceNotes || 'Submitted by student verification',
        verificationStatus: 'Verified',
      });
    }

    // Synchronize to PlacementRecord with reportingSource: 'Student-Verified Aggregation'
    await PlacementRecord.findOneAndUpdate(
      {
        collegeId,
        seasonId,
        reportingSource: 'Student-Verified Aggregation',
      },
      {
        collegeId,
        seasonId,
        academicSession: sessionStr,
        reportingYear: sessionStr,
        reportingSource: 'Student-Verified Aggregation',
        recordType: 'Verified Outcome',
        isAdvertisedClaim: false,
        verificationLevel: 'Independently verified',
        verificationStatus: 'Student-Verified',
        approvalStatus: 'Verified',
        highestPackageLPA: numHighest,
        averagePackageLPA: numAvg,
        medianPackageLPA: numMedian,
        uniqueStudentsPlaced: numPlaced,
        uniqueRecruitersCount: numCompanies,
        totalJobOffers: numOffers || numPlaced,
        verifiedBy: req.user?.id || req.user?._id,
        verifiedAt: new Date(),
        lastUpdatedDate: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Student verified session placement statistics successfully recorded.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets student session reports for a college
 * GET /api/student-session-reports/:collegeId
 */
const getStudentSessionReports = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const reports = await StudentSessionReport.find({ collegeId })
      .populate('submittedBy', 'name email role')
      .populate('seasonId', 'academicYear seasonStatus')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitStudentSessionReport,
  getStudentSessionReports,
};
