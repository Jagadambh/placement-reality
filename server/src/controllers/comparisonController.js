const College = require('../models/College');
const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const Internship = require('../models/Internship');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { getCollegeSeasonAnalytics, getCollegeInternshipAnalytics } = require('../services/analyticsService');

// @desc Compare up to 4 colleges
// @route POST /api/comparisons
const compareColleges = async (req, res, next) => {
  try {
    const { collegeIds } = req.body;

    if (!Array.isArray(collegeIds) || collegeIds.length < 2) {
      return sendError(res, 'Please provide between 2 and 4 college identifiers to compare.', 400);
    }

    if (collegeIds.length > 4) {
      return sendError(res, 'You can compare a maximum of 4 colleges simultaneously.', 400);
    }

    const comparisonData = await Promise.all(
      collegeIds.map(async (cId) => {
        const college = await College.findById(cId);
        if (!college) return null;

        // 1. Prioritize finding the latest verified placement record sorted by academic year descending
        const verifiedRecords = await PlacementRecord.find({
          collegeId: cId,
          approvalStatus: 'Verified',
        }).populate('seasonId');

        let latestVerifiedRecord = null;
        let seasonToUse = null;

        if (verifiedRecords.length > 0) {
          verifiedRecords.sort((a, b) => {
            const yearA = a.seasonId?.academicYear || a.academicSession || '';
            const yearB = b.seasonId?.academicYear || b.academicSession || '';
            return yearB.localeCompare(yearA);
          });
          latestVerifiedRecord = verifiedRecords[0];
          seasonToUse = latestVerifiedRecord.seasonId;
        }

        // If no verified record found with a linked seasonId, try to find the latest active or concluded season
        if (!seasonToUse) {
          seasonToUse = await PlacementSeason.findOne({
            collegeId: cId,
            seasonStatus: { $ne: 'Upcoming' },
          }).sort({ academicYear: -1 });
        }

        // Fallback to any season
        if (!seasonToUse) {
          seasonToUse = await PlacementSeason.findOne({ collegeId: cId }).sort({ academicYear: -1 });
        }

        let analytics = null;
        if (seasonToUse) {
          try {
            analytics = await getCollegeSeasonAnalytics(cId, seasonToUse._id);
          } catch (analyticsErr) {
            console.warn(`[Comparison Analytics Notice] college ${cId}:`, analyticsErr.message);
          }
        }

        const internshipSummary = await getCollegeInternshipAnalytics(cId).catch(() => null);

        // Safe extraction of headlineStats with fallback to latestVerifiedRecord
        const stats = analytics?.headlineStats;
        const hasStats = Boolean(stats);
        const hasVerified = Boolean(analytics?.hasVerifiedData || latestVerifiedRecord);

        const medianPackageLPA = stats?.medianPackageLPA ?? latestVerifiedRecord?.medianPackageLPA ?? null;
        const averagePackageLPA = stats?.averagePackageLPA ?? latestVerifiedRecord?.averagePackageLPA ?? null;
        const highestPackageLPA = stats?.highestPackageLPA ?? latestVerifiedRecord?.highestPackageLPA ?? null;
        const uniqueStudentsPlaced = stats?.uniqueStudentsPlaced ?? latestVerifiedRecord?.uniqueStudentsPlaced ?? null;
        const totalJobOffers = stats?.totalJobOffers ?? latestVerifiedRecord?.totalJobOffers ?? null;
        const totalEligibleStudents = stats?.totalEligibleStudents ?? latestVerifiedRecord?.totalEligibleStudents ?? null;
        const uniqueRecruitersCount = stats?.uniqueRecruitersCount ?? latestVerifiedRecord?.uniqueRecruitersCount ?? null;

        let placementRate = stats?.placementRate || null;
        if (!placementRate && totalEligibleStudents && uniqueStudentsPlaced) {
          placementRate = {
            percentage: Number(((uniqueStudentsPlaced / totalEligibleStudents) * 100).toFixed(1)),
            canCalculate: true,
          };
        }

        return {
          college: {
            id: college._id,
            name: college.name,
            shortName: college.shortName || college.name.slice(0, 10),
            tierClassification: college.tierClassification,
            city: college.city,
            state: college.state,
            campusType: college.campusType,
            dataCompletenessScore: college.dataCompletenessScore || 70,
          },
          season: seasonToUse
            ? {
                academicYear: seasonToUse.academicYear,
                methodologyNotes: seasonToUse.methodologyNotes,
              }
            : latestVerifiedRecord
            ? {
                academicYear: latestVerifiedRecord.academicSession,
                methodologyNotes: 'Official Institutional Report',
              }
            : null,
          analytics: {
            hasVerifiedData: hasVerified,
            medianPackageLPA,
            averagePackageLPA,
            highestPackageLPA,
            uniqueStudentsPlaced,
            totalJobOffers,
            totalEligibleStudents,
            placementRate,
            uniqueRecruitersCount,
            dreamOffersCount: stats?.dreamOffersCount || 0,
            superDreamOffersCount: stats?.superDreamOffersCount || 0,
            reportingSource: analytics?.provenance?.primarySource || latestVerifiedRecord?.primaryReportingSource || 'Official / Student Audited',
            verificationStatus: analytics?.provenance?.verificationStatus || (hasVerified ? 'Verified' : 'Unverified'),
            confidenceScore: analytics?.provenance?.confidenceScore || (hasVerified ? 85 : 0),
            branchBreakdown: analytics?.branchBreakdown || [],
          },
          internshipSummary: {
            totalRecords: internshipSummary?.totalRecords || 0,
            verifiedRecords: internshipSummary?.verifiedRecordsCount || 0,
            medianMonthlyStipendINR: internshipSummary?.stipendSummary?.medianMonthlyStipendINR || null,
            ppoConversionRatePercentage: internshipSummary?.ppoMetrics?.ppoConversionRatePercentage || null,
          },
          dataQualityTier: analytics?.dataQualityIndicators?.tier || (hasVerified ? 'Audited' : 'Initial'),
        };
      })
    );

    const validComparisons = comparisonData.filter(Boolean);

    // Identify methodological differences
    const methodologyDifferences = [];
    const hasMissingDenominators = validComparisons.some((c) => !c.analytics?.placementRate?.canCalculate);
    if (hasMissingDenominators) {
      methodologyDifferences.push(
        'Denominator Variance: One or more colleges do not disclose eligible student headcounts. Their placement rates cannot be mathematically compared directly without bias.'
      );
    }

    const sources = new Set(validComparisons.map((c) => c.analytics?.reportingSource).filter(Boolean));
    if (sources.size > 1) {
      methodologyDifferences.push(
        `Source Diversity: Figures originate from different reporting frameworks (${Array.from(sources).join(', ')}). Cross-reference with confidence scores.`
      );
    }

    return sendSuccess(
      res,
      {
        comparisons: validComparisons,
        methodologyDifferences,
        generatedAt: new Date(),
      },
      'Comparison matrix compiled successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  compareColleges,
};
