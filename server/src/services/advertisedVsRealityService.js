const mongoose = require('mongoose');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const PlacementSeason = require('../models/PlacementSeason');
const College = require('../models/College');
const Department = require('../models/Department');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const StudentSessionReport = require('../models/StudentSessionReport');
const {
  calculateMedian,
  calculateAverage,
  calculatePlacementRate,
} = require('../utils/calculateMetrics');
const { formatSessionLabel, ensureCollegeSessions } = require('../utils/academicSessionHelper');
const { calculatePlacementStatistics } = require('./studentVerifiedAggregationService');

/**
 * Helper to normalize academic session year string (e.g. "2023-2024" or "2023-24" -> "2023-24")
 */
const normalizeSessionYear = (year) => {
  if (!year) return '';
  const str = year.toString().trim();
  const match = str.match(/(20\d{2})[-–/](?:20)?(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return str;
};

/**
 * Extracts institutional root domain (e.g. 'home.iitd.ac.in' -> 'iitd.ac.in', 'www.nitt.edu' -> 'nitt.edu')
 */
const getInstitutionalRootDomain = (urlStr) => {
  if (!urlStr) return '';
  try {
    const host = new URL(urlStr).hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 3 && ['ac', 'edu', 'res', 'gov', 'org'].includes(parts[parts.length - 2])) {
      return parts.slice(-3).join('.');
    }
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return host;
  } catch (_) {
    return '';
  }
};

/**
 * Service to compute "Advertised vs Reality" side-by-side comparison.
 * - Left side: DIRECTLY FROM OFFICIAL COLLEGE WEBSITE (Discovered & extracted reports).
 * - Right side: STUDENT GIVEN VERIFIED DATA (Audited student offers & internships).
 * - Strictly adheres to truth-in-data principles.
 */
const getAdvertisedVsRealityComparison = async (collegeId, options = {}) => {
  const { seasonId, academicYear, departmentId } = options;

  // 1. Fetch College
  const college = await College.findById(collegeId);
  if (!college) {
    throw new Error('College not found');
  }

  // 2. Ensure and fetch all available seasons FOR THIS COLLEGE & deduplicate by normalized academic year
  await ensureCollegeSessions(college._id);
  const rawSeasons = await PlacementSeason.find({ collegeId: college._id }).sort({ academicYear: -1 });
  const seenYears = new Set();
  const allSeasons = [];
  for (const s of rawSeasons) {
    const norm = normalizeSessionYear(s.academicYear);
    if (!seenYears.has(norm)) {
      seenYears.add(norm);
      allSeasons.push(s);
    }
  }

  const allDepartments = await Department.find({ collegeId }).sort({ name: 1 });

  // 3. Resolve target season
  let targetSeason = null;
  if (seasonId) {
    targetSeason = rawSeasons.find(s => s._id.toString() === seasonId.toString()) ||
                   allSeasons.find(s => s._id.toString() === seasonId.toString());
  } else if (academicYear) {
    const normReq = normalizeSessionYear(academicYear);
    targetSeason = allSeasons.find(s => normalizeSessionYear(s.academicYear) === normReq);
  }

  // Intelligent selection of target season if not explicitly passed:
  // Preference 1: Season with BOTH official website data AND verified student offers
  // Preference 2: Season with official website reports
  // Preference 3: Season with verified student offers
  if (!targetSeason && allSeasons.length > 0) {
    const scoredSeasons = [];
    for (const season of allSeasons) {
      const norm = normalizeSessionYear(season.academicYear);
      const matchingIds = rawSeasons
        .filter(s => normalizeSessionYear(s.academicYear) === norm)
        .map(s => s._id);

      const variants = [
        season.academicYear,
        norm,
        norm ? `${norm.split('-')[0]}-20${norm.split('-')[1]}` : null,
        norm ? `${norm.split('-')[0]}–${norm.split('-')[1]}` : null,
      ].filter(Boolean);

      const hasOfficialReport = await OfficialPlacementReport.exists({
        collegeId,
        academicSession: { $in: variants },
      });
      const hasPlacementRecord = await PlacementRecord.exists({
        collegeId,
        seasonId: { $in: matchingIds },
      });
      const hasOfficial = Boolean(hasOfficialReport || hasPlacementRecord);

      const gradYearNum = parseInt(norm.split('-')[1] ? (norm.split('-')[1].length === 2 ? `20${norm.split('-')[1]}` : norm.split('-')[1]) : '0', 10);
      const hasOffers = await Offer.exists({
        collegeId,
        $or: [
          { seasonId: { $in: matchingIds }, verificationStatus: 'Verified' },
          { graduationYear: gradYearNum, verificationStatus: 'Verified' },
        ],
      });

      let score = 0;
      if (hasOfficial && hasOffers) score = 3;
      else if (hasOfficial) score = 2;
      else if (hasOffers) score = 1;

      if (score > 0) {
        scoredSeasons.push({ season, score });
      }
    }

    if (scoredSeasons.length > 0) {
      scoredSeasons.sort((a, b) => b.score - a.score);
      targetSeason = scoredSeasons[0].season;
    } else {
      targetSeason = allSeasons[0];
    }
  }

  // 4. Resolve target department if filter is provided
  let selectedDepartment = null;
  if (departmentId && departmentId !== 'all') {
    selectedDepartment = allDepartments.find(d => d._id.toString() === departmentId.toString()) || null;
  }

  if (!targetSeason) {
    return {
      college: {
        id: college._id,
        name: college.name,
        slug: college.slug,
        city: college.city,
        state: college.state,
      },
      selectedSeason: null,
      selectedDepartment: selectedDepartment ? { id: selectedDepartment._id, name: selectedDepartment.name, code: selectedDepartment.code } : null,
      availableSeasons: allSeasons.map(s => ({ id: s._id, academicYear: s.academicYear, status: s.seasonStatus })),
      availableDepartments: allDepartments.map(d => ({ id: d._id, name: d.name, code: d.code })),
      advertised: { available: false, message: 'No academic seasons found.' },
      verified: { available: false, message: 'No academic seasons found.' },
      coverage: null,
      comparability: { isDirectlyComparable: false, warnings: ['No academic season available for comparison.'] },
      metricsComparison: [],
      chartData: [],
      methodology: null,
    };
  }

  const normSession = normalizeSessionYear(targetSeason.academicYear);
  const sessionVariants = [
    targetSeason.academicYear,
    normSession,
    normSession ? `${normSession.split('-')[0]}-20${normSession.split('-')[1]}` : null,
    normSession ? `${normSession.split('-')[0]}–${normSession.split('-')[1]}` : null,
  ].filter(Boolean);

  const matchingSeasonIds = rawSeasons
    .filter(s => normalizeSessionYear(s.academicYear) === normSession)
    .map(s => s._id);

  // 5. FETCH OFFICIALLY DISCOVERED / ADVERTISED RECORD DIRECTLY FROM OFFICIAL COLLEGE WEBSITE
  const officialDiscoveredReports = await OfficialPlacementReport.find({
    collegeId,
    academicSession: { $in: sessionVariants },
  }).sort({ status: 1, createdAt: -1 });

  let siteReport = null;
  let siteMetricsList = [];

  for (const rep of officialDiscoveredReports) {
    const metrics = await OfficialReportMetric.find({ reportId: rep._id });
    if (metrics.length > 0) {
      siteReport = rep;
      siteMetricsList = metrics;
      break;
    }
  }

  // Also query PlacementRecord for this college and season
  const officialRecord =
    (await PlacementRecord.findOne({
      collegeId,
      seasonId: { $in: matchingSeasonIds },
      approvalStatus: 'Verified',
      $or: [{ isAdvertisedClaim: true }, { recordType: { $in: ['Official Report', 'Advertised Claim'] } }],
    })) ||
    (await PlacementRecord.findOne({
      collegeId,
      seasonId: { $in: matchingSeasonIds },
      approvalStatus: { $in: ['Verified', 'Pending'] },
    }));

  let advertisedData = {
    available: false,
    message: 'Data not available on official website for this academic session.',
    provenance: null,
    metrics: null,
    branchSpecificDisclosed: false,
  };

  const findSiteMetric = (name) => {
    const m = siteMetricsList.find(x => x.metricName.toLowerCase() === name.toLowerCase());
    return m ? m.normalizedValue : null;
  };

  const hasOfficialSiteData = Boolean(siteReport || officialRecord);

  if (hasOfficialSiteData) {
    let branchData = null;
    let isBranchSpecific = false;

    if (selectedDepartment && officialRecord) {
      if (Array.isArray(officialRecord.branchBreakdown) && officialRecord.branchBreakdown.length > 0) {
        branchData = officialRecord.branchBreakdown.find(
          b => (b.departmentId && b.departmentId.toString() === selectedDepartment._id.toString()) ||
               (b.departmentCode && b.departmentCode.toUpperCase() === selectedDepartment.code.toUpperCase())
        );
      }
      isBranchSpecific = Boolean(branchData);
    }

    const siteHighest = findSiteMetric('Highest Package');
    const siteAverage = findSiteMetric('Average Package');
    const siteMedian = findSiteMetric('Median Package');
    const siteEligible = findSiteMetric('Eligible Students');
    const sitePlaced = findSiteMetric('Students Placed');
    const siteOffers = findSiteMetric('Total Job Offers');
    const siteRecruiters = findSiteMetric('Companies Visiting');
    const sitePlacementPct = findSiteMetric('Placement Percentage');
    const siteStipend = findSiteMetric('Highest Internship Stipend');

    const highest = siteHighest ?? (isBranchSpecific ? (branchData.highestPackageLPA ?? officialRecord.highestPackageLPA) : officialRecord?.highestPackageLPA) ?? null;
    const average = siteAverage ?? (isBranchSpecific ? (branchData.averagePackageLPA ?? null) : officialRecord?.averagePackageLPA) ?? null;
    const median = siteMedian ?? (isBranchSpecific ? (branchData.medianPackageLPA ?? null) : officialRecord?.medianPackageLPA) ?? null;
    const eligible = siteEligible ?? (isBranchSpecific ? (branchData.eligibleStudents ?? null) : officialRecord?.totalEligibleStudents) ?? null;
    const placed = sitePlaced ?? (isBranchSpecific ? (branchData.uniqueStudentsPlaced ?? null) : officialRecord?.uniqueStudentsPlaced) ?? null;
    const offers = siteOffers ?? (isBranchSpecific ? (branchData.totalOffers ?? null) : officialRecord?.totalJobOffers) ?? null;
    const recruiters = siteRecruiters ?? officialRecord?.uniqueRecruitersCount ?? null;

    let placementRatePercentage = sitePlacementPct ?? null;
    let placementRateReason = null;
    if (placementRatePercentage === null && placed && eligible) {
      const calc = calculatePlacementRate(placed, eligible);
      placementRatePercentage = calc.percentage;
      placementRateReason = calc.reason;
    }

    const docTitle = siteReport?.documentTitle || officialRecord?.documentName || `${college.shortName || college.name} Official Placement Report`;
    let sourceUrl = siteReport?.reportUrl || officialRecord?.sourceUrl || (college.website ? `${college.website.replace(/\/+$/, '')}/placement` : null);

    // Strict URL validation: official document must belong to this college's official website (Requirement 4 & 6)
    if (sourceUrl && college.website) {
      try {
        const baseRoot = getInstitutionalRootDomain(college.website);
        const sourceRoot = getInstitutionalRootDomain(sourceUrl);
        if (baseRoot && sourceRoot && baseRoot !== sourceRoot) {
          // Reject cross-college contamination
          console.warn(`[Integrity Guard] Disallowed mismatched source URL ${sourceUrl} for college ${college.name}. Restoring college portal.`);
          sourceUrl = `${college.website.replace(/\/+$/, '')}/placement`;
        }
      } catch (_) {
        sourceUrl = college.website;
      }
    }

    advertisedData = {
      available: true,
      message: null,
      branchSpecificDisclosed: isBranchSpecific,
      isInstitutionWideFallback: Boolean(selectedDepartment && !isBranchSpecific),
      provenance: {
        source: `Directly from Official College Website (${docTitle.replace(/\s+/g, ' ').trim()})`,
        sourceUrl: sourceUrl,
        documentTitle: docTitle.replace(/\s+/g, ' ').trim(),
        reportingYear: siteReport?.academicSession || officialRecord?.reportingYear || targetSeason.academicYear,
        verificationStatus: siteReport?.status === 'Approved' ? 'Direct Official Website Publication (Verified)' : 'Directly from Official College Website',
        lastVerificationDate: siteReport?.updatedAt || officialRecord?.reviewedAt || officialRecord?.lastUpdatedDate || new Date(),
        reportingPeriod: `${targetSeason.academicYear} Academic Session`,
        confidenceScore: siteReport ? 95 : (officialRecord?.confidenceScore || 90),
        isDirectFromOfficialWebsite: true,
      },
      metrics: {
        highestPackageLPA: highest,
        averagePackageLPA: average,
        medianPackageLPA: median,
        totalEligibleStudents: eligible,
        uniqueStudentsPlaced: placed,
        totalJobOffers: offers,
        placementPercentage: placementRatePercentage,
        placementPercentageReason: placementRateReason,
        totalRecruitingCompanies: recruiters,
        paidInternshipsCount: officialRecord?.officialPaidInternshipsCount ?? null,
        unpaidInternshipsCount: officialRecord?.officialUnpaidInternshipsCount ?? null,
        internshipStipendRange: {
          min: officialRecord?.officialMedianStipendInr && officialRecord?.officialAverageStipendInr
            ? Math.min(officialRecord.officialMedianStipendInr, officialRecord.officialAverageStipendInr)
            : (officialRecord?.officialAverageStipendInr || officialRecord?.officialMedianStipendInr || null),
          median: officialRecord?.officialMedianStipendInr ?? null,
          max: siteStipend ?? officialRecord?.officialHighestStipendInr ?? null,
        },
        internshipsDisclosed: Boolean(
          siteStipend !== null ||
          officialRecord?.officialPaidInternshipsCount !== null ||
          officialRecord?.officialHighestStipendInr !== null
        ),
      },
    };
  }

  // 6. FETCH INDEPENDENTLY VERIFIED REALITY DATA USING CENTRALIZED LIVE AGGREGATION ENGINE
  const liveStats = await calculatePlacementStatistics({
    collegeId,
    seasonId: targetSeason._id,
    academicSession: targetSeason.academicYear,
    departmentId: selectedDepartment ? selectedDepartment._id : null,
  });

  // Check if students have submitted session-level verified consensus figures (fallback for cohorts without individual offer letters)
  const studentSessionDoc = await StudentSessionReport.findOne({
    collegeId,
    $or: [
      { seasonId: { $in: matchingSeasonIds } },
      { academicSession: { $in: sessionVariants } },
    ],
    ...(selectedDepartment ? { departmentId: selectedDepartment._id } : {}),
  }).sort({ updatedAt: -1 });

  const studentPlacementRecord = await PlacementRecord.findOne({
    collegeId,
    seasonId: { $in: matchingSeasonIds },
    approvalStatus: 'Verified',
    reportingSource: 'Student-Verified Aggregation',
  }).sort({ updatedAt: -1 });

  const activeStudentSession = studentSessionDoc || (studentPlacementRecord ? {
    highestPackageLPA: studentPlacementRecord.highestPackageLPA,
    averagePackageLPA: studentPlacementRecord.averagePackageLPA,
    medianPackageLPA: studentPlacementRecord.medianPackageLPA,
    lowestPackageLPA: studentPlacementRecord.lowestPackageLPA ?? null,
    totalStudentsPlaced: studentPlacementRecord.uniqueStudentsPlaced,
    totalRecruitingCompanies: studentPlacementRecord.uniqueRecruitersCount,
    totalJobOffers: studentPlacementRecord.totalJobOffers,
    evidenceNotes: studentPlacementRecord.verificationNotes,
    studentName: 'Verified Student Representative',
    updatedAt: studentPlacementRecord.updatedAt,
  } : null);

  let verifiedData = {
    available: false,
    message: 'Data not available. No verified student submissions found for this academic session.',
    provenance: null,
    metrics: null,
  };

  let verifiedOffers = liveStats?.sampleVerifiedOffers || [];

  if (liveStats && liveStats.hasEnoughData && liveStats.verifiedPackageRecords > 0) {
    const uniqueCompaniesSet = new Set((liveStats.sampleVerifiedOffers || []).map(o => o.companyName.trim().toLowerCase()));

    verifiedData = {
      available: true,
      message: null,
      provenance: {
        source: liveStats.isLowSample
          ? `Individual Student Sample (${liveStats.verifiedPackageRecords} Verified Record${liveStats.verifiedPackageRecords > 1 ? 's' : ''})`
          : 'Student Given Verified Offers (Audited Offer Letters & Pay Slips)',
        reportingYear: targetSeason.academicYear,
        verificationStatus: 'Independently Verified by Student Evidence',
        lastVerificationDate: new Date(),
        isStudentVerifiedReality: true,
        isSmallSample: liveStats.isLowSample,
        evidenceBreakdown: {
          verifiedOfferLettersCount: liveStats.verifiedPackageRecords,
          uniquePlacedStudentsCount: liveStats.verifiedStudentOutcomes,
          auditedBy: 'Platform Moderation Team',
        },
      },
      metrics: {
        highestPackageLPA: liveStats.verifiedHighestPackageLPA,
        averagePackageLPA: liveStats.verifiedAveragePackageLPA,
        medianPackageLPA: liveStats.verifiedMedianPackageLPA,
        lowestPackageLPA: liveStats.verifiedLowestPackageLPA,
        totalEligibleStudents: liveStats.institutionEligiblePopulation,
        uniqueStudentsPlaced: liveStats.placedVerifiedStudents,
        totalJobOffers: liveStats.verifiedPackageRecords,
        placementPercentage: liveStats.observedPlacementRate,
        placementPercentageNote: liveStats.observedPlacementRateLabel,
        totalRecruitingCompanies: uniqueCompaniesSet.size > 0 ? uniqueCompaniesSet.size : 1,
        isSmallSample: liveStats.isLowSample,
        packageDistribution: liveStats.packageDistribution,
      },
    };
  } else if (activeStudentSession) {
    verifiedData = {
      available: true,
      message: null,
      provenance: {
        source: 'Filled by Verified Students (Session Consensus & Audited Records)',
        reportingYear: targetSeason.academicYear,
        verificationStatus: 'Student Given Verified Reality',
        lastVerificationDate: activeStudentSession.updatedAt || new Date(),
        isStudentVerifiedReality: true,
        isSessionStatsFilledByStudents: true,
        evidenceNotes: activeStudentSession.evidenceNotes,
        studentContributor: activeStudentSession.studentName,
        evidenceBreakdown: {
          verifiedOfferLettersCount: activeStudentSession.totalJobOffers || activeStudentSession.totalStudentsPlaced,
          uniquePlacedStudentsCount: activeStudentSession.totalStudentsPlaced,
          auditedBy: 'Platform Student Community & Moderation Team',
        },
      },
      metrics: {
        highestPackageLPA: activeStudentSession.highestPackageLPA,
        averagePackageLPA: activeStudentSession.averagePackageLPA,
        medianPackageLPA: activeStudentSession.medianPackageLPA,
        lowestPackageLPA: activeStudentSession.lowestPackageLPA ?? null,
        totalEligibleStudents: null,
        uniqueStudentsPlaced: activeStudentSession.totalStudentsPlaced,
        totalJobOffers: activeStudentSession.totalJobOffers || activeStudentSession.totalStudentsPlaced,
        placementPercentage: null,
        placementPercentageNote: 'Missing student records reflect unsubmitted voluntary documentation, NOT unplaced students.',
        totalRecruitingCompanies: activeStudentSession.totalRecruitingCompanies,
        isSessionLevel: true,
      },
    };
  }

  const hasVerifiedRecords = Boolean(verifiedData && verifiedData.available);
  if (!hasVerifiedRecords) {
    const verifiedPlacementRecord = await PlacementRecord.findOne({
      collegeId,
      seasonId: targetSeason._id,
      approvalStatus: 'Verified',
      $or: [
        { verificationLevel: 'Independently verified' },
        { recordType: 'Verified Outcome' },
        { isAdvertisedClaim: false },
      ],
      _id: { $ne: officialRecord?._id },
    });

    if (verifiedPlacementRecord) {
      const rateCalc = calculatePlacementRate(
        verifiedPlacementRecord.uniqueStudentsPlaced,
        verifiedPlacementRecord.totalEligibleStudents
      );
      verifiedData = {
        available: true,
        message: null,
        provenance: {
          source: verifiedPlacementRecord.reportingSource || 'Independently Audited Student Offers',
          sourceUrl: verifiedPlacementRecord.sourceUrl || null,
          reportingYear: verifiedPlacementRecord.reportingYear || targetSeason.academicYear,
          verificationStatus: 'Independently Verified (Evidence-Backed)',
          lastVerificationDate: verifiedPlacementRecord.verifiedAt || verifiedPlacementRecord.reviewedAt || new Date(),
          evidenceBreakdown: {
            verifiedOfferLettersCount: verifiedPlacementRecord.totalJobOffers || verifiedPlacementRecord.uniqueStudentsPlaced,
            uniquePlacedStudentsCount: verifiedPlacementRecord.uniqueStudentsPlaced,
            auditedBy: 'Platform Moderation Team',
          },
        },
        metrics: {
          highestPackageLPA: verifiedPlacementRecord.highestPackageLPA ?? null,
          averagePackageLPA: verifiedPlacementRecord.averagePackageLPA ?? null,
          medianPackageLPA: verifiedPlacementRecord.medianPackageLPA ?? null,
          totalEligibleStudents: verifiedPlacementRecord.totalEligibleStudents ?? null,
          uniqueStudentsPlaced: verifiedPlacementRecord.uniqueStudentsPlaced ?? null,
          totalJobOffers: verifiedPlacementRecord.totalJobOffers ?? null,
          placementPercentage: rateCalc.percentage,
          placementPercentageReason: rateCalc.reason,
          totalRecruitingCompanies: verifiedPlacementRecord.uniqueRecruitersCount ?? null,
          paidInternshipsCount: verifiedPlacementRecord.officialPaidInternshipsCount ?? null,
          unpaidInternshipsCount: verifiedPlacementRecord.officialUnpaidInternshipsCount ?? null,
          internshipStipendRange: {
            min: verifiedPlacementRecord.officialAverageStipendInr ?? null,
            max: verifiedPlacementRecord.officialHighestStipendInr ?? null,
            median: verifiedPlacementRecord.officialMedianStipendInr ?? null,
          },
        },
      };
    }
  }

  // 7. DATA COVERAGE INDICATOR (Requirement 8)
  const reportedCohortEligible = advertisedData.metrics?.totalEligibleStudents ||
    (officialRecord ? officialRecord.totalGraduatingStudents : null);
  const verifiedUniqueCount = verifiedData.metrics?.uniqueStudentsPlaced || 0;

  let coveragePercentage = null;
  let coverageRating = 'No Verified Data';

  if (reportedCohortEligible && reportedCohortEligible > 0 && verifiedUniqueCount > 0) {
    coveragePercentage = Number(((verifiedUniqueCount / reportedCohortEligible) * 100).toFixed(1));
    if (coveragePercentage >= 50) coverageRating = 'High Sample Coverage';
    else if (coveragePercentage >= 20) coverageRating = 'Moderate Sample Coverage';
    else if (coveragePercentage >= 5) coverageRating = 'Emerging Sample Coverage';
    else coverageRating = 'Early Stage Sample Coverage';
  }

  const coverage = {
    verifiedUniqueStudents: verifiedUniqueCount,
    reportedCohortEligible: reportedCohortEligible,
    coveragePercentage,
    coverageRating,
    coverageDisclaimer: 'Missing student records reflect unsubmitted voluntary documents, NOT unplaced students. Placement Reality strictly forbids treating non-submitting students as unplaced.',
  };

  // 8. COMPARABILITY ASSESSMENT & GUARDRAIL WARNINGS (Requirement 7)
  const comparabilityWarnings = [];
  let isDirectlyComparable = true;

  if (!advertisedData.available && !verifiedData.available) {
    isDirectlyComparable = false;
    comparabilityWarnings.push('Neither official reports nor student verified records are available for this selection.');
  } else if (!advertisedData.available) {
    isDirectlyComparable = false;
    comparabilityWarnings.push('Official college placement report is missing for this academic year. Only verified student submissions are shown.');
  } else if (!verifiedData.available) {
    isDirectlyComparable = false;
    comparabilityWarnings.push('No verified student records have been submitted for this session yet. Comparison cannot be drawn without independent evidence.');
  } else {
    // Both are available, check sub-criteria:
    if (selectedDepartment && !advertisedData.branchSpecificDisclosed) {
      isDirectlyComparable = false;
      comparabilityWarnings.push(
        `Branch Mismatch: The verified statistics represent ${selectedDepartment.name} (${selectedDepartment.code}), whereas the official report only disclosed institution-wide metrics without branch segregation. Direct comparison may be skewed.`
      );
    }

    if (coveragePercentage !== null && coveragePercentage < 10) {
      isDirectlyComparable = false;
      comparabilityWarnings.push(
        `Limited Sample Warning: Verified student records represent ${coveragePercentage}% of the reported eligible cohort (${verifiedUniqueCount} of ${reportedCohortEligible} students). Differences in averages or medians may reflect voluntary self-reporting selection variance.`
      );
    }

    if (advertisedData.metrics?.medianPackageLPA === null) {
      comparabilityWarnings.push(
        'The official report did not disclose the median CTC. Comparing the advertised average CTC directly with the verified median CTC is methodologically skewed because averages are heavily inflated by outlier top-tier packages.'
      );
    }
  }

  const comparability = {
    isDirectlyComparable,
    statusText: isDirectlyComparable
      ? 'Directly Comparable: Cohort definitions, academic period, and representative sample align.'
      : 'Comparability Caution: Discrepancies exist in reporting scope or sample depth.',
    warnings: comparabilityWarnings,
  };

  // 9. SIDE-BY-SIDE METRICS COMPARISON (Requirement 4 & 5)
  const formatLpa = (val) => (val !== null && val !== undefined ? `${Number(val).toFixed(2)} LPA` : 'Data not available');
  const formatInr = (val) => (val !== null && val !== undefined ? `₹${Number(val).toLocaleString('en-IN')}/mo` : 'Data not available');
  const formatCount = (val) => (val !== null && val !== undefined ? Number(val).toLocaleString('en-IN') : 'Data not available');

  const calculateDelta = (advertisedVal, verifiedVal, unit = 'LPA', metricKey = '') => {
    if (advertisedVal === null || advertisedVal === undefined || verifiedVal === null || verifiedVal === undefined) {
      return { diff: null, percent: null, label: 'N/A' };
    }
    const isSmallSample = verM?.isSmallSample;
    if (isSmallSample && ['uniquePlaced', 'recruitingCompanies'].includes(metricKey)) {
      return {
        diff: null,
        percent: null,
        label: `Individual Sample (${verM?.uniqueStudentsPlaced || 1} offer) — Awaiting student session report`,
      };
    }
    const diff = Number((verifiedVal - advertisedVal).toFixed(2));
    const percent = advertisedVal !== 0 ? Number(((diff / advertisedVal) * 100).toFixed(1)) : 0;
    let label = 'Aligned';
    if (diff < 0) {
      label = `Advertised is ${Math.abs(diff)} ${unit} (${Math.abs(percent)}%) higher than verified`;
    } else if (diff > 0) {
      label = `Verified sample is +${diff} ${unit} (+${percent}%) above advertised`;
    }
    return { diff, percent, label };
  };

  const advM = advertisedData.metrics;
  const verM = verifiedData.metrics;

  const advSrcUrl = advertisedData.available ? (advertisedData.provenance?.sourceUrl || null) : null;
  const advDocName = advertisedData.available ? (advertisedData.provenance?.documentTitle || null) : null;
  const advSessionYear = advertisedData.available ? (advertisedData.provenance?.reportingYear || targetSeason?.academicYear) : targetSeason?.academicYear;
  const advSourceLabel = advertisedData.available ? (advertisedData.provenance?.source || 'Official Report') : 'Data not available on official website for this session';

  const metricsComparison = [
    {
      key: 'medianPackage',
      title: 'Median Package (p50)',
      description: 'The exact midpoint salary where 50% earned more and 50% earned less. The most reliable indicator of actual typical outcome.',
      advertised: advM?.medianPackageLPA !== null && advM?.medianPackageLPA !== undefined ? advM.medianPackageLPA : null,
      advertisedFormatted: formatLpa(advM?.medianPackageLPA),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: verM?.medianPackageLPA !== null && verM?.medianPackageLPA !== undefined ? verM.medianPackageLPA : null,
      verifiedFormatted: formatLpa(verM?.medianPackageLPA),
      verifiedSource: verifiedData.provenance?.source || 'Verified Offers',
      delta: calculateDelta(advM?.medianPackageLPA, verM?.medianPackageLPA, 'LPA', 'medianPackage'),
      highlight: true,
    },
    {
      key: 'averagePackage',
      title: 'Average Package (Mean CTC)',
      description: 'Total compensation divided by offer count. Often pulled upward by extreme outlier packages.',
      advertised: advM?.averagePackageLPA !== null && advM?.averagePackageLPA !== undefined ? advM.averagePackageLPA : null,
      advertisedFormatted: formatLpa(advM?.averagePackageLPA),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: verM?.averagePackageLPA !== null && verM?.averagePackageLPA !== undefined ? verM.averagePackageLPA : null,
      verifiedFormatted: formatLpa(verM?.averagePackageLPA),
      verifiedSource: verifiedData.provenance?.source || 'Verified Offers',
      delta: calculateDelta(advM?.averagePackageLPA, verM?.averagePackageLPA, 'LPA', 'averagePackage'),
      highlight: false,
    },
    {
      key: 'highestPackage',
      title: 'Highest Package',
      description: 'Peak domestic or international compensation package marketed by the institution.',
      advertised: advM?.highestPackageLPA !== null && advM?.highestPackageLPA !== undefined ? advM.highestPackageLPA : null,
      advertisedFormatted: formatLpa(advM?.highestPackageLPA),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: verM?.highestPackageLPA !== null && verM?.highestPackageLPA !== undefined ? verM.highestPackageLPA : null,
      verifiedFormatted: formatLpa(verM?.highestPackageLPA),
      verifiedSource: verifiedData.provenance?.source || 'Verified Offers',
      delta: calculateDelta(advM?.highestPackageLPA, verM?.highestPackageLPA, 'LPA', 'highestPackage'),
      highlight: false,
    },
    {
      key: 'totalEligible',
      title: 'Total Eligible Students',
      description: 'Official denominator of students eligible and seeking placement.',
      advertised: advM?.totalEligibleStudents !== null && advM?.totalEligibleStudents !== undefined ? advM.totalEligibleStudents : null,
      advertisedFormatted: formatCount(advM?.totalEligibleStudents),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: null,
      verifiedFormatted: 'Not enumerated (Voluntary Platform)',
      verifiedSource: 'Independent Platform',
      delta: { diff: null, percent: null, label: 'Voluntary Platform' },
      highlight: false,
    },
    {
      key: 'uniquePlaced',
      title: 'Unique Students Placed',
      description: 'Number of individual distinct students who secured employment.',
      advertised: advM?.uniqueStudentsPlaced !== null && advM?.uniqueStudentsPlaced !== undefined ? advM.uniqueStudentsPlaced : null,
      advertisedFormatted: formatCount(advM?.uniqueStudentsPlaced),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: verM?.uniqueStudentsPlaced !== null && verM?.uniqueStudentsPlaced !== undefined ? verM.uniqueStudentsPlaced : null,
      verifiedFormatted: formatCount(verM?.uniqueStudentsPlaced) !== 'Data not available'
        ? (verM?.isSessionLevel ? `${formatCount(verM?.uniqueStudentsPlaced)} (Student-Reported Session Total)` : `${formatCount(verM?.uniqueStudentsPlaced)} verified sample`)
        : 'Data not available',
      verifiedSource: verifiedData.provenance?.source || 'Verified Offers',
      delta: calculateDelta(advM?.uniqueStudentsPlaced, verM?.uniqueStudentsPlaced, 'students', 'uniquePlaced'),
      highlight: false,
    },
    {
      key: 'placementPercentage',
      title: 'Placement Percentage',
      description: 'Unique placed students divided by disclosed eligible denominator.',
      advertised: advM?.placementPercentage !== null && advM?.placementPercentage !== undefined ? advM.placementPercentage : null,
      advertisedFormatted: advM?.placementPercentage !== null && advM?.placementPercentage !== undefined ? `${advM.placementPercentage}%` : 'Undisclosed Denominator',
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: null,
      verifiedFormatted: 'Protected: Never Manufactured',
      verifiedSource: 'Platform Policy',
      delta: {
        diff: null,
        percent: null,
        label: 'Zero Assumption Rule: Unsubmitted != Unplaced',
      },
      highlight: false,
    },
    {
      key: 'recruitingCompanies',
      title: 'Total Recruiting Companies',
      description: 'Distinct corporate employers that hired from this cohort.',
      advertised: advM?.totalRecruitingCompanies !== null && advM?.totalRecruitingCompanies !== undefined ? advM.totalRecruitingCompanies : null,
      advertisedFormatted: formatCount(advM?.totalRecruitingCompanies),
      advertisedSource: advSourceLabel,
      advertisedSourceUrl: advSrcUrl,
      advertisedDocumentName: advDocName,
      advertisedSession: advSessionYear,
      verified: verM?.totalRecruitingCompanies !== null && verM?.totalRecruitingCompanies !== undefined ? verM.totalRecruitingCompanies : null,
      verifiedFormatted: formatCount(verM?.totalRecruitingCompanies) !== 'Data not available'
        ? (verM?.isSessionLevel ? `${formatCount(verM?.totalRecruitingCompanies)} (Student-Reported Session Total)` : `${formatCount(verM?.totalRecruitingCompanies)} sample`)
        : 'Data not available',
      verifiedSource: verifiedData.provenance?.source || 'Verified Offers',
      delta: calculateDelta(advM?.totalRecruitingCompanies, verM?.totalRecruitingCompanies, 'companies', 'recruitingCompanies'),
      highlight: false,
    },
  ];

  // 10. CHART DATA FOR VISUAL COMPARISON (Requirement 5)
  const chartData = [];
  if (advM?.medianPackageLPA || verM?.medianPackageLPA) {
    chartData.push({
      metric: 'Median CTC (LPA)',
      Advertised: advM?.medianPackageLPA || 0,
      Verified: verM?.medianPackageLPA || 0,
    });
  }
  if (advM?.averagePackageLPA || verM?.averagePackageLPA) {
    chartData.push({
      metric: 'Average CTC (LPA)',
      Advertised: advM?.averagePackageLPA || 0,
      Verified: verM?.averagePackageLPA || 0,
    });
  }
  if (advM?.highestPackageLPA || verM?.highestPackageLPA) {
    chartData.push({
      metric: 'Highest CTC (LPA)',
      Advertised: advM?.highestPackageLPA || 0,
      Verified: verM?.highestPackageLPA || 0,
    });
  }

  // 11. EVIDENCE & METHODOLOGY SECTION (Requirement 10)
  const methodology = {
    title: 'Evidence & Verification Methodology',
    pillars: [
      {
        heading: 'Officially Advertised Ingestion',
        details:
          'Advertised metrics are ingested directly from certified NIRF disclosures, institutional placement annual reports, or official brochures. Each document is checked for authorized institutional seals and source URLs before being reviewed by platform moderators. If a metric is not explicitly reported, it is classified as "Data not available" rather than estimated.',
      },
      {
        heading: 'Independent Student Reality Auditing',
        details:
          'Reality metrics are calculated solely from student-submitted offer letters and verified internship credentials. Submissions must include company domain verification, roll-number alignment, and redacted salary annexures. Submissions remain private until verified by platform moderators.',
      },
      {
        heading: 'The Zero Assumption Rule',
        details:
          'Missing student records in our database reflect voluntary non-participation, never unemployment. Placement Reality strictly forbids assuming unsubmitted students did not secure placement, preventing misleading extrapolation.',
      },
      {
        heading: 'Mean vs Median Distortion Guard',
        details:
          'Colleges frequently publicize Average CTC because 1-2 high international offers (e.g., 60+ LPA) artificially elevate the mean for hundreds of students. The Median Package represents the true 50th percentile reality.',
      },
    ],
  };

  const isCategoryA = college.institutionCategory?.category === 'Category A: Premium Public';
  const isCategoryB = college.institutionCategory?.category === 'Category B: Private';

  const policy = {
    category: college.institutionCategory?.category || (isCategoryA ? 'Category A: Premium Public' : 'Category B: Private'),
    subCategory: college.institutionCategory?.subCategory || (isCategoryA ? 'IIT' : 'Private University'),
    policyName: isCategoryA ? 'Premium Public Historical Placement Policy' : 'Strict Private Verification Policy',
    policyDescription: isCategoryA
      ? 'Historical placement data from credible statutory filings, NIRF disclosures, and official reports are accepted from 2018–19 to current session. Unreported metrics are marked as "Not reported".'
      : 'Strict session-wise evidence required. General marketing claims are never accepted as confirmed placement outcomes. Dedicated tit-for-tat comparison against independent verified student evidence.',
    missingMetricDisplay: isCategoryA ? 'Not reported' : 'Verified data not available for this session',
  };

  // Requirement 3: Dedicated Tit-for-Tat Advertised vs. Verified Comparison
  const titForTatComparison = {
    academicSession: formatSessionLabel(targetSeason.academicYear),
    reportingPeriod: officialRecord?.reportingPeriod || `${targetSeason.academicYear} Academic Session`,
    collegeCategory: policy.category,
    subCategory: policy.subCategory,
    advertisedFigures: {
      highestPackageLPA: advM?.highestPackageLPA ?? null,
      averagePackageLPA: advM?.averagePackageLPA ?? null,
      medianPackageLPA: advM?.medianPackageLPA ?? null,
      totalEligibleStudents: advM?.totalEligibleStudents ?? null,
      uniqueStudentsPlaced: advM?.uniqueStudentsPlaced ?? null,
      placementPercentage: advM?.placementPercentage ?? null,
      totalRecruitingCompanies: advM?.totalRecruitingCompanies ?? null,
    },
    verifiedFigures: {
      highestPackageLPA: verM?.highestPackageLPA ?? null,
      averagePackageLPA: verM?.averagePackageLPA ?? null,
      medianPackageLPA: verM?.medianPackageLPA ?? null,
      lowestPackageLPA: verM?.lowestPackageLPA ?? null,
      totalEligibleStudents: verM?.totalEligibleStudents ?? null,
      uniqueStudentsPlaced: verM?.uniqueStudentsPlaced ?? null,
      placementPercentage: verM?.placementPercentage ?? null,
      totalRecruitingCompanies: verM?.totalRecruitingCompanies ?? null,
    },
    sources: {
      advertisedSource: advertisedData.provenance?.source || 'Directly from Official College Website',
      advertisedSourceUrl: advertisedData.provenance?.sourceUrl || null,
      advertisedDocumentName: advertisedData.provenance?.documentTitle || officialRecord?.documentName || 'Official College Placement Report',
      advertisedLastVerificationDate: advertisedData.provenance?.lastVerificationDate || null,
      verifiedSource: verifiedData.provenance?.source || 'Student Given Verified Offers (Audited Offer Letters & Pay Slips)',
      verifiedEvidenceBreakdown: verifiedData.provenance?.evidenceBreakdown || null,
      verifiedLastVerificationDate: verifiedData.provenance?.lastVerificationDate || null,
    },
    verificationStatus: {
      advertisedStatus: advertisedData.provenance?.verificationStatus || 'Official Website Publication',
      verifiedStatus: 'Student Given Verified Reality',
    },
    sampleVerifiedOffers: verifiedOffers.map(o => ({
      id: o._id || o.id,
      companyName: o.companyName,
      annualCtcLpa: o.annualCtcLpa,
      roleTitle: o.roleTitle || o.jobRole,
      graduationYear: o.graduationYear,
      verificationProofType: o.verificationProofType || 'Offer Letter Verified',
      verificationStatus: o.verificationStatus,
    })),
    dataCoverageAndLimitations: {
      sampleCoveragePercentage: coverage?.coveragePercentage,
      verifiedUniqueStudents: coverage?.verifiedUniqueStudents,
      reportedCohortEligible: coverage?.reportedCohortEligible,
      coverageRating: coverage?.coverageRating,
      fairnessRule: 'Missing student documentation is not proof of false reporting. Claims are never branded as false without conclusive contradictory evidence.',
      limitationNotice: 'Missing student records reflect voluntary self-reporting gaps, not unplaced students. Differences in central tendencies must account for sample depth.',
    },
    likeForLikeComparisons: [
      {
        metricKey: 'averagePackageLPA',
        metric: 'Average Package (Mean CTC)',
        advertised: advM?.averagePackageLPA ?? null,
        verified: verM?.averagePackageLPA ?? null,
        unit: 'LPA',
        difference: (typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number')
          ? Number((verM.averagePackageLPA - advM.averagePackageLPA).toFixed(2))
          : null,
        differenceLPA: (typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number')
          ? Number((verM.averagePackageLPA - advM.averagePackageLPA).toFixed(2))
          : null,
        percentDifference: (typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number' && advM.averagePackageLPA > 0)
          ? Number((((verM.averagePackageLPA - advM.averagePackageLPA) / advM.averagePackageLPA) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number',
        canCompare: typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number',
        mismatchReason: !(typeof advM?.averagePackageLPA === 'number' && typeof verM?.averagePackageLPA === 'number')
          ? 'Cannot compare: One or both datasets lack average package figure.'
          : null,
      },
      {
        metricKey: 'medianPackageLPA',
        metric: 'Median Package (Midpoint CTC)',
        advertised: advM?.medianPackageLPA ?? null,
        verified: verM?.medianPackageLPA ?? null,
        unit: 'LPA',
        difference: (typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number')
          ? Number((verM.medianPackageLPA - advM.medianPackageLPA).toFixed(2))
          : null,
        differenceLPA: (typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number')
          ? Number((verM.medianPackageLPA - advM.medianPackageLPA).toFixed(2))
          : null,
        percentDifference: (typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number' && advM.medianPackageLPA > 0)
          ? Number((((verM.medianPackageLPA - advM.medianPackageLPA) / advM.medianPackageLPA) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number',
        canCompare: typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number',
        mismatchReason: !(typeof advM?.medianPackageLPA === 'number' && typeof verM?.medianPackageLPA === 'number')
          ? 'Cannot compare: Official report did not disclose median CTC. Comparing average CTC with verified median is methodologically prohibited.'
          : null,
      },
      {
        metricKey: 'highestPackageLPA',
        metric: 'Highest Package (Peak CTC)',
        advertised: advM?.highestPackageLPA ?? null,
        verified: verM?.highestPackageLPA ?? null,
        unit: 'LPA',
        difference: (typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number')
          ? Number((verM.highestPackageLPA - advM.highestPackageLPA).toFixed(2))
          : null,
        differenceLPA: (typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number')
          ? Number((verM.highestPackageLPA - advM.highestPackageLPA).toFixed(2))
          : null,
        percentDifference: (typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number' && advM.highestPackageLPA > 0)
          ? Number((((verM.highestPackageLPA - advM.highestPackageLPA) / advM.highestPackageLPA) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number',
        canCompare: typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number',
        mismatchReason: !(typeof advM?.highestPackageLPA === 'number' && typeof verM?.highestPackageLPA === 'number')
          ? 'Cannot compare: Missing highest package record in one or both datasets.'
          : null,
      },
      {
        metricKey: 'lowestPackageLPA',
        metric: 'Lowest Package (Floor CTC)',
        advertised: advM?.lowestPackageLPA ?? null,
        verified: verM?.lowestPackageLPA ?? null,
        unit: 'LPA',
        difference: (typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number')
          ? Number((verM.lowestPackageLPA - advM.lowestPackageLPA).toFixed(2))
          : null,
        differenceLPA: (typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number')
          ? Number((verM.lowestPackageLPA - advM.lowestPackageLPA).toFixed(2))
          : null,
        percentDifference: (typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number' && advM.lowestPackageLPA > 0)
          ? Number((((verM.lowestPackageLPA - advM.lowestPackageLPA) / advM.lowestPackageLPA) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number',
        canCompare: typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number',
        mismatchReason: !(typeof advM?.lowestPackageLPA === 'number' && typeof verM?.lowestPackageLPA === 'number')
          ? 'Cannot compare: One or both datasets lack lowest package figure.'
          : null,
      },
      {
        metricKey: 'uniqueStudentsPlaced',
        metric: 'Total Students Placed',
        advertised: advM?.uniqueStudentsPlaced ?? null,
        verified: verM?.uniqueStudentsPlaced ?? null,
        unit: 'students',
        difference: (typeof advM?.uniqueStudentsPlaced === 'number' && typeof verM?.uniqueStudentsPlaced === 'number' && !verM?.isSmallSample)
          ? Number((verM.uniqueStudentsPlaced - advM.uniqueStudentsPlaced).toFixed(0))
          : null,
        differenceLPA: null,
        percentDifference: (typeof advM?.uniqueStudentsPlaced === 'number' && typeof verM?.uniqueStudentsPlaced === 'number' && advM.uniqueStudentsPlaced > 0 && !verM?.isSmallSample)
          ? Number((((verM.uniqueStudentsPlaced - advM.uniqueStudentsPlaced) / advM.uniqueStudentsPlaced) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.uniqueStudentsPlaced === 'number' && typeof verM?.uniqueStudentsPlaced === 'number' && !verM?.isSmallSample,
        canCompare: typeof advM?.uniqueStudentsPlaced === 'number' && typeof verM?.uniqueStudentsPlaced === 'number' && !verM?.isSmallSample,
        mismatchReason: verM?.isSmallSample
          ? `Individual Sample (${verM?.uniqueStudentsPlaced || 1} offer) — Awaiting verified student session consensus submission.`
          : (!(typeof advM?.uniqueStudentsPlaced === 'number' && typeof verM?.uniqueStudentsPlaced === 'number')
            ? 'Cannot compare: Placed students count missing in one or both datasets.'
            : null),
      },
      {
        metricKey: 'totalRecruitingCompanies',
        metric: 'Total Recruiting Companies',
        advertised: advM?.totalRecruitingCompanies ?? null,
        verified: verM?.totalRecruitingCompanies ?? null,
        unit: 'companies',
        difference: (typeof advM?.totalRecruitingCompanies === 'number' && typeof verM?.totalRecruitingCompanies === 'number' && !verM?.isSmallSample)
          ? Number((verM.totalRecruitingCompanies - advM.totalRecruitingCompanies).toFixed(0))
          : null,
        differenceLPA: null,
        percentDifference: (typeof advM?.totalRecruitingCompanies === 'number' && typeof verM?.totalRecruitingCompanies === 'number' && advM.totalRecruitingCompanies > 0 && !verM?.isSmallSample)
          ? Number((((verM.totalRecruitingCompanies - advM.totalRecruitingCompanies) / advM.totalRecruitingCompanies) * 100).toFixed(1))
          : null,
        isComparable: typeof advM?.totalRecruitingCompanies === 'number' && typeof verM?.totalRecruitingCompanies === 'number' && !verM?.isSmallSample,
        canCompare: typeof advM?.totalRecruitingCompanies === 'number' && typeof verM?.totalRecruitingCompanies === 'number' && !verM?.isSmallSample,
        mismatchReason: verM?.isSmallSample
          ? `Individual Sample (${verM?.uniqueStudentsPlaced || 1} offer) — Awaiting verified student session consensus submission.`
          : (!(typeof advM?.totalRecruitingCompanies === 'number' && typeof verM?.totalRecruitingCompanies === 'number')
            ? 'Cannot compare: Recruiting companies count missing in one or both datasets.'
            : null),
      },
    ],
    incomparableGuardrails: [
      {
        rule: 'Highest vs Median Prohibited',
        comparedMetricA: 'Advertised Highest Package',
        comparedMetricB: 'Verified Median Package',
        isComparable: false,
        reasonExplanation: 'Direct comparison between Highest Package and Median Package is prohibited because highest package is an extreme positive outlier, whereas median package represents the 50th percentile of typical student outcomes.',
        explanation: 'If the college advertises its highest package but reliable evidence only provides the median package, they are NOT compared directly. Comparing an outlier peak against a central median is statistically invalid.',
        status: (advM?.highestPackageLPA && !advM?.medianPackageLPA && verM?.medianPackageLPA)
          ? 'TRIGGERED: Institution advertised Highest LPA without disclosing Median LPA. Direct comparison suppressed to avoid bias.'
          : 'Compliant: Like-with-like pairing maintained.',
      },
      {
        rule: 'Fairness Notice',
        comparedMetricA: 'All Metrics',
        comparedMetricB: 'All Metrics',
        isComparable: false,
        reasonExplanation: 'Missing data is not proof of false reporting. Claims are never labeled as misleading without conclusive evidence.',
        explanation: 'Missing data is not proof of false reporting. Claims are never labeled as misleading without conclusive evidence.',
      },
    ],
  };

  return {
    college: {
      id: college._id,
      name: college.name,
      slug: college.slug,
      shortName: college.shortName,
      city: college.city,
      state: college.state,
      campusType: college.campusType,
      institutionCategory: college.institutionCategory,
      tierClassification: college.tierClassification,
      nirfRanking: college.nirfRanking,
    },
    selectedSeason: {
      id: targetSeason._id,
      academicYear: targetSeason.academicYear,
      status: targetSeason.seasonStatus,
    },
    selectedDepartment: selectedDepartment
      ? { id: selectedDepartment._id, name: selectedDepartment.name, code: selectedDepartment.code }
      : null,
    availableSeasons: allSeasons.map(s => ({ id: s._id, academicYear: s.academicYear, status: s.seasonStatus })),
    availableDepartments: allDepartments.map(d => ({ id: d._id, name: d.name, code: d.code })),
    policy,
    titForTatComparison,
    advertised: advertisedData,
    verified: verifiedData,
    coverage,
    comparability,
    metricsComparison,
    chartData,
    methodology,
  };
};

module.exports = {
  getAdvertisedVsRealityComparison,
  getInstitutionalRootDomain,
  normalizeSessionYear,
};
