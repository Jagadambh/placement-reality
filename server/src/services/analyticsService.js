const mongoose = require('mongoose');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const PlacementSeason = require('../models/PlacementSeason');
const College = require('../models/College');
const {
  calculateMedian,
  calculateAverage,
  calculateSalaryDistribution,
  calculatePlacementRate,
  calculateDataQualityIndicators,
} = require('../utils/calculateMetrics');

/**
 * Aggregates statistics for a college and a specific placement season.
 * Integrates baseline official records and student-verified submissions.
 */
const getCollegeSeasonAnalytics = async (collegeId, seasonId) => {
  const college = await College.findById(collegeId);
  const season = await PlacementSeason.findById(seasonId);

  if (!college || !season) {
    throw new Error('College or placement season not found');
  }

  // 1. Fetch official/baseline record if available AND strictly verified!
  const baselineRecord = await PlacementRecord.findOne({
    collegeId,
    seasonId,
    approvalStatus: 'Verified',
  });

  // 2. Fetch student-verified offers for this college and season
  const verifiedOffers = await Offer.find({
    collegeId,
    seasonId,
    verificationStatus: 'Verified',
  }).populate('departmentId', 'name code');

  // Total student-submitted offers (including pending/under-review)
  const allSubmissions = await Offer.find({
    collegeId,
    seasonId,
  });

  // If no verified official record and no verified student offers exist:
  if (!baselineRecord && verifiedOffers.length === 0) {
    return {
      college: {
        id: college._id,
        name: college.name,
        slug: college.slug,
        shortName: college.shortName,
        tierClassification: college.tierClassification,
        city: college.city,
        state: college.state,
        campusType: college.campusType,
        institutionCategory: college.institutionCategory,
        nirfRanking: college.nirfRanking,
      },
      policy: {
        category: college.institutionCategory?.category || (college.campusType === 'IIT' ? 'Category A: Premium Public' : 'Category B: Private'),
        subCategory: college.institutionCategory?.subCategory || college.campusType,
        policyName: college.institutionCategory?.category === 'Category A: Premium Public' ? 'Premium Public Historical Placement Policy' : 'Strict Private Verification Policy',
        missingMetricLabel: college.institutionCategory?.category === 'Category A: Premium Public' ? 'Not reported' : 'Verified data not available for this session',
      },
      season: {
        id: season._id,
        academicYear: season.academicYear,
        seasonStatus: season.seasonStatus,
        methodologyNotes: season.methodologyNotes,
      },
      hasVerifiedData: false,
      message: 'No verified placement data available yet.',
      provenance: null,
      headlineStats: null,
      salaryDistribution: [],
      branchBreakdown: [],
      topRecruiters: [],
      communityVerificationTelemetry: {
        totalSubmissionsCount: allSubmissions.length,
        verifiedSubmissionsCount: 0,
        verifiedUniqueStudentsCount: 0,
        verifiedMedianCTC: null,
        verifiedAverageCTC: null,
      },
      dataQualityIndicators: { score: 0, tier: 'Unverified / No Verified Data' },
    };
  }

  // Unique placed students from student submissions (Set of studentIds)
  const uniqueVerifiedStudentIds = new Set(
    verifiedOffers.map((o) => o.studentId.toString())
  );

  // Extract salaries
  const verifiedSalaries = verifiedOffers.map((o) => o.annualCtcLpa);

  // Computed metrics from verified submissions
  const verifiedSubmissionsCount = verifiedOffers.length;
  const verifiedUniquePlaced = uniqueVerifiedStudentIds.size;
  const verifiedMedianCTC = calculateMedian(verifiedSalaries);
  const verifiedAverageCTC = calculateAverage(verifiedSalaries);
  const verifiedHighestCTC = verifiedSalaries.length > 0 ? Math.max(...verifiedSalaries) : null;
  const verifiedSalaryDistribution = calculateSalaryDistribution(verifiedSalaries);

  // Determine composite headline figures
  let totalGraduating = baselineRecord?.totalGraduatingStudents ?? null;
  let totalEligible = baselineRecord?.totalEligibleStudents ?? null;
  let uniqueStudentsPlaced = baselineRecord?.uniqueStudentsPlaced ?? verifiedUniquePlaced;
  let totalJobOffers = baselineRecord?.totalJobOffers ?? verifiedSubmissionsCount;
  let highestPackageLPA = baselineRecord?.highestPackageLPA ?? verifiedHighestCTC;
  let averagePackageLPA = baselineRecord?.averagePackageLPA ?? verifiedAverageCTC;
  let medianPackageLPA = baselineRecord?.medianPackageLPA ?? verifiedMedianCTC;
  let salaryDistribution = baselineRecord?.salaryDistribution?.length > 0
    ? baselineRecord.salaryDistribution
    : verifiedSalaryDistribution;
  let uniqueRecruitersCount = baselineRecord?.uniqueRecruitersCount ?? new Set(verifiedOffers.map(o => o.companyName.toLowerCase())).size;

  // Placement rate calculation - strictly respecting denominator availability
  const placementRateResult = calculatePlacementRate(uniqueStudentsPlaced, totalEligible);

  // Data quality score
  const qualityIndicators = calculateDataQualityIndicators({
    hasOfficialReport: Boolean(baselineRecord?.reportingSource?.includes('Official') || baselineRecord?.reportingSource?.includes('NIRF')),
    verifiedStudentSubmissionsCount: verifiedSubmissionsCount,
    hasEligibleDenominator: Boolean(totalEligible && totalEligible > 0),
    hasBranchWiseBreakdown: Boolean(baselineRecord?.branchBreakdown?.length > 0),
    hasMedianDisclosure: Boolean(medianPackageLPA && medianPackageLPA > 0),
  });

  // Branch breakdown
  let branchBreakdown = baselineRecord?.branchBreakdown || [];

  // If no official branch breakdown exists, synthesize from verified offers grouped by department
  if (branchBreakdown.length === 0 && verifiedOffers.length > 0) {
    const deptMap = {};
    verifiedOffers.forEach((offer) => {
      const code = offer.departmentId?.code || 'UNKNOWN';
      const name = offer.departmentId?.name || 'General';
      if (!deptMap[code]) {
        deptMap[code] = {
          departmentName: name,
          departmentCode: code,
          salaries: [],
          uniqueStudents: new Set(),
          totalOffers: 0,
        };
      }
      deptMap[code].salaries.push(offer.annualCtcLpa);
      deptMap[code].uniqueStudents.add(offer.studentId.toString());
      deptMap[code].totalOffers++;
    });

    branchBreakdown = Object.values(deptMap).map((d) => ({
      departmentName: d.departmentName,
      departmentCode: d.departmentCode,
      totalGraduating: null,
      eligibleStudents: null,
      uniqueStudentsPlaced: d.uniqueStudents.size,
      totalOffers: d.totalOffers,
      highestPackageLPA: Math.max(...d.salaries),
      averagePackageLPA: calculateAverage(d.salaries),
      medianPackageLPA: calculateMedian(d.salaries),
      verificationStatus: 'Student-Verified',
    }));
  }

  return {
    hasVerifiedData: true,
    college: {
      id: college._id,
      name: college.name,
      shortName: college.shortName,
      slug: college.slug,
      tierClassification: college.tierClassification,
      city: college.city,
      state: college.state,
      campusType: college.campusType,
      institutionCategory: college.institutionCategory,
      nirfRanking: college.nirfRanking,
    },
    policy: {
      category: college.institutionCategory?.category || (college.campusType === 'IIT' ? 'Category A: Premium Public' : 'Category B: Private'),
      subCategory: college.institutionCategory?.subCategory || college.campusType,
      policyName: college.institutionCategory?.category === 'Category A: Premium Public' ? 'Premium Public Historical Placement Policy' : 'Strict Private Verification Policy',
      missingMetricLabel: college.institutionCategory?.category === 'Category A: Premium Public' ? 'Not reported' : 'Verified data not available for this session',
    },
    season: {
      id: season._id,
      academicYear: season.academicYear,
      status: season.seasonStatus,
      methodologyNotes: season.methodologyNotes,
    },
    provenance: {
      primarySource: baselineRecord?.reportingSource || (verifiedSubmissionsCount > 0 ? 'Audited Student Submissions' : 'None Available'),
      sourceUrl: baselineRecord?.sourceUrl || null,
      documentName: baselineRecord?.documentName || (baselineRecord ? `${baselineRecord.reportingSource} (${season.academicYear})` : null),
      lastCheckedDate: baselineRecord?.lastCheckedDate || baselineRecord?.reviewedAt || baselineRecord?.updatedAt || new Date(),
      academicSession: baselineRecord?.academicSession || season.academicYear,
      verificationLevel: baselineRecord?.verificationLevel || (verifiedSubmissionsCount > 0 ? 'Independently verified' : (baselineRecord ? 'Officially reported' : 'Unverified')),
      verificationStatus: baselineRecord?.verificationLevel || baselineRecord?.verificationStatus || (verifiedSubmissionsCount > 0 ? 'Student-Verified' : 'Unverified'),
      reportingPeriod: baselineRecord?.reportingPeriod || `${season.academicYear} Academic Session`,
      lastUpdatedDate: baselineRecord?.lastUpdatedDate || new Date(),
      verificationNotes: baselineRecord?.verificationNotes || 'Aggregated from verified student documents and corroborated NIRF disclosures.',
      confidenceScore: baselineRecord?.confidenceScore || qualityIndicators.score,
    },
    metricsCoverage: {
      totalTrackedMetrics: 8,
      verifiedMetricsCount: [
        medianPackageLPA !== null,
        averagePackageLPA !== null,
        highestPackageLPA !== null,
        totalEligible !== null,
        uniqueStudentsPlaced > 0,
        placementRateResult.canCalculate,
        uniqueRecruitersCount > 0,
        salaryDistribution.length > 0,
      ].filter(Boolean).length,
      coveragePercentage: Number(
        (
          ([
            medianPackageLPA !== null,
            averagePackageLPA !== null,
            highestPackageLPA !== null,
            totalEligible !== null,
            uniqueStudentsPlaced > 0,
            placementRateResult.canCalculate,
            uniqueRecruitersCount > 0,
            salaryDistribution.length > 0,
          ].filter(Boolean).length /
            8) *
          100
        ).toFixed(0)
      ),
      rating: qualityIndicators.label,
    },
    headlineStats: {
      totalGraduatingStudents: totalGraduating,
      totalEligibleStudents: totalEligible,
      eligibleDenominatorDisclosed: Boolean(totalEligible && totalEligible > 0),
      uniqueStudentsPlaced,
      totalJobOffers,
      studentsSeekingPlacement: baselineRecord?.studentsSeekingPlacement ?? null,
      highestPackageLPA,
      averagePackageLPA,
      medianPackageLPA,
      uniqueRecruitersCount,
      dreamOffersCount: baselineRecord?.dreamOffersCount || 0,
      superDreamOffersCount: baselineRecord?.superDreamOffersCount || 0,
      domesticOffersCount: baselineRecord?.domesticOffersCount ?? null,
      internationalOffersCount: baselineRecord?.internationalOffersCount ?? null,
      placementRate: placementRateResult,
    },
    salaryDistribution,
    branchBreakdown,
    topRecruiters: baselineRecord?.topRecruiters || [],
    communityVerificationTelemetry: {
      totalSubmissionsCount: allSubmissions.length,
      verifiedSubmissionsCount,
      verifiedUniqueStudentsCount: verifiedUniquePlaced,
      verifiedMedianCTC,
      verifiedAverageCTC,
    },
    dataQualityIndicators: qualityIndicators,
  };
};

/**
 * Historical trend analytics across all concluded seasons for a college.
 */
const getCollegeHistoricalTrends = async (collegeId) => {
  const records = await PlacementRecord.find({ collegeId, approvalStatus: 'Verified' })
    .populate('seasonId', 'academicYear seasonStatus')
    .sort({ 'seasonId.academicYear': 1 });

  return records.map((rec) => {
    const rateCalc = calculatePlacementRate(rec.uniqueStudentsPlaced, rec.totalEligibleStudents);
    return {
      academicYear: rec.seasonId?.academicYear || 'Unknown',
      medianPackageLPA: rec.medianPackageLPA,
      averagePackageLPA: rec.averagePackageLPA,
      highestPackageLPA: rec.highestPackageLPA,
      uniqueStudentsPlaced: rec.uniqueStudentsPlaced,
      totalJobOffers: rec.totalJobOffers,
      totalEligibleStudents: rec.totalEligibleStudents,
      placementRatePercentage: rateCalc.percentage,
      denominatorAvailable: rateCalc.canCalculate,
      source: rec.reportingSource,
      verificationStatus: rec.verificationStatus,
    };
  });
};

/**
 * Aggregates Internship metrics for a college.
 */
const getCollegeInternshipAnalytics = async (collegeId) => {
  const internships = await Internship.find({ collegeId, verificationStatus: 'Verified' });

  if (internships.length === 0) {
    return {
      totalRecords: 0,
      verifiedRecordsCount: 0,
      hasVerifiedData: false,
      message: 'No verified internship data available yet.',
      stipendSummary: {
        paidCount: 0,
        unpaidCount: 0,
        undisclosedCount: 0,
        medianMonthlyStipendINR: 0,
        averageMonthlyStipendINR: 0,
        highestMonthlyStipendINR: 0,
      },
      ppoMetrics: {
        ppoOfferedCount: 0,
        evaluatedCandidatesCount: 0,
        ppoConversionRatePercentage: null,
        denominatorAvailable: false,
      },
      topCompanies: [],
      disclosureNote: 'Internship data represents verified student submissions.',
    };
  }

  const paidCount = internships.filter(i => i.stipendCategory === 'Paid').length;
  const unpaidCount = internships.filter(i => i.stipendCategory === 'Unpaid').length;
  const undisclosedCount = internships.filter(i => i.stipendCategory === 'Undisclosed').length;

  const paidStipends = internships
    .filter(i => i.stipendCategory === 'Paid' && i.monthlyStipendInr > 0)
    .map(i => i.monthlyStipendInr);

  const medianStipend = calculateMedian(paidStipends);
  const averageStipend = calculateAverage(paidStipends);
  const highestStipend = paidStipends.length > 0 ? Math.max(...paidStipends) : 0;

  // PPO conversion calculation with denominator
  const ppoConversions = internships.filter(i => i.ppoConversion === 'Offered').length;
  const eligiblePpoDecisions = internships.filter(i => ['Offered', 'Not Offered'].includes(i.ppoConversion)).length;
  const ppoRate = eligiblePpoDecisions > 0 ? Number(((ppoConversions / eligiblePpoDecisions) * 100).toFixed(1)) : null;

  // Companies offering internships
  const companiesMap = {};
  internships.forEach(i => {
    companiesMap[i.companyName] = (companiesMap[i.companyName] || 0) + 1;
  });
  const topCompanies = Object.entries(companiesMap)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRecords: internships.length,
    verifiedRecordsCount: internships.length,
    hasVerifiedData: true,
    stipendSummary: {
      paidCount,
      unpaidCount,
      undisclosedCount,
      medianMonthlyStipendINR: medianStipend,
      averageMonthlyStipendINR: averageStipend,
      highestMonthlyStipendINR: highestStipend,
    },
    ppoMetrics: {
      ppoOfferedCount: ppoConversions,
      evaluatedCandidatesCount: eligiblePpoDecisions,
      ppoConversionRatePercentage: ppoRate,
      denominatorAvailable: eligiblePpoDecisions > 0,
    },
    topCompanies,
    disclosureNote: 'Internship data represents voluntary student submissions and documented campus cell drives. It does not represent an exhaustive institute-wide census.',
  };
};

module.exports = {
  getCollegeSeasonAnalytics,
  getCollegeHistoricalTrends,
  getCollegeInternshipAnalytics,
};
