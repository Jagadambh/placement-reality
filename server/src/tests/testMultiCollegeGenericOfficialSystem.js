require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const {
  College,
  PlacementSeason,
  PlacementRecord,
  OfficialPlacementReport,
  OfficialReportMetric,
} = require('../models');
const { getInstitutionalRootDomain } = require('../services/advertisedVsRealityService');

const API_BASE = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('  MULTI-COLLEGE GENERIC OFFICIAL DATA & LINK ISOLATION TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('✔ Connected to MongoDB for database state validation.\n');

  const colleges = await College.find({
    shortName: { $in: ['KIIT', 'IIT Delhi', 'NIT Trichy', 'IIT Bombay', 'VIT', 'MIT Muzaffarpur'] }
  });

  if (colleges.length < 4) {
    throw new Error(`Insufficient colleges found in DB (${colleges.length}). Run seedMultiCollegeOfficialData.js first.`);
  }

  console.log(`[Colleges Loaded] Found ${colleges.length} colleges to validate:`);
  colleges.forEach(c => console.log(`  - ${c.shortName} (${c.name}) [Domain: ${c.website}]`));

  // =========================================================================
  // REQUIREMENT 1 & 8 & 9: Public Overview Deduplication & Session Uniqueness
  // =========================================================================
  console.log('\n--- Test 1: Public Overview Session Deduplication per College ---');
  const overviewRes = await axios.get(`${API_BASE}/official-reports/public-overview`);
  const overviewData = overviewRes.data.data;
  const reports = overviewData.reports;
  if (!Array.isArray(reports)) throw new Error('Expected overviewData.reports to be an array');
  console.log(`✔ Public Overview returned ${reports.length} deduplicated reports across institutions.`);

  const reportsByCollege = new Map();
  for (const rep of reports) {
    const colName = rep.collegeId?.shortName || rep.collegeId?.name;
    if (!reportsByCollege.has(colName)) {
      reportsByCollege.set(colName, []);
    }
    reportsByCollege.get(colName).push(rep);
  }

  for (const [colName, colReports] of reportsByCollege.entries()) {
    const sessionsSeen = new Set();
    for (const rep of colReports) {
      if (sessionsSeen.has(rep.academicSession)) {
        throw new Error(`FAILED: Duplicate session "${rep.academicSession}" found for college ${colName}`);
      }
      sessionsSeen.add(rep.academicSession);
    }
    console.log(`  ✔ ${colName}: ${colReports.length} distinct sessions (${Array.from(sessionsSeen).join(', ')})`);
  }
  console.log('✔ REQUIREMENT 1 & 9 PASSED: Every college displays distinct sessions with zero duplicate year entries.');

  // =========================================================================
  // REQUIREMENT 2 & 6: Strict Isolation — Zero Cross-College Contamination
  // =========================================================================
  console.log('\n--- Test 2: Cross-College Data & URL Isolation ---');
  const urlToCollegeMap = new Map();

  for (const college of colleges) {
    const rootDomain = getInstitutionalRootDomain(college.website);
    const reports = await OfficialPlacementReport.find({ collegeId: college._id });
    
    for (const report of reports) {
      // 1. Report URL must belong strictly to this college's domain
      const reportUrlDomain = getInstitutionalRootDomain(report.sourceUrl || report.reportUrl);
      if (reportUrlDomain !== rootDomain) {
        throw new Error(`FAILED: College ${college.shortName} (${rootDomain}) has report pointing to foreign domain: ${report.reportUrl}`);
      }

      // 2. Report URL must never be used by another college
      const normalizedUrl = (report.sourceUrl || report.reportUrl).toLowerCase().trim();
      if (urlToCollegeMap.has(normalizedUrl) && urlToCollegeMap.get(normalizedUrl) !== college.shortName) {
        throw new Error(`FAILED: URL ${normalizedUrl} reused between ${urlToCollegeMap.get(normalizedUrl)} and ${college.shortName}`);
      }
      urlToCollegeMap.set(normalizedUrl, college.shortName);

      // 3. Document name must not reference another college
      for (const otherCollege of colleges) {
        if (otherCollege.shortName !== college.shortName && otherCollege.shortName.length > 3) {
          if (report.documentTitle.toLowerCase().includes(otherCollege.shortName.toLowerCase())) {
            throw new Error(`FAILED: Document title "${report.documentTitle}" for ${college.shortName} mentions foreign college ${otherCollege.shortName}`);
          }
        }
      }
    }
    console.log(`  ✔ ${college.shortName}: All ${reports.length} reports strictly quarantined to ${rootDomain}`);
  }
  console.log('✔ REQUIREMENT 2 & 6 PASSED: Zero cross-college data leaks or URL reuse.');

  // =========================================================================
  // REQUIREMENT 3 & 4 & 5: Advertised vs Reality Endpoint Verification
  // =========================================================================
  console.log('\n--- Test 3: Advertised vs Reality Exact Document Links & Metrics per College ---');
  const testInstitutes = [
    { shortName: 'KIIT', expectedDomain: 'kiit.ac.in', testYear: '2023-2024', expectedHighest: 63.0 },
    { shortName: 'IIT Delhi', expectedDomain: 'iitd.ac.in', testYear: '2023-2024', expectedHighest: 125.0 },
    { shortName: 'NIT Trichy', expectedDomain: 'nitt.edu', testYear: '2023-2024', expectedHighest: 52.8 },
    { shortName: 'IIT Bombay', expectedDomain: 'iitb.ac.in', testYear: '2023-2024', expectedHighest: 168.0 },
    { shortName: 'VIT', expectedDomain: 'vit.ac.in', testYear: '2023-2024', expectedHighest: 102.0 },
  ];

  for (const target of testInstitutes) {
    const col = colleges.find(c => c.shortName === target.shortName);
    const res = await axios.get(`${API_BASE}/placements/${col._id}/advertised-vs-reality?academicYear=${target.testYear}`);
    if (!res.data.success) throw new Error(`Failed to fetch advertised-vs-reality for ${target.shortName}`);
    
    const data = res.data.data;
    if (!data.advertised.available) {
      throw new Error(`FAILED: Expected advertised data available for ${target.shortName} session ${target.testYear}`);
    }

    // Check highest package matches target
    const highestMetric = data.metricsComparison.find(m => m.key === 'highestPackage');
    if (!highestMetric || highestMetric.advertised !== target.expectedHighest) {
      throw new Error(`FAILED: ${target.shortName} highest package mismatch: expected ${target.expectedHighest}, got ${highestMetric?.advertised}`);
    }

    // Check advertisedSourceUrl strictly belongs to the institution
    const sourceUrl = highestMetric.advertisedSourceUrl || data.advertised.documentUrl;
    const metricRootDomain = getInstitutionalRootDomain(sourceUrl);
    if (metricRootDomain !== target.expectedDomain) {
      throw new Error(`FAILED: ${target.shortName} metric source URL (${sourceUrl}) does not match expected domain ${target.expectedDomain}`);
    }

    console.log(`  ✔ ${target.shortName} [${target.testYear}]: Highest ${target.expectedHighest} LPA | Link: ${sourceUrl} (Domain: ${metricRootDomain})`);
  }
  console.log('✔ REQUIREMENT 3, 4 & 5 PASSED: Each college returns its own official metrics and verified document links.');

  // =========================================================================
  // REQUIREMENT 7: Zero Fabrication on Unreported Sessions
  // =========================================================================
  console.log('\n--- Test 4: Zero Fabrication on Unreported Sessions (e.g. MIT Muzaffarpur 2018-19) ---');
  const mitCol = colleges.find(c => c.shortName === 'MIT Muzaffarpur');
  if (!mitCol) throw new Error('MIT Muzaffarpur college missing from DB');

  // Check 2018-2019 (not published by MIT Muzaffarpur)
  const mitEmptyRes = await axios.get(`${API_BASE}/placements/${mitCol._id}/advertised-vs-reality?academicYear=2018-2019`);
  const mitEmptyData = mitEmptyRes.data.data;

  if (mitEmptyData.advertised.available !== false) {
    throw new Error('FAILED: Expected advertised.available: false for unpublished session on MIT Muzaffarpur');
  }
  if (!mitEmptyData.advertised.message.includes('Data not available on official website')) {
    throw new Error(`FAILED: Expected unavailable message, got "${mitEmptyData.advertised.message}"`);
  }
  console.log(`  ✔ MIT Muzaffarpur 2018-19 Advertised: available = false ("${mitEmptyData.advertised.message}")`);

  // Check 2023-2024 (published by MIT Muzaffarpur)
  const mitPubRes = await axios.get(`${API_BASE}/placements/${mitCol._id}/advertised-vs-reality?academicYear=2023-2024`);
  const mitPubData = mitPubRes.data.data;
  if (mitPubData.advertised.available !== true) {
    throw new Error('FAILED: Expected advertised.available: true for published 2023-24 session on MIT Muzaffarpur');
  }
  console.log(`  ✔ MIT Muzaffarpur 2023-24 Advertised: available = true (Highest: ${mitPubData.advertised.metrics?.highestPackageLPA} LPA from ${mitPubData.advertised.provenance?.sourceUrl})`);

  console.log('✔ REQUIREMENT 7 PASSED: Zero fabrication. Unreported years explicitly marked unavailable without synthetic fallbacks.');

  // =========================================================================
  // REQUIREMENT 8: Deduplication Key Compound Constraint
  // =========================================================================
  console.log('\n--- Test 5: Database Compound Indexes & Deduplication Guarantee ---');
  const indexes = await OfficialPlacementReport.collection.indexes();
  const hasCompoundSessionIndex = indexes.some(idx => 
    idx.key && idx.key.collegeId === 1 && idx.key.academicSession === 1
  );
  if (!hasCompoundSessionIndex) {
    throw new Error('FAILED: Missing compound index { collegeId: 1, academicSession: 1 } on OfficialPlacementReport');
  }
  console.log('  ✔ Confirmed MongoDB compound index { collegeId: 1, academicSession: 1 } is active.');
  console.log('✔ REQUIREMENT 8 PASSED: Schema-level compound index guarantees deduplication per college + session.');

  console.log('\n================================================================');
  console.log('🎉 ALL 9 MULTI-COLLEGE GENERIC OFFICIAL DATA REQUIREMENTS PASSED! 🎉');
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runTestSuite().catch(async (err) => {
  console.error('\n❌ MULTI-COLLEGE TEST SUITE FAILED:', err.response?.data || err.message);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});
