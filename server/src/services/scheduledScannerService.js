const College = require('../models/College');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const { discoverReportsForCollege } = require('./reportDiscoveryService');
const { downloadAndExtractReport } = require('./reportExtractionService');

let isScanRunning = false;
let lastScanTimestamp = null;
let lastScanStats = null;

/**
 * Runs a discovery and update scan across all registered colleges.
 */
async function runScheduledScan(options = {}) {
  if (isScanRunning) {
    return { status: 'already_running', message: 'A discovery scan is already in progress.' };
  }

  isScanRunning = true;
  const startTime = Date.now();
  const colleges = await College.find({ website: { $ne: null } });
  const results = [];
  let totalNewReports = 0;

  console.log(`[Scheduled Discovery] Starting scheduled scan across ${colleges.length} registered colleges...`);

  try {
    for (const college of colleges) {
      try {
        const discoveryResult = await discoverReportsForCollege(college._id, {
          scanType: options.scanType || 'scheduled',
          initiatedBy: options.initiatedBy || null,
        });

        // Automatically fetch and extract newly discovered reports
        const newReports = await OfficialPlacementReport.find({
          collegeId: college._id,
          status: 'Discovered',
        }).limit(3);

        for (const rep of newReports) {
          try {
            await downloadAndExtractReport(rep._id);
            totalNewReports++;
          } catch (extractErr) {
            console.warn(`[Scheduled Discovery] Extraction failed for report ${rep._id}:`, extractErr.message);
          }
        }

        results.push({
          collegeId: college._id,
          collegeName: college.name,
          status: discoveryResult.status,
          reportsFound: discoveryResult.reportsFoundCount,
          newReports: discoveryResult.newReportsAddedCount,
        });
      } catch (colErr) {
        console.error(`[Scheduled Discovery] Error scanning ${college.name}:`, colErr.message);
        results.push({
          collegeId: college._id,
          collegeName: college.name,
          status: 'failed',
          error: colErr.message,
        });
      }
    }

    lastScanTimestamp = new Date();
    lastScanStats = {
      durationMs: Date.now() - startTime,
      collegesScanned: colleges.length,
      totalNewReportsExtracted: totalNewReports,
      results,
    };

    console.log(`[Scheduled Discovery] Completed scan. Extracted ${totalNewReports} new reports.`);
    return {
      status: 'completed',
      lastScanTimestamp,
      lastScanStats,
    };
  } finally {
    isScanRunning = false;
  }
}

/**
 * Gets current scanner status and last execution stats.
 */
function getScannerStatus() {
  return {
    isScanRunning,
    lastScanTimestamp,
    lastScanStats,
  };
}

module.exports = {
  runScheduledScan,
  getScannerStatus,
};
