const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const College = require('../models/College');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const InstitutionDiscoveryLog = require('../models/InstitutionDiscoveryLog');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 4500;

// Third-party domains to strictly reject (to preserve official authority)
const THIRD_PARTY_DOMAINS = [
  'collegedunia.com',
  'shiksha.com',
  'careers360.com',
  'getmyuni.com',
  'jagranjosh.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'instagram.com',
  'youtube.com',
  'google.com',
  'wikipedia.org',
];

const { validateUrlForCrawling, isOfficialDomain, getInstitutionalRootDomain } = require('../utils/urlValidator');

// Common placement and report page paths on Indian university portals (prioritized)
const COMMON_PLACEMENT_PATHS = [
  '',
  '/placement-5/placement-status',
  '/placement-status',
  '/placement',
  '/placements',
  '/placement/placement-status',
  '/about/nirf',
  '/nirf',
  '/career',
  '/careers',
  '/placement-statistics',
  '/annual-reports',
  '/mandatory-disclosure',
];

/**
 * Detect academic session from text string or URL (e.g. 2023-24, 2022-2023).
 */
function detectAcademicSession(text) {
  if (!text) return null;
  // Match 2018-19, 2018-2019, 2023-24, 2024-25, etc.
  const sessionMatch = text.match(/\b(20[1-2][0-9])[-–](20)?([0-9]{2})\b/);
  if (sessionMatch) {
    const startYear = parseInt(sessionMatch[1], 10);
    const endYear = parseInt(sessionMatch[3], 10);
    if (endYear === (startYear + 1) % 100 || endYear === startYear + 1) {
      return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    }
  }

  // Match slash format strictly if end year matches startYear + 1 (e.g. 2023/24, but NOT 2023/12 which is a month)
  const slashMatch = text.match(/\b(20[1-2][0-9])\/(20)?([0-9]{2})\b/);
  if (slashMatch) {
    const startYear = parseInt(slashMatch[1], 10);
    const endYear = parseInt(slashMatch[3], 10);
    if (endYear === (startYear + 1) % 100 || endYear === startYear + 1) {
      return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    }
  }

  // Match e.g. "batch 2024", "passing batch 2024", "placements 2024"
  const batchMatch = text.match(/(?:batch|passing|class of|placements?)\D{0,10}\b(20[1-2][0-9])\b/i) ||
                     text.match(/\b(20[1-2][0-9])\b\D{0,10}(?:batch|passing|placement)/i);
  if (batchMatch) {
    const passYear = parseInt(batchMatch[1], 10);
    if (passYear >= 2015 && passYear <= 2030) {
      const startYear = passYear - 1;
      return `${startYear}-${String(passYear % 100).padStart(2, '0')}`;
    }
  }

  // Match single year e.g. "Placement Report 2024"
  const singleYearMatch = text.match(/\b(20[1-2][0-9])\b/);
  if (singleYearMatch) {
    const year = parseInt(singleYearMatch[1], 10);
    if (year >= 2015 && year <= 2030) {
      return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * Discovers official placement reports for a specific college.
 */
async function discoverReportsForCollege(collegeId, options = {}) {
  const { initiatedBy = null, scanType = 'manual' } = options;

  const college = await College.findById(collegeId);
  if (!college) {
    throw new Error(`College with ID ${collegeId} not found.`);
  }

  if (!college.website) {
    const log = await InstitutionDiscoveryLog.create({
      collegeId: college._id,
      scanType,
      status: 'failed',
      errorMessage: 'No official website URL registered for this institution.',
      initiatedBy,
    });
    return { status: 'failed', message: 'No official website configured', log };
  }

  const baseWebsite = college.website.trim().replace(/\/+$/, '');
  const pagesChecked = [];
  const discoveredCandidateUrls = new Map();
  let reportsFoundCount = 0;
  let newReportsAddedCount = 0;

  console.log(`[Discovery] Initiating official placement scan for ${college.name} (${baseWebsite})...`);

  // Build candidate pages to crawl
  const targetPages = COMMON_PLACEMENT_PATHS.map((p) => `${baseWebsite}${p}`);

  for (const pageUrl of targetPages) {
    try {
      pagesChecked.push(pageUrl);
      const res = await axios.get(pageUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 4,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        continue;
      }

      const $ = cheerio.load(res.data);

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        const title = $(el).attr('title') || '';

        if (!href) return;

        // Resolve absolute URL
        let resolvedUrl;
        try {
          resolvedUrl = new URL(href, pageUrl).href;
        } catch (_) {
          return;
        }

        // Clean URL fragments and trailing slashes
        resolvedUrl = resolvedUrl.split('#')[0].replace(/\/+$/, '');
        if (!resolvedUrl || resolvedUrl === baseWebsite) return;

        // Must be on the official institution domain
        if (!isOfficialDomain(resolvedUrl, baseWebsite)) return;

        // Exclude fragment identifiers, mailto, tel, javascript
        if (resolvedUrl.startsWith('javascript:') || resolvedUrl.startsWith('mailto:') || resolvedUrl.startsWith('tel:')) {
          return;
        }

        const combinedContext = `${text} ${title} ${resolvedUrl}`.toLowerCase();

        // Check for placement report signatures
        const isPdf = resolvedUrl.toLowerCase().endsWith('.pdf') || resolvedUrl.toLowerCase().includes('.pdf?');
        const hasPlacementKeyword =
          combinedContext.includes('placement') ||
          combinedContext.includes('career') ||
          combinedContext.includes('campus drive') ||
          combinedContext.includes('recruiter') ||
          combinedContext.includes('salary') ||
          combinedContext.includes('nirf') ||
          combinedContext.includes('mandatory disclosure') ||
          combinedContext.includes('annual report');

        const hasReportKeyword =
          combinedContext.includes('report') ||
          combinedContext.includes('brochure') ||
          combinedContext.includes('statistic') ||
          combinedContext.includes('summary') ||
          combinedContext.includes('record') ||
          isPdf;

        if (hasPlacementKeyword && hasReportKeyword) {
          const detectedSession = detectAcademicSession(combinedContext) || detectAcademicSession(resolvedUrl);
          const isMultiYearPage = !isPdf && (
            resolvedUrl.includes('placement-status') ||
            resolvedUrl.includes('placement-statistics') ||
            resolvedUrl.includes('placement') ||
            resolvedUrl.includes('nirf')
          );

          if (!detectedSession && !isPdf && !isMultiYearPage) return;

          const sessionKey = detectedSession || (isMultiYearPage ? 'multi-session-archive' : '2023-24');
          const docTitle = text || title || `${college.shortName || college.name} Placement Document (${sessionKey})`;

          if (!discoveredCandidateUrls.has(resolvedUrl)) {
            discoveredCandidateUrls.set(resolvedUrl, {
              sourceUrl: pageUrl,
              reportUrl: resolvedUrl,
              documentTitle: docTitle.slice(0, 200),
              fileType: isPdf ? 'pdf' : 'html',
              academicSession: sessionKey,
            });
          }
        }
      });
    } catch (err) {
      // Gracefully continue scanning other potential paths
      console.warn(`[Discovery] Notice: Could not crawl ${pageUrl}: ${err.message}`);
    }
  }

  reportsFoundCount = discoveredCandidateUrls.size;

  // Persist discovered reports safely with multi-session deduplication (Requirement 8 & 9)
  for (const [reportUrl, meta] of discoveredCandidateUrls.entries()) {
    try {
      // Check existing by exact URL
      const existingByUrl = await OfficialPlacementReport.findOne({
        collegeId: college._id,
        reportUrl,
      });

      // Check existing by Session for this college to prevent redundant duplicate year records
      const existingBySession = await OfficialPlacementReport.findOne({
        collegeId: college._id,
        academicSession: meta.academicSession,
      });

      if (!existingByUrl && !existingBySession) {
        await OfficialPlacementReport.create({
          collegeId: college._id,
          academicSession: meta.academicSession,
          documentTitle: meta.documentTitle,
          sourceUrl: meta.sourceUrl,
          reportUrl: meta.reportUrl,
          fileType: meta.fileType,
          discoveryMethod: scanType === 'scheduled' ? 'automated_crawl' : 'manual_scan',
          status: 'Discovered',
          retrievalDate: new Date(),
          lastCheckedAt: new Date(),
        });
        newReportsAddedCount++;
      } else if (existingByUrl) {
        existingByUrl.lastCheckedAt = new Date();
        await existingByUrl.save();
      }
    } catch (createErr) {
      console.error(`[Discovery] Error saving report ${reportUrl}:`, createErr.message);
    }
  }

  const discoveryStatus = reportsFoundCount > 0 ? 'success' : 'no_reports_found';
  const notes =
    reportsFoundCount > 0
      ? `Discovered ${reportsFoundCount} official report link(s) on ${college.website}. ${newReportsAddedCount} new report(s) cataloged.`
      : `No official placement reports found on ${college.website} during this scan.`;

  const discoveryLog = await InstitutionDiscoveryLog.create({
    collegeId: college._id,
    scanType,
    sourcePagesChecked: pagesChecked,
    reportsFound: reportsFoundCount,
    reportsDownloaded: 0,
    reportsExtracted: 0,
    status: discoveryStatus,
    notes,
    initiatedBy,
  });

  console.log(`[Discovery] Finished scan for ${college.name}: ${notes}`);

  return {
    status: discoveryStatus,
    college: { id: college._id, name: college.name, website: college.website },
    pagesCheckedCount: pagesChecked.length,
    reportsFoundCount,
    newReportsAddedCount,
    log: discoveryLog,
  };
}

module.exports = {
  discoverReportsForCollege,
  detectAcademicSession,
  isOfficialDomain,
};
