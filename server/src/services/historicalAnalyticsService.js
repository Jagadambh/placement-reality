const mongoose = require('mongoose');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const PlacementSeason = require('../models/PlacementSeason');
const College = require('../models/College');
const {
  formatSessionLabel,
  normalizeSessionKey,
  ensureCollegeSessions,
  getStandardAcademicSessions,
} = require('../utils/academicSessionHelper');
const {
  calculateMedian,
  calculateAverage,
  calculatePlacementRate,
} = require('../utils/calculateMetrics');

/**
 * Historical Placement Analytics & Multi-Session Comparison Service
 * Strictly adheres to truth-in-data:
 * - Sessions spanning 2018-19 to current session.
 * - Missing session data is explicitly marked as unavailable with no false trendlines.
 * - No data bleeding across sessions.
 * - Source document transparency on every metric.
 */

const getComprehensiveHistoricalTrends = async (collegeId) => {
  const college = await College.findById(collegeId);
  if (!college) {
    throw new Error('College not found');
  }

  // 1. Ensure all standard seasons (2018-19 to current session) exist in DB
  const collegeSeasons = await ensureCollegeSessions(college._id);

  // Sort chronologically ascending (2018-19, 2019-20, ... current) for time-series charts
  const chronologicalSeasons = [...collegeSeasons].sort((a, b) => {
    const startA = parseInt(a.academicYear.split('-')[0], 10);
    const startB = parseInt(b.academicYear.split('-')[0], 10);
    return startA - startB;
  });

  // 2. Fetch all verified official records for this college
  const officialRecords = await PlacementRecord.find({
    collegeId,
    approvalStatus: 'Verified',
  });
  const officialMap = new Map();
  officialRecords.forEach((rec) => {
    officialMap.set(rec.seasonId.toString(), rec);
    if (rec.reportingYear) {
      officialMap.set(normalizeSessionKey(rec.reportingYear), rec);
    }
  });

  // 3. Fetch all verified student offers for this college
  const verifiedOffers = await Offer.find({
    collegeId,
    verificationStatus: 'Verified',
  });
  const offersBySeason = new Map();
  verifiedOffers.forEach((offer) => {
    const sId = offer.seasonId.toString();
    if (!offersBySeason.has(sId)) {
      offersBySeason.set(sId, []);
    }
    offersBySeason.get(sId).push(offer);
  });

  // 4. Fetch all verified internships
  const verifiedInternships = await Internship.find({
    collegeId,
    verificationStatus: 'Verified',
  });

  const isCategoryA = college.institutionCategory?.category === 'Category A: Premium Public';
  const isCategoryB = college.institutionCategory?.category === 'Category B: Private';
  const missingMetricText = isCategoryA ? 'Not reported' : 'Verified data not available for this session';

  // 5. Build session-by-session detailed timeline
  const sessionTimeline = [];
  const packageChartData = [];
  const placementRateChartData = [];
  const recruiterChartData = [];

  for (const season of chronologicalSeasons) {
    const seasonKey = season._id.toString();
    const normalizedYear = normalizeSessionKey(season.academicYear);
    const displayLabel = formatSessionLabel(season.academicYear);

    const official = officialMap.get(seasonKey) || officialMap.get(normalizedYear) || null;
    const studentOffers = offersBySeason.get(seasonKey) || [];

    const hasOfficial = Boolean(official);
    const hasStudentVerified = studentOffers.length > 0;
    const hasAnyVerifiedData = hasOfficial || hasStudentVerified;

    // Metric extraction for official side
    let officialMetrics = null;
    if (official) {
      const rateCalc = calculatePlacementRate(official.uniqueStudentsPlaced, official.totalEligibleStudents);
      officialMetrics = {
        highestPackageLPA: official.highestPackageLPA ?? null,
        averagePackageLPA: official.averagePackageLPA ?? null,
        medianPackageLPA: official.medianPackageLPA ?? null,
        totalEligibleStudents: official.totalEligibleStudents ?? null,
        uniqueStudentsPlaced: official.uniqueStudentsPlaced ?? null,
        placementRatePercentage: rateCalc.percentage,
        totalOffers: official.totalJobOffers ?? null,
        recruitingCompaniesCount: official.uniqueRecruitersCount ?? null,
        paidInternshipsCount: official.officialPaidInternshipsCount ?? null,
        unpaidInternshipsCount: official.officialUnpaidInternshipsCount ?? null,
        medianMonthlyStipendINR: official.officialMedianStipendInr ?? null,
        source: official.reportingSource || 'Official Institute Report',
        sourceUrl: official.sourceUrl || null,
        documentName: official.documentName || `${official.reportingSource || 'Annual Report'} (${displayLabel})`,
        verificationLevel: official.verificationLevel || 'Officially reported',
        verificationStatus: official.verificationLevel || 'Officially reported',
        lastCheckedDate: official.lastCheckedDate || official.reviewedAt || official.updatedAt,
      };
    }

    // Metric extraction for student verified side
    let verifiedMetrics = null;
    if (hasStudentVerified) {
      const salaries = studentOffers.map(o => o.annualCtcLpa).filter(s => typeof s === 'number');
      const uniqueStudents = new Set(studentOffers.map(o => o.studentId.toString()));
      const uniqueCompanies = new Set(studentOffers.map(o => o.companyName.trim().toLowerCase()));

      verifiedMetrics = {
        highestPackageLPA: salaries.length > 0 ? Math.max(...salaries) : null,
        averagePackageLPA: calculateAverage(salaries),
        medianPackageLPA: calculateMedian(salaries),
        uniqueStudentsPlaced: uniqueStudents.size,
        totalOffers: studentOffers.length,
        recruitingCompaniesCount: uniqueCompanies.size,
        source: 'Audited Student Submissions',
        verificationLevel: 'Independently verified',
        verificationStatus: 'Independently verified',
        lastCheckedDate: studentOffers.reduce((latest, o) => (!latest || o.updatedAt > latest ? o.updatedAt : latest), null),
      };
    }

    // Consolidated values for plotting (null if unavailable to avoid drawing fake trendlines)
    const effectiveMedian = officialMetrics?.medianPackageLPA ?? verifiedMetrics?.medianPackageLPA ?? null;
    const effectiveAverage = officialMetrics?.averagePackageLPA ?? verifiedMetrics?.averagePackageLPA ?? null;
    const effectiveHighest = officialMetrics?.highestPackageLPA ?? verifiedMetrics?.highestPackageLPA ?? null;
    const effectivePlacementRate = officialMetrics?.placementRatePercentage ?? null;
    const effectiveRecruiters = officialMetrics?.recruitingCompaniesCount ?? verifiedMetrics?.recruitingCompaniesCount ?? null;

    // Track metric coverage count out of 8 core metrics
    let verifiedCount = 0;
    if (effectiveMedian !== null) verifiedCount++;
    if (effectiveAverage !== null) verifiedCount++;
    if (effectiveHighest !== null) verifiedCount++;
    if (officialMetrics?.totalEligibleStudents !== null) verifiedCount++;
    if (officialMetrics?.uniqueStudentsPlaced !== null || verifiedMetrics?.uniqueStudentsPlaced !== null) verifiedCount++;
    if (effectivePlacementRate !== null) verifiedCount++;
    if (effectiveRecruiters !== null) verifiedCount++;
    if (officialMetrics?.paidInternshipsCount !== null) verifiedCount++;

    const coveragePercentage = Number(((verifiedCount / 8) * 100).toFixed(0));

    sessionTimeline.push({
      seasonId: season._id,
      academicYear: season.academicYear,
      displaySession: displayLabel,
      seasonStatus: season.seasonStatus,
      hasVerifiedData: hasAnyVerifiedData,
      statusLabel: !hasAnyVerifiedData
        ? 'Verified data not available for this session'
        : hasOfficial && hasStudentVerified
        ? 'Advertised and Verified Available'
        : hasOfficial
        ? 'Official Report Verified'
        : 'Student Offers Verified',
      verificationLevel: official?.verificationLevel || (hasStudentVerified ? 'Independently verified' : (hasOfficial ? 'Officially reported' : 'Unverified')),
      missingMetricLabel: missingMetricText,
      dataCoverage: {
        verifiedMetricsCount: verifiedCount,
        totalTrackedMetrics: 8,
        coveragePercentage,
        status: coveragePercentage >= 75 ? 'Comprehensive' : coveragePercentage >= 40 ? 'Partial' : coveragePercentage > 0 ? 'Initial' : 'None',
      },
      advertised: officialMetrics,
      verified: verifiedMetrics,
      comparability: {
        canCompareAdvertisedVsReality: Boolean(officialMetrics && verifiedMetrics),
        medianDelta: (officialMetrics?.medianPackageLPA && verifiedMetrics?.medianPackageLPA)
          ? Number((verifiedMetrics.medianPackageLPA - officialMetrics.medianPackageLPA).toFixed(2))
          : null,
      },
    });

    // Chart data items (missing sessions stay null so charts show gaps, not misleading line interpolations)
    packageChartData.push({
      session: displayLabel,
      academicYear: season.academicYear,
      hasData: hasAnyVerifiedData,
      medianLPA: effectiveMedian,
      averageLPA: effectiveAverage,
      highestLPA: effectiveHighest,
      advertisedMedian: officialMetrics?.medianPackageLPA ?? null,
      verifiedMedian: verifiedMetrics?.medianPackageLPA ?? null,
    });

    placementRateChartData.push({
      session: displayLabel,
      academicYear: season.academicYear,
      hasData: Boolean(effectivePlacementRate !== null),
      placementRate: effectivePlacementRate,
      uniquePlaced: officialMetrics?.uniqueStudentsPlaced ?? verifiedMetrics?.uniqueStudentsPlaced ?? null,
      eligibleStudents: officialMetrics?.totalEligibleStudents ?? null,
    });

    recruiterChartData.push({
      session: displayLabel,
      academicYear: season.academicYear,
      hasData: Boolean(effectiveRecruiters !== null),
      recruitingCompanies: effectiveRecruiters,
      totalOffers: officialMetrics?.totalOffers ?? verifiedMetrics?.totalOffers ?? null,
      paidInternships: officialMetrics?.paidInternshipsCount ?? null,
    });
  }

  // Calculate macro summary metrics across all historical verified sessions
  const validMedians = packageChartData.map(p => p.medianLPA).filter(m => typeof m === 'number');
  const validAverages = packageChartData.map(p => p.averageLPA).filter(a => typeof a === 'number');
  const validPeaks = packageChartData.map(p => p.highestLPA).filter(h => typeof h === 'number');
  const verifiedSessionsCount = sessionTimeline.filter(s => s.hasVerifiedData).length;

  return {
    college: {
      id: college._id,
      name: college.name,
      shortName: college.shortName,
      slug: college.slug,
      city: college.city,
      state: college.state,
      campusType: college.campusType,
      institutionCategory: college.institutionCategory,
      tierClassification: college.tierClassification,
    },
    policy: {
      category: college.institutionCategory?.category || (isCategoryA ? 'Category A: Premium Public' : 'Category B: Private'),
      subCategory: college.institutionCategory?.subCategory || (isCategoryA ? 'IIT' : 'Private University'),
      policyName: isCategoryA ? 'Premium Public Historical Placement Policy' : 'Strict Private Verification Policy',
      policyDescription: isCategoryA
        ? 'Historical placement data from credible statutory filings, NIRF disclosures, and official reports are accepted from 2018–19 to current session. Unreported metrics are marked as "Not reported".'
        : 'Strict session-wise evidence required. General marketing claims are never accepted as confirmed placement outcomes. Unverified sessions are marked "Verified data not available for this session".',
      missingMetricLabel: missingMetricText,
    },
    totalSessionsTracked: sessionTimeline.length,
    verifiedSessionsCount,
    historicalSpan: {
      startSession: sessionTimeline[0]?.displaySession || '2018–19',
      currentSession: sessionTimeline[sessionTimeline.length - 1]?.displaySession || 'Current',
    },
    summaryStats: {
      allTimePeakLPA: validPeaks.length > 0 ? Math.max(...validPeaks) : null,
      latestVerifiedMedianLPA: validMedians.length > 0 ? validMedians[validMedians.length - 1] : null,
      latestVerifiedAverageLPA: validAverages.length > 0 ? validAverages[validAverages.length - 1] : null,
    },
    sessionTimeline: [...sessionTimeline].reverse(), // Most recent first for dashboard card lists
    chronologicalTimeline: sessionTimeline, // Ascending for charts
    charts: {
      compensationTrends: packageChartData,
      placementRateTrends: placementRateChartData,
      recruiterTrends: recruiterChartData,
    },
  };
};

/**
 * Multi-Session Side-by-Side Comparison Matrix
 * Allows selecting 2 or more sessions to inspect exact progression and deltas.
 */
const compareMultipleSessions = async (collegeId, sessionKeys = []) => {
  if (!Array.isArray(sessionKeys) || sessionKeys.length < 2) {
    throw new Error('Please select at least two academic sessions to compare.');
  }

  const college = await College.findById(collegeId);
  if (!college) throw new Error('College not found');

  const history = await getComprehensiveHistoricalTrends(collegeId);
  const selectedDetails = [];

  for (const key of sessionKeys) {
    const item = history.chronologicalTimeline.find(
      s => s.seasonId.toString() === key.toString() ||
           s.academicYear === normalizeSessionKey(key) ||
           s.displaySession === key
    );

    if (item) {
      selectedDetails.push(item);
    }
  }

  if (selectedDetails.length < 2) {
    throw new Error('Could not resolve at least two valid academic sessions for comparison.');
  }

  // Compute session-over-session changes
  const sessionDeltas = [];
  for (let i = 1; i < selectedDetails.length; i++) {
    const prev = selectedDetails[i - 1];
    const curr = selectedDetails[i];

    const prevMedian = prev.advertised?.medianPackageLPA ?? prev.verified?.medianPackageLPA ?? null;
    const currMedian = curr.advertised?.medianPackageLPA ?? curr.verified?.medianPackageLPA ?? null;

    let medianGrowthPercent = null;
    let medianAbsoluteDelta = null;
    if (prevMedian !== null && currMedian !== null && prevMedian > 0) {
      medianAbsoluteDelta = Number((currMedian - prevMedian).toFixed(2));
      medianGrowthPercent = Number(((medianAbsoluteDelta / prevMedian) * 100).toFixed(1));
    }

    const prevRate = prev.advertised?.placementRatePercentage ?? null;
    const currRate = curr.advertised?.placementRatePercentage ?? null;
    let rateDeltaPercentagePoints = null;
    if (prevRate !== null && currRate !== null) {
      rateDeltaPercentagePoints = Number((currRate - prevRate).toFixed(1));
    }

    sessionDeltas.push({
      fromSession: prev.displaySession,
      toSession: curr.displaySession,
      medianChangeLPA: medianAbsoluteDelta,
      medianGrowthPercent,
      placementRateDeltaPoints: rateDeltaPercentagePoints,
    });
  }

  return {
    college: {
      id: college._id,
      name: college.name,
      shortName: college.shortName,
    },
    comparedSessions: selectedDetails,
    sessionDeltas,
    comparabilityNotice: selectedDetails.some(s => !s.hasVerifiedData)
      ? 'Notice: One or more selected sessions lack verified records. Comparisons contain data gaps.'
      : 'All selected sessions have verified baseline records for direct longitudinal analysis.',
  };
};

module.exports = {
  getComprehensiveHistoricalTrends,
  compareMultipleSessions,
};
