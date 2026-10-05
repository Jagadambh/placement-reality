const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const cheerio = require('cheerio');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const PlacementSeason = require('../models/PlacementSeason');
const { detectAcademicSession } = require('./reportDiscoveryService');

const USER_AGENT = 'PlacementRealityBot/1.0 (+https://placementreality.org/transparency-bot; contact@placementreality.org)';
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/official_reports');

/**
 * Ensures the uploads storage directory exists.
 */
function ensureStorageDirectory() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Extracts explicit numerical metrics and cited text snippets from raw document text.
 */
function extractMetricsFromDocumentText(fullText, pageCount = 1) {
  const extracted = [];
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Helper to find the surrounding context snippet of a matched line
  const getContextSnippet = (lineIndex) => {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length - 1, lineIndex + 1);
    return lines.slice(start, end + 1).join(' | ');
  };

  // Helper to estimate page number based on line index
  const getEstimatedPage = (lineIndex) => {
    if (pageCount <= 1 || lines.length === 0) return 1;
    const linesPerPage = Math.ceil(lines.length / pageCount);
    return Math.min(pageCount, Math.floor(lineIndex / linesPerPage) + 1);
  };

  // 1. Highest Package
  // e.g. "Highest Package: 62.00 LPA", "Highest CTC of Rs. 63 Lakhs per annum", "Highest salary offered is Rs. 39.00 lakh"
  const highestRegex = /(?:highest|maximum|top)\s*(?:salary|package|ctc|offer)?\s*(?:offered|stands\s*at|was|is)?\s*(?:is|at|of)?[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs|cr|crore)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:highest|maximum|top)\s*(?:salary|package|ctc|offer)/i.test(line)) {
      const match = line.match(highestRegex);
      if (match && match[1]) {
        let val = parseFloat(match[1]);
        if (line.toLowerCase().includes('cr') || line.toLowerCase().includes('crore')) {
          val = val * 100; // Convert crore to LPA
        }
        if (val > 0 && val < 500) {
          extracted.push({
            metricName: 'Highest Package',
            rawReportedValue: `${match[1]} LPA`,
            normalizedValue: val,
            unit: 'LPA',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 95,
          });
          break; // Keep first primary cited instance
        }
      }
    }
  }

  // 2. Average Package
  // e.g. "Average Package: 8.5 LPA", "Average CTC of Rs. 6.00 lakh plus"
  const avgRegex = /(?:average|mean)\s*(?:ctc|package|salary|offer)?\s*(?:offered|stands\s*at|was|is)?\s*(?:is|at|of)?[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:average|mean)\s*(?:ctc|package|salary|offer)/i.test(line)) {
      const match = line.match(avgRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > 0 && val < 100) {
          extracted.push({
            metricName: 'Average Package',
            rawReportedValue: `${match[1]} LPA`,
            normalizedValue: val,
            unit: 'LPA',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 92,
          });
          break;
        }
      }
    }
  }

  // 3. Median Package
  // e.g. "Median Package: 7.0 LPA"
  const medianRegex = /(?:median)\s*(?:ctc|package|salary|offer)?\s*(?:offered|stands\s*at|was|is)?\s*(?:is|at|of)?[:\s-]*[₹Rs.]*\s*([0-9.]+)\s*(?:lpa|lakh|lakhs)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:median)\s*(?:ctc|package|salary|offer)/i.test(line)) {
      const match = line.match(medianRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > 0 && val < 100) {
          extracted.push({
            metricName: 'Median Package',
            rawReportedValue: `${match[1]} LPA`,
            normalizedValue: val,
            unit: 'LPA',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 94,
          });
          break;
        }
      }
    }
  }

  // 4. Eligible Students
  // e.g. "Eligible Students: 4,500", "for 3750 B.Tech students"
  const eligibleRegex = /(?:eligible|registered)\s*(?:students|candidates)?[:\s-]*([0-9,]+)|(?:for\s+)?([0-9,]+)\s*(?:b\.tech|engineering|registered|eligible)?\s*students/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:eligible|registered|b\.tech)\s*(?:students|candidates)?/i.test(line)) {
      const match = line.match(eligibleRegex);
      const rawNum = match ? (match[1] || match[2]) : null;
      if (rawNum) {
        const val = parseInt(rawNum.replace(/,/g, ''), 10);
        if (val > 10 && val < 100000) {
          extracted.push({
            metricName: 'Eligible Students',
            rawReportedValue: rawNum,
            normalizedValue: val,
            unit: 'Students',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 90,
          });
          break;
        }
      }
    }
  }

  // 5. Unique Students Placed
  // e.g. "Students Placed: 3,950", "Total Placed: 3950"
  const placedRegex = /(?:unique\s*students\s*placed|students\s*placed|total\s*placed)[:\s-]*([0-9,]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:students\s*placed|total\s*placed)/i.test(line)) {
      const match = line.match(placedRegex);
      if (match && match[1]) {
        const rawNum = match[1].replace(/,/g, '');
        const val = parseInt(rawNum, 10);
        if (val > 10 && val < 100000) {
          extracted.push({
            metricName: 'Students Placed',
            rawReportedValue: match[1],
            normalizedValue: val,
            unit: 'Students',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 93,
          });
          break;
        }
      }
    }
  }

  // 6. Placement Percentage
  // e.g. "Placement Rate: 92.5%", "Placement Percentage: 88%"
  const percentageRegex = /(?:placement\s*percentage|placement\s*rate|percentage\s*of\s*placement)[:\s-]*([0-9.]+)%/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:placement\s*percentage|placement\s*rate|percentage)/i.test(line)) {
      const match = line.match(percentageRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > 0 && val <= 100) {
          extracted.push({
            metricName: 'Placement Percentage',
            rawReportedValue: `${match[1]}%`,
            normalizedValue: val,
            unit: '%',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 92,
          });
          break;
        }
      }
    }
  }

  // 7. Companies Visiting
  // e.g. "Companies Visited: 450", "Total Recruiters: 500"
  const companiesRegex = /(?:companies\s*visited|participating\s*companies|recruiters\s*visited|total\s*companies|total\s*recruiters)[:\s-]*([0-9,]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:companies|recruiters)/i.test(line)) {
      const match = line.match(companiesRegex);
      if (match && match[1]) {
        const val = parseInt(match[1].replace(/,/g, ''), 10);
        if (val > 1 && val < 5000) {
          extracted.push({
            metricName: 'Companies Visiting',
            rawReportedValue: match[1],
            normalizedValue: val,
            unit: 'Companies',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 89,
          });
          break;
        }
      }
    }
  }

  // 8. Total Job Offers
  // e.g. "Total Offers: 5,200", "Total Job Offers: 5200"
  const offersRegex = /(?:total\s*offers|total\s*job\s*offers|gross\s*offers)[:\s-]*([0-9,]+)/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:total\s*offers|total\s*job\s*offers|gross\s*offers)/i.test(line)) {
      const match = line.match(offersRegex);
      if (match && match[1]) {
        const val = parseInt(match[1].replace(/,/g, ''), 10);
        if (val > 5 && val < 50000) {
          extracted.push({
            metricName: 'Total Job Offers',
            rawReportedValue: match[1],
            normalizedValue: val,
            unit: 'Offers',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 91,
          });
          break;
        }
      }
    }
  }

  // 9. Internship Offers & Stipend
  const stipendRegex = /(?:highest\s*stipend|average\s*stipend|stipend)[:\s-]*[₹Rs.]*\s*([0-9,]+)\s*(?:per month|pm|\/mo)?/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/stipend/i.test(line)) {
      const match = line.match(stipendRegex);
      if (match && match[1]) {
        const val = parseInt(match[1].replace(/,/g, ''), 10);
        if (val >= 1000 && val <= 500000) {
          extracted.push({
            metricName: 'Highest Internship Stipend',
            rawReportedValue: `₹${match[1]}/month`,
            normalizedValue: val,
            unit: 'INR/Month',
            pageNumber: getEstimatedPage(i),
            sourceTextSnippet: getContextSnippet(i),
            confidenceScore: 88,
          });
          break;
        }
      }
    }
  }

  return extracted;
}

/**
 * Extracts structured multi-year placement statistics from official HTML tables.
 */
function parsePlacementTables(html, pageUrl) {
  const $ = cheerio.load(html);
  const sessionData = new Map();

  $('table').each((tblIdx, tbl) => {
    const rows = [];
    $(tbl).find('tr').each((rIdx, tr) => {
      const cells = [];
      $(tr).find('th, td').each((cIdx, td) => {
        cells.push($(td).text().replace(/\s+/g, ' ').trim());
      });
      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length < 2) return;

    // Detect header row
    const headerRow = rows[0].map((c) => c.toLowerCase());
    const ctcColIdx = headerRow.findIndex(
      (h) => h.includes('ctc') || h.includes('package') || h.includes('salary') || h.includes('package offered')
    );
    const companyColIdx = headerRow.findIndex(
      (h) => h.includes('company') || h.includes('name of company') || h.includes('name of the company') || h.includes('recruiter')
    );
    const yearColIdx = headerRow.findIndex(
      (h) => h.includes('year') || h.includes('passing year') || h.includes('batch') || h.includes('session')
    );
    const streamColIdx = headerRow.findIndex(
      (h) => h.includes('stream') || h.includes('course') || h.includes('branch') || h.includes('programme')
    );

    if (ctcColIdx === -1 && companyColIdx === -1) return;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const company = companyColIdx !== -1 ? row[companyColIdx] : null;
      let rawCtc = ctcColIdx !== -1 ? row[ctcColIdx] : null;
      let rawYear = yearColIdx !== -1 ? row[yearColIdx] : null;

      let ctcLpa = null;
      if (rawCtc) {
        const cleaned = rawCtc.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0) {
          if (num > 10000) {
            ctcLpa = Number((num / 100000).toFixed(2));
          } else if (num < 150) {
            ctcLpa = Number(num.toFixed(2));
          }
        }
      }

      let sessionKey = null;
      if (rawYear) {
        const yearMatch = rawYear.match(/\b(20[1-2][0-9])\b/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          sessionKey = `${y - 1}-${String(y % 100).padStart(2, '0')}`;
        }
      }

      if (!sessionKey) {
        const tableContext = $(tbl).prevAll('h1, h2, h3, h4, h5, h6, strong, p').first().text();
        const yearMatch = tableContext.match(/\b(20[1-2][0-9])\b/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          sessionKey = `${y - 1}-${String(y % 100).padStart(2, '0')}`;
        }
      }

      if (sessionKey && (company || ctcLpa)) {
        if (!sessionData.has(sessionKey)) {
          sessionData.set(sessionKey, {
            session: sessionKey,
            salaries: [],
            companies: new Set(),
            offersCount: 0,
            topRecruiters: [],
          });
        }
        const data = sessionData.get(sessionKey);
        data.offersCount++;
        if (company && company.length > 1 && !company.toLowerCase().includes('user name') && !company.toLowerCase().includes('password')) {
          data.companies.add(company);
        }
        if (ctcLpa && ctcLpa > 0 && ctcLpa < 200) {
          data.salaries.push(ctcLpa);
        }
      }
    }
  });

  const results = [];
  for (const [session, data] of sessionData.entries()) {
    if (data.salaries.length === 0 && data.companies.size === 0) continue;

    data.salaries.sort((a, b) => a - b);
    const highest = data.salaries.length > 0 ? data.salaries[data.salaries.length - 1] : null;
    const lowest = data.salaries.length > 0 ? data.salaries[0] : null;
    const average =
      data.salaries.length > 0
        ? Number((data.salaries.reduce((sum, v) => sum + v, 0) / data.salaries.length).toFixed(2))
        : null;
    const mid = Math.floor(data.salaries.length / 2);
    const median =
      data.salaries.length > 0
        ? data.salaries.length % 2 !== 0
          ? data.salaries[mid]
          : Number(((data.salaries[mid - 1] + data.salaries[mid]) / 2).toFixed(2))
        : null;

    results.push({
      session,
      academicSession: session,
      highestPackageLPA: highest,
      averagePackageLPA: average,
      medianPackageLPA: median,
      lowestPackageLPA: lowest,
      uniqueRecruitersCount: data.companies.size,
      totalOffers: data.offersCount,
      uniqueStudentsPlaced: data.offersCount,
      topRecruiters: Array.from(data.companies).slice(0, 8),
      sourceUrl: pageUrl,
      sourceTitle: `Official Placement Statistics Table (${session})`,
    });
  }

  results.sort((a, b) => b.session.localeCompare(a.session));
  return results;
}

/**
 * Downloads an official placement report and extracts explicit metrics.
 */
async function downloadAndExtractReport(reportId, options = {}) {
  ensureStorageDirectory();

  const report = await OfficialPlacementReport.findById(reportId).populate('collegeId');
  if (!report) {
    throw new Error(`Report with ID ${reportId} not found.`);
  }

  console.log(`[Extraction] Processing official report: "${report.documentTitle}" (${report.reportUrl})...`);

  report.status = 'Downloaded';
  await report.save();

  try {
    let extractedText = '';
    let pageCount = 1;
    let fileHash = null;
    let fileSizeBytes = 0;
    const isPdf = report.reportUrl.toLowerCase().includes('.pdf') || report.fileType === 'pdf';

    const localFileName = `report_${report._id}_${Date.now()}.${isPdf ? 'pdf' : 'html'}`;
    const localFilePath = path.join(UPLOAD_DIR, localFileName);

    // Fetch document from official URL
    const response = await axios.get(report.reportUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
      maxContentLength: 40 * 1024 * 1024, // 40MB limit
    });

    const buffer = Buffer.from(response.data);
    fileSizeBytes = buffer.length;
    fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    fs.writeFileSync(localFilePath, buffer);
    report.localFilePath = localFilePath;
    report.fileHash = fileHash;
    report.fileSizeBytes = fileSizeBytes;

    // Parse Text based on file type
    if (isPdf) {
      try {
        const parsedPdf = await pdfParse(buffer);
        extractedText = parsedPdf.text || '';
        pageCount = parsedPdf.numpages || 1;

        // Check if scanned document (low text density)
        if (extractedText.trim().length < 60 * pageCount) {
          report.fileType = 'scanned_pdf';
          console.warn(`[Extraction] Low text density detected (${extractedText.length} chars over ${pageCount} pages). Marked as scanned_pdf.`);
        } else {
          report.fileType = 'pdf';
        }
      } catch (pdfErr) {
        throw new Error(`PDF parsing failed: ${pdfErr.message}`);
      }
    } else {
      // HTML Report
      report.fileType = 'html';
      const $ = cheerio.load(buffer.toString('utf-8'));
      $('script, style, nav, footer, header').remove();
      $('p, h1, h2, h3, h4, h5, h6, li, tr, td, th, div, br').after('\n');
      extractedText = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
    }

    report.pageCount = pageCount;
    report.rawTextSnippet = extractedText.slice(0, 800);

    // Detect / Refine Academic Session
    const detectedSession =
      detectAcademicSession(report.documentTitle) ||
      detectAcademicSession(extractedText.slice(0, 2000)) ||
      detectAcademicSession(report.reportUrl) ||
      report.academicSession ||
      '2023-24';

    report.academicSession = detectedSession;

    // Link with PlacementSeason in DB for THIS specific college (Requirement 2 & 6)
    const collegeIdVal = report.collegeId._id || report.collegeId;
    const matchingSeason = await PlacementSeason.findOne({
      collegeId: collegeIdVal,
      $or: [
        { academicYear: detectedSession },
        { academicYear: detectedSession.replace('-', '–') },
        { academicYear: `${detectedSession.split('-')[0]}-20${detectedSession.split('-')[1]}` },
      ],
    });
    if (matchingSeason) {
      report.seasonId = matchingSeason._id;
    }

    // Extract Explicit Placement Metrics
    const metricsFound = extractMetricsFromDocumentText(extractedText, pageCount);
    console.log(`[Extraction] Extracted ${metricsFound.length} explicit metrics for ${detectedSession}.`);

    // Remove previously pending metrics for this report if re-running
    await OfficialReportMetric.deleteMany({ reportId: report._id, reviewStatus: 'Pending' });

    // Save Extracted Metrics
    for (const m of metricsFound) {
      try {
        await OfficialReportMetric.create({
          reportId: report._id,
          collegeId: report.collegeId._id,
          seasonId: report.seasonId,
          academicSession: detectedSession,
          metricName: m.metricName,
          rawReportedValue: m.rawReportedValue,
          normalizedValue: m.normalizedValue,
          unit: m.unit,
          pageNumber: m.pageNumber,
          sourceTextSnippet: m.sourceTextSnippet,
          confidenceScore: m.confidenceScore,
          reviewStatus: 'Pending',
          isPublished: false,
        });
      } catch (metricSaveErr) {
        // Skip duplicate identical key collisions safely
        console.warn(`[Extraction] Metric save skipped: ${metricSaveErr.message}`);
      }
    }

    report.status = metricsFound.length > 0 ? 'Pending moderator review' : 'Extracted';
    report.extractionError = null;
    await report.save();

    return {
      success: true,
      report,
      academicSession: detectedSession,
      metricsCount: metricsFound.length,
      metrics: metricsFound,
    };
  } catch (err) {
    console.error(`[Extraction Error] Failed processing report ${reportId}:`, err.message);
    report.status = 'Extraction failed';
    report.extractionError = err.message;
    await report.save();
    return {
      success: false,
      report,
      error: err.message,
    };
  }
}

module.exports = {
  downloadAndExtractReport,
  extractMetricsFromDocumentText,
  parsePlacementTables,
};
