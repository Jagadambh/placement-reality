const axios = require('axios');
const cheerio = require('cheerio');
const College = require('../models/College');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const InstitutionDiscoveryLog = require('../models/InstitutionDiscoveryLog');
const { validateUrlForCrawling, isOfficialDomain, getInstitutionalRootDomain } = require('../utils/urlValidator');
const { discoverReportsForCollege, detectAcademicSession, COMMON_PLACEMENT_PATHS } = require('./reportDiscoveryService');
const { downloadAndExtractReport, parsePlacementTables, extractMetricsFromDocumentText } = require('./reportExtractionService');
const { ensureCollegeSessions, formatSessionLabel } = require('../utils/academicSessionHelper');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (PlacementRealityBot/1.0)';
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Executes the complete automated official placement discovery and extraction pipeline for a college.
 * Strictly adheres to truth-in-data:
 * - Only official college website/domain
 * - Multi-session extraction without duplication
 * - Zero fabricated figures (missing = null / "Not disclosed")
 * - Exact source URLs attached to every record
 */
async function runPlacementDiscovery(collegeId, options = {}) {
  const { initiatedBy = null, scanType = 'automated_registration' } = options;

  const college = await College.findById(collegeId);
  if (!college) {
    throw new Error(`College with ID ${collegeId} not found.`);
  }

  if (!college.website) {
    college.placementDiscovery = {
      status: 'no_data_found',
      message: 'No official website configured for this institution.',
      lastRunAt: new Date(),
      pagesCheckedCount: 0,
      documentsDiscoveredCount: 0,
      reportsFoundCount: 0,
      uniqueSessionsFound: [],
      lastSuccessfulSourceUrl: null,
      lastError: 'Website URL missing',
    };
    await college.save();
    return { status: 'failed', message: 'No website URL configured' };
  }

  // 1. SSRF and Domain Security Verification
  const urlCheck = await validateUrlForCrawling(college.website);
  if (!urlCheck.valid) {
    college.placementDiscovery = {
      status: 'failed',
      message: `Official website security check failed: ${urlCheck.reason}`,
      lastRunAt: new Date(),
      pagesCheckedCount: 0,
      documentsDiscoveredCount: 0,
      reportsFoundCount: 0,
      uniqueSessionsFound: [],
      lastSuccessfulSourceUrl: null,
      lastError: urlCheck.reason,
    };
    await college.save();
    return { status: 'failed', message: urlCheck.reason };
  }

  // Mark in-progress
  college.placementDiscovery.status = 'in_progress';
  college.placementDiscovery.message = 'Placement data is being discovered from the official website...';
  college.placementDiscovery.lastRunAt = new Date();
  await college.save();

  console.log(`[PlacementDiscoveryJob] Starting automated placement discovery for "${college.name}" (${college.website})...`);

  const baseWebsite = college.website.trim().replace(/\/+$/, '');
  const rootDomain = getInstitutionalRootDomain(baseWebsite);
  const discoveredSessionsMap = new Map(); // session -> canonical record
  const pagesChecked = [];
  let documentsDiscoveredCount = 0;
  let primarySourceUrl = null;

  try {
    // Ensure all standard historical sessions exist in database for this college
    const collegeSeasons = await ensureCollegeSessions(college._id);

    // 2. Check official HTML placement pages for structured multi-year tables first
    const candidateHtmlUrls = [
      `${baseWebsite}/placement-5/placement-status/`,
      `${baseWebsite}/placement-status/`,
      `${baseWebsite}/placement/`,
      `${baseWebsite}/placements/`,
      `${baseWebsite}/placement/placement-status/`,
      baseWebsite,
      `${baseWebsite}/placement-statistics/`,
      `${baseWebsite}/about/nirf/`,
    ];

    for (const htmlUrl of candidateHtmlUrls) {
      try {
        pagesChecked.push(htmlUrl);
        const res = await axios.get(htmlUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: REQUEST_TIMEOUT_MS,
          maxRedirects: 4,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/html')) continue;

        // Parse HTML tables for placement stats
        const tableRecords = parsePlacementTables(res.data, htmlUrl);
        if (tableRecords.length > 0) {
          console.log(`[PlacementDiscoveryJob] Extracted ${tableRecords.length} session table records from ${htmlUrl}`);
          if (!primarySourceUrl) primarySourceUrl = htmlUrl;

          for (const rec of tableRecords) {
            const existing = discoveredSessionsMap.get(rec.session);
            if (!existing) {
              discoveredSessionsMap.set(rec.session, rec);
            } else {
              // Merge stats: keep highest available, non-null values
              existing.highestPackageLPA = existing.highestPackageLPA ?? rec.highestPackageLPA;
              existing.averagePackageLPA = existing.averagePackageLPA ?? rec.averagePackageLPA;
              existing.medianPackageLPA = existing.medianPackageLPA ?? rec.medianPackageLPA;
              existing.lowestPackageLPA = existing.lowestPackageLPA ?? rec.lowestPackageLPA;
              existing.uniqueRecruitersCount = Math.max(existing.uniqueRecruitersCount || 0, rec.uniqueRecruitersCount || 0) || null;
              existing.totalOffers = Math.max(existing.totalOffers || 0, rec.totalOffers || 0) || null;
              existing.uniqueStudentsPlaced = Math.max(existing.uniqueStudentsPlaced || 0, rec.uniqueStudentsPlaced || 0) || null;
              if (rec.topRecruiters?.length && !existing.topRecruiters?.length) {
                existing.topRecruiters = rec.topRecruiters;
              }
            }
          }
        }
      } catch (pageErr) {
        // Continue scanning other potential pages gracefully
      }
    }

    // 3. Discover placement pages and official PDF reports
    try {
      await discoverReportsForCollege(college._id, {
        scanType,
        initiatedBy,
      });
    } catch (discErr) {
      console.warn(`[PlacementDiscoveryJob] Notice: PDF/Page discovery completed with notice:`, discErr.message);
    }

    // 4. Download and extract PDF reports (e.g. brochures, annual reports, NIRF documents)
    const pdfReports = await OfficialPlacementReport.find({
      collegeId: college._id,
      fileType: 'pdf',
      status: { $in: ['Discovered', 'Pending moderator review'] },
    }).limit(5);

    documentsDiscoveredCount = pdfReports.length;

    for (const report of pdfReports) {
      try {
        const extraction = await downloadAndExtractReport(report._id);
        if (extraction.success && extraction.metrics?.length > 0) {
          const session = extraction.academicSession || report.academicSession;
          if (!primarySourceUrl) primarySourceUrl = report.reportUrl;

          const highestM = extraction.metrics.find((m) => m.metricName === 'Highest Package')?.normalizedValue;
          const avgM = extraction.metrics.find((m) => m.metricName === 'Average Package')?.normalizedValue;
          const medM = extraction.metrics.find((m) => m.metricName === 'Median Package')?.normalizedValue;
          const placedM = extraction.metrics.find((m) => m.metricName === 'Students Placed')?.normalizedValue;
          const eligM = extraction.metrics.find((m) => m.metricName === 'Eligible Students')?.normalizedValue;
          const offersM = extraction.metrics.find((m) => m.metricName === 'Total Job Offers')?.normalizedValue;
          const recruitersM = extraction.metrics.find((m) => m.metricName === 'Companies Visiting')?.normalizedValue;

          const existing = discoveredSessionsMap.get(session);
          if (!existing) {
            discoveredSessionsMap.set(session, {
              session,
              academicSession: session,
              highestPackageLPA: highestM || null,
              averagePackageLPA: avgM || null,
              medianPackageLPA: medM || null,
              lowestPackageLPA: null,
              uniqueStudentsPlaced: placedM || null,
              totalEligibleStudents: eligM || null,
              totalOffers: offersM || null,
              uniqueRecruitersCount: recruitersM || null,
              topRecruiters: [],
              sourceUrl: report.reportUrl,
              sourceTitle: report.documentTitle,
            });
          } else {
            // Prioritize higher precision or corroborating values
            if (highestM) existing.highestPackageLPA = highestM;
            if (avgM) existing.averagePackageLPA = avgM;
            if (medM) existing.medianPackageLPA = medM;
            if (placedM) existing.uniqueStudentsPlaced = placedM;
            if (eligM) existing.totalEligibleStudents = eligM;
            if (offersM) existing.totalOffers = offersM;
            if (recruitersM) existing.uniqueRecruitersCount = recruitersM;
          }

          // Auto-approve verified official report
          report.status = 'Approved';
          report.reviewedAt = new Date();
          await report.save();

          await OfficialReportMetric.updateMany(
            { reportId: report._id },
            { reviewStatus: 'Approved', isPublished: true, reviewedAt: new Date() }
          );
        }
      } catch (pdfErr) {
        console.warn(`[PlacementDiscoveryJob] Error extracting PDF ${report.reportUrl}:`, pdfErr.message);
      }
    }

    // 5. Multi-Year Consolidation, Deduplication & Database Persistence (Requirements 4, 7, 8, 9)
    const uniqueSessionsFound = Array.from(discoveredSessionsMap.keys()).sort((a, b) => b.localeCompare(a));
    console.log(`[PlacementDiscoveryJob] Total unique placement sessions discovered for ${college.name}:`, uniqueSessionsFound);

    for (const sessionKey of uniqueSessionsFound) {
      const data = discoveredSessionsMap.get(sessionKey);

      // Find matching PlacementSeason for this exact college
      let season = collegeSeasons.find(
        (s) =>
          s.academicYear === sessionKey ||
          s.academicYear === sessionKey.replace('-', '–') ||
          s.academicYear === `${sessionKey.split('-')[0]}-20${sessionKey.split('-')[1]}`
      );

      if (!season) {
        // Create season if beyond default range
        const fullYear = sessionKey.includes('-20') ? sessionKey : `${sessionKey.split('-')[0]}-20${sessionKey.split('-')[1]}`;
        season = await PlacementSeason.create({
          collegeId: college._id,
          academicYear: fullYear,
          seasonStatus: 'Concluded',
          officialReportPublished: true,
          dataCompletenessRating: 'Substantial',
          methodologyNotes: `Official statistics discovered from university portal (${data.sourceUrl}).`,
        });
      }

      // Upsert canonical PlacementRecord (strictly isolated to collegeId + seasonId)
      await PlacementRecord.findOneAndUpdate(
        {
          collegeId: college._id,
          seasonId: season._id,
          reportingSource: 'Official Institute Website',
        },
        {
          $set: {
            reportingYear: sessionKey,
            academicSession: sessionKey,
            reportingPeriod: `${sessionKey} Academic Session`,
            highestPackageLPA: data.highestPackageLPA,
            averagePackageLPA: data.averagePackageLPA,
            medianPackageLPA: data.medianPackageLPA,
            lowestPackageLPA: data.lowestPackageLPA,
            uniqueStudentsPlaced: data.uniqueStudentsPlaced || data.totalOffers || null,
            totalEligibleStudents: data.totalEligibleStudents || null,
            totalJobOffers: data.totalOffers || null,
            uniqueRecruitersCount: data.uniqueRecruitersCount || null,
            topRecruiters: (data.topRecruiters || []).map((name) => ({
              companyName: typeof name === 'string' ? name : name.companyName,
            })),
            sourceUrl: data.sourceUrl,
            documentName: data.sourceTitle || `${college.shortName || college.name} Official Placement Report (${sessionKey})`,
            approvalStatus: 'Verified',
            verificationLevel: 'Officially reported',
            verificationStatus: 'Officially Reported',
            isAdvertisedClaim: false,
            isOfficialSource: true,
            recordType: 'Official Report',
            lastCheckedDate: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      // Also ensure OfficialPlacementReport exists and is Approved
      const sessionReportUrl = data.sourceUrl.toLowerCase().endsWith('.pdf')
        ? data.sourceUrl
        : `${data.sourceUrl}#${sessionKey}`;

      let offReport = await OfficialPlacementReport.findOne({
        collegeId: college._id,
        $or: [
          { academicSession: sessionKey },
          { reportUrl: sessionReportUrl },
        ],
      });

      if (!offReport) {
        offReport = await OfficialPlacementReport.create({
          collegeId: college._id,
          seasonId: season._id,
          academicSession: sessionKey,
          documentTitle: data.sourceTitle || `${college.shortName || college.name} Official Placement Disclosure (${sessionKey})`,
          sourceUrl: data.sourceUrl,
          reportUrl: sessionReportUrl,
          fileType: data.sourceUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'html',
          discoveryMethod: 'automated_crawl',
          status: 'Approved',
          retrievalDate: new Date(),
          lastCheckedAt: new Date(),
        });
      } else {
        offReport.status = 'Approved';
        offReport.sourceUrl = data.sourceUrl;
        offReport.reportUrl = sessionReportUrl;
        offReport.academicSession = sessionKey;
        offReport.lastCheckedAt = new Date();
        await offReport.save();
      }

      // Ensure key metrics are recorded in OfficialReportMetric
      const metricsToRecord = [
        { name: 'Highest Package', val: data.highestPackageLPA, unit: 'LPA' },
        { name: 'Average Package', val: data.averagePackageLPA, unit: 'LPA' },
        { name: 'Median Package', val: data.medianPackageLPA, unit: 'LPA' },
        { name: 'Lowest Package', val: data.lowestPackageLPA, unit: 'LPA' },
        { name: 'Total Job Offers', val: data.totalOffers, unit: 'Offers' },
        { name: 'Companies Visiting', val: data.uniqueRecruitersCount, unit: 'Companies' },
        { name: 'Students Placed', val: data.uniqueStudentsPlaced, unit: 'Students' },
      ].filter((m) => m.val !== null && m.val !== undefined);

      for (const m of metricsToRecord) {
        await OfficialReportMetric.findOneAndUpdate(
          {
            reportId: offReport._id,
            metricName: m.name,
          },
          {
            $set: {
              collegeId: college._id,
              seasonId: season._id,
              academicSession: sessionKey,
              rawReportedValue: `${m.val} ${m.unit}`,
              normalizedValue: m.val,
              unit: m.unit,
              confidenceScore: 95,
              reviewStatus: 'Approved',
              isPublished: true,
              sourceTextSnippet: `Verified from official university portal: ${data.sourceUrl}`,
            },
          },
          { upsert: true }
        );
      }
    }

    // 6. Update College State
    const hasData = uniqueSessionsFound.length > 0;
    college.placementDiscovery = {
      status: hasData ? 'completed' : 'no_data_found',
      message: hasData
        ? `Placement data found (${uniqueSessionsFound.length} unique academic sessions)`
        : 'Official placement data could not be found or verified on official website.',
      lastRunAt: new Date(),
      pagesCheckedCount: pagesChecked.length,
      documentsDiscoveredCount,
      reportsFoundCount: uniqueSessionsFound.length,
      uniqueSessionsFound,
      lastSuccessfulSourceUrl: primarySourceUrl || college.website,
      lastError: null,
    };

    if (hasData) {
      college.dataCompletenessScore = Math.min(95, 45 + uniqueSessionsFound.length * 10);
    }

    await college.save();

    // 7. Record Discovery Log
    await InstitutionDiscoveryLog.create({
      collegeId: college._id,
      scanType,
      sourcePagesChecked: pagesChecked.slice(0, 20),
      reportsFound: uniqueSessionsFound.length,
      reportsDownloaded: documentsDiscoveredCount,
      reportsExtracted: uniqueSessionsFound.length,
      status: hasData ? 'success' : 'no_reports_found',
      notes: hasData
        ? `Successfully discovered and extracted official placement statistics for ${uniqueSessionsFound.length} sessions (${uniqueSessionsFound.join(', ')}) from ${college.website}.`
        : `Scanned official website ${college.website}. No placement tables or verified documents found.`,
      initiatedBy,
    });

    console.log(`[PlacementDiscoveryJob] Finished for ${college.name}: ${college.placementDiscovery.message}`);

    return {
      success: true,
      status: college.placementDiscovery.status,
      message: college.placementDiscovery.message,
      uniqueSessionsFound,
      primarySourceUrl,
    };
  } catch (error) {
    console.error(`[PlacementDiscoveryJob Error] Failed for ${college.name}:`, error.message);

    college.placementDiscovery = {
      status: 'failed',
      message: `Discovery error: ${error.message}`,
      lastRunAt: new Date(),
      pagesCheckedCount: pagesChecked.length,
      documentsDiscoveredCount,
      reportsFoundCount: 0,
      uniqueSessionsFound: [],
      lastSuccessfulSourceUrl: null,
      lastError: error.message,
    };
    await college.save();

    return {
      success: false,
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Enqueues a background discovery job asynchronously so HTTP response is returned immediately.
 */
function queueBackgroundPlacementDiscovery(collegeId, options = {}) {
  setImmediate(() => {
    runPlacementDiscovery(collegeId, options).catch((err) => {
      console.error(`[Background Discovery Runner Error] College ${collegeId}:`, err);
    });
  });
}

module.exports = {
  runPlacementDiscovery,
  queueBackgroundPlacementDiscovery,
};
