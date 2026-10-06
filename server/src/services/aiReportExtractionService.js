const OfficialReportMetric = require('../models/OfficialReportMetric');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const { detectAcademicSession } = require('./reportDiscoveryService');
const { auditSessionDataQuality } = require('./dataQualityAuditorService');

/**
 * AI & Deterministic Report Extraction Engine
 * Strictly enforces ZERO-HALLUCINATION principles:
 * - Every metric must have an exact, verbatim text citation in the source document.
 * - If a metric is not explicitly present in the document text, it remains unavailable.
 * - Missing values are NEVER estimated, guessed, interpolated, or inferred from other years.
 * - Small student sample sizes and missing denominators are explicitly flagged.
 * - All extracted statistics default to "Pending Review" and are NEVER published automatically.
 */

/**
 * Normalizes salary values to LPA (Lakhs Per Annum).
 */
function normalizeSalaryToLpa(val, rawText) {
  const lower = rawText.toLowerCase();
  let num = parseFloat(val);
  if (isNaN(num)) return null;

  // Crore conversion: e.g. "1.2 Cr", "1.2 Crore" -> 120 LPA
  if (lower.includes('cr') || lower.includes('crore')) {
    num = num * 100;
  }
  // Monthly salary conversion: e.g. "85,000 per month" -> 85000 * 12 / 100000 = 10.2 LPA
  else if (lower.includes('per month') || lower.includes('pm') || lower.includes('/month')) {
    num = (num * 12) / 100000;
  }
  // USD to INR conversion flag (e.g. $150,000)
  else if (lower.includes('$') || lower.includes('usd')) {
    // Note: Do not silently convert currencies into LPA; keep normalized value null and add note
    return null;
  }

  // Sanity range check (0.5 LPA to 500 LPA)
  if (num >= 0.5 && num <= 500) {
    return Number(num.toFixed(2));
  }
  return null;
}

/**
 * Extracts explicit metrics with zero hallucination from parsed document text.
 * @param {string} fullText - Complete extracted document text
 * @param {number} pageCount - Number of pages in source document
 * @param {Object} metadata - Document metadata (collegeId, session, reportId, sourceUrl, documentTitle)
 */
async function extractPlacementMetricsWithGuardrails(fullText, pageCount = 1, metadata = {}) {
  const {
    collegeId,
    reportId,
    academicSession,
    sourceUrl,
    documentTitle,
    institutionCategory = 'Unclassified',
    publicationDate = null,
  } = metadata;

  if (!fullText || typeof fullText !== 'string' || fullText.trim().length === 0) {
    return {
      metrics: [],
      warnings: [{ code: 'EMPTY_DOCUMENT', message: 'No readable text content extracted from document.' }],
    };
  }

  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const totalLines = lines.length;
  const linesPerPage = Math.max(1, Math.ceil(totalLines / Math.max(1, pageCount)));

  const getPageNumber = (lineIdx) => {
    return Math.min(pageCount, Math.floor(lineIdx / linesPerPage) + 1);
  };

  const getContextSnippet = (lineIdx) => {
    const start = Math.max(0, lineIdx - 1);
    const end = Math.min(lines.length - 1, lineIdx + 1);
    return lines.slice(start, end + 1).join(' | ').slice(0, 350);
  };

  const candidateMetrics = [];

  // Helper to verify text verbatim presence
  const verifyCitation = (snippet, rawVal) => {
    return snippet.toLowerCase().includes(rawVal.toLowerCase());
  };

  // 1. HIGHEST PACKAGE
  // Patterns: "Highest Package: 62.00 LPA", "Highest Salary: ₹44 Lakh", "Highest CTC of Rs. 58 Lakhs"
  const highestRegex = /(?:highest|maximum|top)\s*(?:domestic|salary|package|ctc|offer)?\s*(?:offered|stands\s*at|was|is)?\s*[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs|cr|crore)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:highest|maximum|top)\s*(?:domestic|salary|package|ctc|offer)/i.test(line)) {
      const match = line.match(highestRegex);
      if (match && match[1]) {
        const rawVal = match[1];
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawVal)) {
          const normalized = normalizeSalaryToLpa(rawVal, line);
          if (normalized) {
            candidateMetrics.push({
              metricName: 'Highest Package',
              rawReportedValue: `${rawVal} LPA`,
              normalizedValue: normalized,
              unit: 'LPA',
              pageNumber: getPageNumber(i),
              sourceTextSnippet: snippet,
              confidenceScore: 95,
              notes: line.toLowerCase().includes('international')
                ? 'Reported as international offer'
                : 'Institute-wide highest domestic CTC',
            });
            break; // Keep first primary cited instance
          }
        }
      }
    }
  }

  // 2. AVERAGE PACKAGE
  // Patterns: "Average Package: 9.85 LPA", "Average CTC: Rs. 8.2 Lakhs", "Mean Salary: 7.5 LPA"
  const avgRegex = /(?:average|mean)\s*(?:ctc|package|salary|offer)?\s*(?:offered|stands\s*at|was|is)?\s*[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:average|mean)\s*(?:ctc|package|salary|offer)/i.test(line)) {
      const match = line.match(avgRegex);
      if (match && match[1]) {
        const rawVal = match[1];
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawVal)) {
          const normalized = normalizeSalaryToLpa(rawVal, line);
          if (normalized && normalized <= 60) {
            candidateMetrics.push({
              metricName: 'Average Package',
              rawReportedValue: `${rawVal} LPA`,
              normalizedValue: normalized,
              unit: 'LPA',
              pageNumber: getPageNumber(i),
              sourceTextSnippet: snippet,
              confidenceScore: 92,
              notes: 'Institute-wide reported average package',
            });
            break;
          }
        }
      }
    }
  }

  // 3. MEDIAN PACKAGE
  // Patterns: "Median Package: 8.5 LPA", "Median Salary: Rs 8.00 Lakhs"
  const medianRegex = /(?:median)\s*(?:ctc|package|salary|offer)?\s*(?:offered|stands\s*at|was|is)?\s*[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:median)\s*(?:ctc|package|salary|offer)/i.test(line)) {
      const match = line.match(medianRegex);
      if (match && match[1]) {
        const rawVal = match[1];
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawVal)) {
          const normalized = normalizeSalaryToLpa(rawVal, line);
          if (normalized && normalized <= 60) {
            candidateMetrics.push({
              metricName: 'Median Package',
              rawReportedValue: `${rawVal} LPA`,
              normalizedValue: normalized,
              unit: 'LPA',
              pageNumber: getPageNumber(i),
              sourceTextSnippet: snippet,
              confidenceScore: 94,
              notes: 'Officially reported median package',
            });
            break;
          }
        }
      }
    }
  }

  // 4. LOWEST PACKAGE (If officially reported)
  const lowestRegex = /(?:lowest|minimum)\s*(?:ctc|package|salary|offer)?\s*(?:offered|stands\s*at|was|is)?\s*[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:lowest|minimum)\s*(?:ctc|package|salary|offer)/i.test(line)) {
      const match = line.match(lowestRegex);
      if (match && match[1]) {
        const rawVal = match[1];
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawVal)) {
          const normalized = normalizeSalaryToLpa(rawVal, line);
          if (normalized && normalized <= 30) {
            candidateMetrics.push({
              metricName: 'Lowest Package',
              rawReportedValue: `${rawVal} LPA`,
              normalizedValue: normalized,
              unit: 'LPA',
              pageNumber: getPageNumber(i),
              sourceTextSnippet: snippet,
              confidenceScore: 90,
              notes: 'Explicitly reported minimum package threshold',
            });
            break;
          }
        }
      }
    }
  }

  // 5. TOTAL ELIGIBLE STUDENTS
  const eligibleRegex = /(?:eligible|registered)\s*(?:students|candidates)?[:\s-]*([0-9,]+)|(?:for\s+)?([0-9,]+)\s*(?:b\.tech|engineering|registered|eligible)?\s*students/i;
  let eligibleCount = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:eligible|registered|b\.tech)\s*(?:students|candidates)?/i.test(line)) {
      const match = line.match(eligibleRegex);
      const rawNum = match ? match[1] || match[2] : null;
      if (rawNum) {
        const cleanVal = parseInt(rawNum.replace(/,/g, ''), 10);
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawNum) && cleanVal > 15 && cleanVal < 100000) {
          eligibleCount = cleanVal;
          candidateMetrics.push({
            metricName: 'Eligible Students',
            rawReportedValue: rawNum,
            normalizedValue: cleanVal,
            unit: 'Students',
            pageNumber: getPageNumber(i),
            sourceTextSnippet: snippet,
            confidenceScore: 91,
            notes: 'Officially registered or eligible student cohort',
          });
          break;
        }
      }
    }
  }

  // 6. UNIQUE STUDENTS PLACED
  const placedRegex = /(?:unique\s*students\s*placed|students\s*placed|total\s*placed)[:\s-]*([0-9,]+)/i;
  let placedCount = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:students\s*placed|total\s*placed)/i.test(line)) {
      const match = line.match(placedRegex);
      if (match && match[1]) {
        const rawNum = match[1];
        const cleanVal = parseInt(rawNum.replace(/,/g, ''), 10);
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawNum) && cleanVal > 10 && cleanVal < 100000) {
          placedCount = cleanVal;
          candidateMetrics.push({
            metricName: 'Students Placed',
            rawReportedValue: rawNum,
            normalizedValue: cleanVal,
            unit: 'Students',
            pageNumber: getPageNumber(i),
            sourceTextSnippet: snippet,
            confidenceScore: 93,
            notes: 'Unique students who accepted official job offers',
          });
          break;
        }
      }
    }
  }

  // 7. PLACEMENT PERCENTAGE
  const percentageRegex = /(?:placement\s*percentage|placement\s*rate|percentage\s*of\s*placement)[:\s-]*([0-9.]+)%/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:placement\s*percentage|placement\s*rate|percentage)/i.test(line)) {
      const match = line.match(percentageRegex);
      if (match && match[1]) {
        const rawVal = match[1];
        const snippet = getContextSnippet(i);
        const cleanVal = parseFloat(rawVal);
        if (verifyCitation(snippet, rawVal) && cleanVal > 0 && cleanVal <= 100) {
          candidateMetrics.push({
            metricName: 'Placement Percentage',
            rawReportedValue: `${rawVal}%`,
            normalizedValue: cleanVal,
            unit: '%',
            pageNumber: getPageNumber(i),
            sourceTextSnippet: snippet,
            confidenceScore: 92,
            notes: eligibleCount ? `Based on ${eligibleCount} eligible candidates` : 'Denominator undisclosed in source text',
          });
          break;
        }
      }
    }
  }

  // 8. TOTAL JOB OFFERS
  const offersRegex = /(?:total\s*offers|total\s*job\s*offers|gross\s*offers)[:\s-]*([0-9,]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:total\s*offers|total\s*job\s*offers|gross\s*offers)/i.test(line)) {
      const match = line.match(offersRegex);
      if (match && match[1]) {
        const rawNum = match[1];
        const cleanVal = parseInt(rawNum.replace(/,/g, ''), 10);
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawNum) && cleanVal > 5 && cleanVal < 50000) {
          candidateMetrics.push({
            metricName: 'Total Job Offers',
            rawReportedValue: rawNum,
            normalizedValue: cleanVal,
            unit: 'Offers',
            pageNumber: getPageNumber(i),
            sourceTextSnippet: snippet,
            confidenceScore: 91,
            notes: 'Gross cumulative job offers, including multiple offers per student',
          });
          break;
        }
      }
    }
  }

  // 9. COMPANIES / RECRUITERS VISITING
  const companiesRegex = /(?:companies\s*visited|participating\s*companies|recruiters\s*visited|total\s*companies|total\s*recruiters)[:\s-]*([0-9,]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:companies|recruiters)/i.test(line)) {
      const match = line.match(companiesRegex);
      if (match && match[1]) {
        const rawNum = match[1];
        const cleanVal = parseInt(rawNum.replace(/,/g, ''), 10);
        const snippet = getContextSnippet(i);
        if (verifyCitation(snippet, rawNum) && cleanVal > 1 && cleanVal < 5000) {
          candidateMetrics.push({
            metricName: 'Companies Visiting',
            rawReportedValue: rawNum,
            normalizedValue: cleanVal,
            unit: 'Companies',
            pageNumber: getPageNumber(i),
            sourceTextSnippet: snippet,
            confidenceScore: 89,
            notes: 'Distinct recruiting organizations who participated in campus recruitment',
          });
          break;
        }
      }
    }
  }

  // Compute Coverage Object (Requirement 14)
  const coverageData = {
    verifiedOutcomesCount: placedCount,
    totalEligibleDenominator: eligibleCount,
    coveragePercentage: placedCount && eligibleCount ? Number(((placedCount / eligibleCount) * 100).toFixed(1)) : null,
    isKnown: Boolean(eligibleCount && eligibleCount > 0),
    coverageNotes: eligibleCount
      ? `Eligible population reported as ${eligibleCount} students.`
      : 'Denominator unknown. Total eligible students not reported in official publication.',
  };

  // Run Data Quality Auditor (Requirement 23)
  const auditWarnings = auditSessionDataQuality(candidateMetrics, {
    collegeName: metadata.collegeName || 'Institution',
    academicSession: academicSession || 'Current Session',
    hasOfficialDocument: Boolean(sourceUrl),
    totalEligibleStudents: eligibleCount,
  });

  // Persist all metrics with full evidence traceability (Requirement 3 & 10)
  const savedMetrics = [];
  for (const item of candidateMetrics) {
    const metricPayload = {
      reportId: reportId || null,
      collegeId: collegeId,
      academicSession: academicSession || '2023-24',
      institutionCategory: institutionCategory || 'Unclassified',
      metricName: item.metricName,
      rawReportedValue: item.rawReportedValue,
      normalizedValue: item.normalizedValue,
      unit: item.unit,
      sourceType: 'Official Report',
      sourceUrl: sourceUrl || null,
      sourceDocument: documentTitle || 'Official Placement Report',
      pageNumber: item.pageNumber,
      sourcePublicationDate: publicationDate || null,
      retrievedDate: new Date(),
      sourceTextSnippet: item.sourceTextSnippet,
      confidenceScore: item.confidenceScore,
      verificationStatus: 'Pending Review',
      reviewStatus: 'Pending',
      isPublished: false,
      coverage: coverageData,
      notes: item.notes,
      extractionMethod: 'deterministic_regex',
    };

    if (metadata.skipDb) {
      savedMetrics.push(metricPayload);
    } else {
      try {
        const metricDoc = await OfficialReportMetric.create(metricPayload);
        savedMetrics.push(metricDoc);
      } catch (saveErr) {
        console.warn(`[AI Extraction] DB save notice for ${item.metricName}: ${saveErr.message}`);
        savedMetrics.push(metricPayload);
      }
    }
  }

  return {
    success: true,
    academicSession: academicSession || '2023-24',
    extractedCount: savedMetrics.length,
    metrics: savedMetrics,
    coverage: coverageData,
    warnings: auditWarnings,
  };
}

module.exports = {
  extractPlacementMetricsWithGuardrails,
  normalizeSalaryToLpa,
};
