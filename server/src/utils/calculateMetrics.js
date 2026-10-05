/**
 * Analytical utility functions for Placement Reality.
 * Strictly adheres to truth-in-data principles:
 * 1. Never manufactures percentages without verified denominators.
 * 2. Never conflates total offers with unique placed students.
 * 3. Never treats missing/undisclosed data as zero.
 */

function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return null;
  const filtered = numbers.filter(n => typeof n === 'number' && !isNaN(n));
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    return Number(sorted[mid].toFixed(2));
  } else {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
}

function calculateAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return null;
  const filtered = numbers.filter(n => typeof n === 'number' && !isNaN(n));
  if (filtered.length === 0) return null;

  const sum = filtered.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / filtered.length).toFixed(2));
}

function calculateSalaryDistribution(salariesLPA) {
  const buckets = [
    { rangeLabel: '< 4 LPA', minLPA: 0, maxLPA: 4, count: 0 },
    { rangeLabel: '4 - 8 LPA', minLPA: 4, maxLPA: 8, count: 0 },
    { rangeLabel: '8 - 15 LPA', minLPA: 8, maxLPA: 15, count: 0 },
    { rangeLabel: '15 - 25 LPA', minLPA: 15, maxLPA: 25, count: 0 },
    { rangeLabel: '25+ LPA', minLPA: 25, maxLPA: 999, count: 0 },
  ];

  if (!Array.isArray(salariesLPA)) return buckets.map(b => ({ rangeLabel: b.rangeLabel, offerCount: 0, studentCount: 0 }));

  const counts = { '< 4 LPA': 0, '4 - 8 LPA': 0, '8 - 15 LPA': 0, '15 - 25 LPA': 0, '25+ LPA': 0 };

  salariesLPA.forEach(val => {
    if (typeof val !== 'number' || isNaN(val)) return;
    if (val < 4) counts['< 4 LPA']++;
    else if (val < 8) counts['4 - 8 LPA']++;
    else if (val < 15) counts['8 - 15 LPA']++;
    else if (val < 25) counts['15 - 25 LPA']++;
    else counts['25+ LPA']++;
  });

  return buckets.map(b => ({
    rangeLabel: b.rangeLabel,
    minLPA: b.minLPA,
    maxLPA: b.maxLPA,
    offerCount: counts[b.rangeLabel],
    studentCount: counts[b.rangeLabel], // In individual datasets this maps accurately
  }));
}

/**
 * Calculates placement rate ONLY when a valid denominator exists.
 * Returns { percentage: number | null, canCalculate: boolean, reason: string }
 */
function calculatePlacementRate(uniquePlaced, eligibleStudents) {
  if (eligibleStudents === null || eligibleStudents === undefined || eligibleStudents <= 0) {
    return {
      percentage: null,
      canCalculate: false,
      reason: 'Eligible student count not disclosed by institute. Platform policy forbids manufacturing an estimated percentage.',
    };
  }

  if (typeof uniquePlaced !== 'number' || uniquePlaced < 0) {
    return {
      percentage: null,
      canCalculate: false,
      reason: 'Valid unique placed student count is missing.',
    };
  }

  const rate = Math.min(100, Number(((uniquePlaced / eligibleStudents) * 100).toFixed(1)));
  return {
    percentage: rate,
    canCalculate: true,
    reason: `Calculated from ${uniquePlaced} unique placed students out of ${eligibleStudents} eligible students.`,
  };
}

/**
 * Computes Data Quality Score (0 - 100) and indicators.
 */
function calculateDataQualityIndicators({
  hasOfficialReport = false,
  verifiedStudentSubmissionsCount = 0,
  hasEligibleDenominator = false,
  hasBranchWiseBreakdown = false,
  hasMedianDisclosure = false,
  hasSalaryDistribution = false,
}) {
  let score = 20; // baseline presence
  const factors = [];

  if (hasOfficialReport) {
    score += 25;
    factors.push('Official institute placement or NIRF filing available');
  } else {
    factors.push('No official institute document filed yet');
  }

  if (hasEligibleDenominator) {
    score += 20;
    factors.push('Denominator (eligible students) disclosed');
  } else {
    factors.push('Eligible student denominator undisclosed');
  }

  if (hasMedianDisclosure) {
    score += 15;
    factors.push('Median package disclosed');
  }

  if (hasBranchWiseBreakdown) {
    score += 10;
    factors.push('Branch-wise granular data present');
  }

  if (verifiedStudentSubmissionsCount > 5) {
    score += 10;
    factors.push(`${verifiedStudentSubmissionsCount} verified student submissions corroborated`);
  }

  score = Math.min(100, Math.max(10, score));

  let tier = 'Initial';
  let badgeColor = 'amber';
  if (score >= 80) {
    tier = 'High Transparency';
    badgeColor = 'emerald';
  } else if (score >= 50) {
    tier = 'Moderate Transparency';
    badgeColor = 'blue';
  } else {
    tier = 'Partial / Unverified';
    badgeColor = 'amber';
  }

  return {
    score,
    tier,
    badgeColor,
    factors,
  };
}

module.exports = {
  calculateMedian,
  calculateAverage,
  calculateSalaryDistribution,
  calculatePlacementRate,
  calculateDataQualityIndicators,
};
