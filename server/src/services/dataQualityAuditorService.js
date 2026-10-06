const College = require('../models/College');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');

/**
 * Data Quality Auditor Service
 * Strictly enforces truth-in-data rules, flagging inconsistencies, missing denominators,
 * extreme outliers, and uncorroborated marketing statements.
 * Adheres to Requirement 23 of the Evidence-Backed Intelligence Engine.
 */

/**
 * Analyzes a collection of metrics for a specific academic session and flags discrepancies.
 * @param {Array} metrics - Extracted or stored metrics
 * @param {Object} context - Supporting context (college, session, report)
 */
function auditSessionDataQuality(metrics = [], context = {}) {
  const warnings = [];
  const {
    collegeName = 'Institution',
    academicSession = 'Current Session',
    hasOfficialDocument = true,
    studentOffersCount = 0,
    totalEligibleStudents = null,
  } = context;

  const metricMap = new Map();
  metrics.forEach((m) => {
    const key = (m.metricName || '').toLowerCase().trim();
    if (!metricMap.has(key)) metricMap.set(key, []);
    metricMap.get(key).push(m);
  });

  // 1. Conflicting Placement Figures Check
  // Flag when multiple conflicting values are extracted for the same metric in the same session
  for (const [key, list] of metricMap.entries()) {
    if (list.length > 1) {
      const distinctValues = new Set(list.map((m) => m.normalizedValue).filter((v) => v !== null));
      if (distinctValues.size > 1) {
        warnings.push({
          code: 'CONFLICTING_FIGURES',
          level: 'critical',
          metricName: list[0].metricName,
          title: `Conflicting Values for ${list[0].metricName}`,
          description: `Discovered ${distinctValues.size} different reported figures (${Array.from(distinctValues).join(', ')}) for ${list[0].metricName} within session ${academicSession}.`,
          recommendation: 'Manual moderator review required to compare table figures vs narrative statements.',
        });
      }
    }
  }

  // 2. Missing Batch Size Denominator Check
  // Placement percentage or placement claims without total eligible population
  const placementRateMetric = metricMap.get('placement percentage')?.[0];
  const eligibleMetric = metricMap.get('eligible students')?.[0];
  const placedMetric = metricMap.get('students placed')?.[0];

  const eligibleCount = eligibleMetric?.normalizedValue ?? totalEligibleStudents;
  if (placementRateMetric && (!eligibleCount || eligibleCount <= 0)) {
    warnings.push({
      code: 'MISSING_DENOMINATOR',
      level: 'warning',
      metricName: 'Placement Percentage',
      title: 'Missing Eligible Batch Size Denominator',
      description: `A placement rate of ${placementRateMetric.rawReportedValue} is reported, but the total eligible candidate count is undisclosed.`,
      recommendation: 'Do not treat rate as verified census until eligible denominator is corroborated via NIRF or statutory filings.',
    });
  }

  // 3. Extreme Outliers & CTC Inflation
  // Single package > 100 LPA (1 Crore) or extreme gap between highest and average/median
  const highestMetric = metricMap.get('highest package')?.[0];
  const averageMetric = metricMap.get('average package')?.[0];
  const medianMetric = metricMap.get('median package')?.[0];

  if (highestMetric && highestMetric.normalizedValue) {
    if (highestMetric.normalizedValue >= 100) {
      warnings.push({
        code: 'EXTREME_OUTLIER_PACKAGE',
        level: 'caution',
        metricName: 'Highest Package',
        title: 'High CTC Outlier / Possible International Package',
        description: `Highest CTC of ${highestMetric.rawReportedValue} exceeds ₹100 LPA (1 Crore). Check whether this represents an overseas currency conversion or includes multi-year stock vesting.`,
        recommendation: 'Verify domestic vs international distinction and base pay breakdown.',
      });
    }

    if (averageMetric && averageMetric.normalizedValue && highestMetric.normalizedValue > averageMetric.normalizedValue * 6) {
      warnings.push({
        code: 'SEVERE_SKEW',
        level: 'caution',
        metricName: 'Package Spread',
        title: 'Severe Package Skew Between Highest and Average',
        description: `The highest package (₹${highestMetric.normalizedValue} LPA) is more than 6x the average (₹${averageMetric.normalizedValue} LPA), indicating that a single outlier heavily skews institute perception.`,
        recommendation: 'Emphasize Median CTC over Highest CTC in candidate evaluations.',
      });
    }
  }

  // 4. Unverified Official Claim
  if (!hasOfficialDocument) {
    warnings.push({
      code: 'UNVERIFIED_CLAIM',
      level: 'warning',
      metricName: 'Official Evidence',
      title: 'Unverified Marketing Claim',
      description: `Placement numbers for ${collegeName} (${academicSession}) are cited from web copy without an attached verifiable PDF report, NIRF document, or audited disclosure.`,
      recommendation: 'Requires official PDF or institutional annual report before status can transition to Officially Reported.',
    });
  }

  // 5. Low Student Sample Size
  if (studentOffersCount > 0 && studentOffersCount < 10) {
    const coverageNote = eligibleCount
      ? `(${studentOffersCount} submissions out of ${eligibleCount} students, ${((studentOffersCount / eligibleCount) * 100).toFixed(1)}% coverage)`
      : `(${studentOffersCount} submissions, total batch size unknown)`;

    warnings.push({
      code: 'LOW_SAMPLE_SIZE',
      level: 'caution',
      metricName: 'Student Submissions',
      title: 'Sample Size Too Small to Represent Official Average',
      description: `Based on only ${studentOffersCount} student-verified offer(s) ${coverageNote}. Cannot be extrapolated to full college reality.`,
      recommendation: 'Prompt additional batchmates from graduating cohort to submit confidential documentation.',
    });
  }

  // 6. Old or Stale Data Check
  const currentYear = new Date().getFullYear();
  const sessionMatch = academicSession.match(/\b(20[1-2][0-9])\b/);
  if (sessionMatch) {
    const sessionStart = parseInt(sessionMatch[1], 10);
    if (currentYear - sessionStart >= 3) {
      warnings.push({
        code: 'STALE_DATA',
        level: 'info',
        metricName: 'Academic Session',
        title: 'Historical Session (Older than 2 Years)',
        description: `This data corresponds to the ${academicSession} session. Recruitment patterns and market demand may have shifted significantly.`,
        recommendation: 'Compare against more recent placement seasons for active admissions decisions.',
      });
    }
  }

  return warnings;
}

/**
 * Audits an entire college's data completeness and reports quality alerts across all sessions.
 */
async function auditCollegeDataQuality(collegeId) {
  const college = await College.findById(collegeId);
  if (!college) throw new Error('College not found');

  const reports = await OfficialPlacementReport.find({ collegeId });
  const metrics = await OfficialReportMetric.find({ collegeId });
  const records = await PlacementRecord.find({ collegeId });
  const studentOffers = await Offer.find({ collegeId, verificationStatus: 'Verified' });

  // Group metrics by session
  const sessionMap = new Map();
  metrics.forEach((m) => {
    const s = m.academicSession || 'Unknown';
    if (!sessionMap.has(s)) sessionMap.set(s, []);
    sessionMap.get(s).push(m);
  });

  const alerts = [];
  for (const [session, sessMetrics] of sessionMap.entries()) {
    const sessReports = reports.filter((r) => r.academicSession === session);
    const sessRecord = records.find((r) => r.reportingYear === session || r.academicSession === session);
    const sessOffers = studentOffers.filter((o) => o.academicYear === session);

    const sessionWarnings = auditSessionDataQuality(sessMetrics, {
      collegeName: college.name,
      academicSession: session,
      hasOfficialDocument: sessReports.some((r) => r.status === 'Approved' || r.fileHash),
      studentOffersCount: sessOffers.length,
      totalEligibleStudents: sessRecord?.totalEligibleStudents || null,
    });

    alerts.push(...sessionWarnings.map((w) => ({ ...w, session })));
  }

  // Calculate Data Quality Health Score (0 - 100)
  let healthScore = 100;
  alerts.forEach((a) => {
    if (a.level === 'critical') healthScore -= 25;
    else if (a.level === 'warning') healthScore -= 15;
    else if (a.level === 'caution') healthScore -= 8;
  });
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    collegeId: college._id,
    collegeName: college.name,
    healthScore,
    qualityRating: healthScore >= 80 ? 'High Fidelity' : healthScore >= 50 ? 'Moderate Caution' : 'Uncorroborated / High Risk',
    totalAlertsCount: alerts.length,
    alerts,
  };
}

module.exports = {
  auditSessionDataQuality,
  auditCollegeDataQuality,
};
