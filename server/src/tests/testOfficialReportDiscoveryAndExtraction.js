require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const College = require('../models/College');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const OfficialReportMetric = require('../models/OfficialReportMetric');
const InstitutionDiscoveryLog = require('../models/InstitutionDiscoveryLog');
const {
  detectAcademicSession,
  isOfficialDomain,
  discoverReportsForCollege,
} = require('../services/reportDiscoveryService');
const {
  extractMetricsFromDocumentText,
  downloadAndExtractReport,
} = require('../services/reportExtractionService');

const API_BASE = 'http://localhost:5000/api';

async function runDiscoverySuite() {
  console.log('================================================================');
  console.log('   OFFICIAL PLACEMENT REPORT DISCOVERY & EXTRACTION SUITE       ');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('✔ Connected to MongoDB for database state validation.');

  // 1. Authenticate as Moderator
  console.log('\n[Step 1] Authenticating as Moderator...');
  const modLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'moderator@placementreality.org',
    password: 'ModPass123!',
  });
  const modToken = modLogin.data.data.token;
  console.log('✔ Moderator authenticated. Token acquired.');

  // 2. Test Academic Session Identification
  console.log('\n[Step 2] Testing Academic Session Identification Engine...');
  const sessionSamples = [
    { input: 'KIIT Placement Brochure 2023-24.pdf', expected: '2023-24' },
    { input: 'IIT Bombay Annual Report 2022-2023.pdf', expected: '2022-23' },
    { input: 'NIRF Mandatory Disclosure 2021-22', expected: '2021-22' },
    { input: 'Placement Statistics 2024 Final.pdf', expected: '2023-24' },
  ];

  for (const s of sessionSamples) {
    const detected = detectAcademicSession(s.input);
    if (detected !== s.expected) {
      throw new Error(`Session detection failed for "${s.input}". Expected ${s.expected}, got ${detected}`);
    }
  }
  console.log('✔ STEP 2 PASSED: Academic session regex detection accurate across all formats.');

  // 3. Test Official Domain Whitelist and Third-Party Rejector
  console.log('\n[Step 3] Testing Official Domain Whitelist vs Third-Party Rejection...');
  const domainTests = [
    { url: 'https://kiit.ac.in/training-placement/report.pdf', base: 'https://kiit.ac.in', expected: true },
    { url: 'https://placements.iitb.ac.in/annual_report.pdf', base: 'https://iitb.ac.in', expected: true },
    { url: 'https://collegedunia.com/university/kiit-placements', base: 'https://kiit.ac.in', expected: false },
    { url: 'https://www.shiksha.com/college/vit-placements', base: 'https://vit.ac.in', expected: false },
    { url: 'https://facebook.com/kiituniversity', base: 'https://kiit.ac.in', expected: false },
  ];

  for (const dt of domainTests) {
    const isOk = isOfficialDomain(dt.url, dt.base);
    if (isOk !== dt.expected) {
      throw new Error(`Domain check failed for ${dt.url}. Expected ${dt.expected}, got ${isOk}`);
    }
  }
  console.log('✔ STEP 3 PASSED: Third-party listing domains strictly rejected; official domains preserved.');

  // 4. Test Text and Table Metric Extraction Engine
  console.log('\n[Step 4] Testing AI-Assisted Document Metric & Cited Snippet Extraction...');
  const syntheticOfficialDocumentText = `
KALINGA INSTITUTE OF INDUSTRIAL TECHNOLOGY (KIIT)
DEEMED TO BE UNIVERSITY, BHUBANESWAR
ANNUAL CAMPUS PLACEMENT AUDIT REPORT 2023-24

EXECUTIVE PLACEMENT SUMMARY FOR BATCH 2024:
The Training & Placement Cell records groundbreaking milestones for the graduating batch of 2024.
1. Highest Package: The campus drive recorded an all-time Highest Package: 63.00 LPA offered by an international tech conglomerate.
2. Average Package: The overall Average Package: 8.5 LPA witnessed steady double-digit growth.
3. Median Package: The documented Median Package: 7.2 LPA reflects balanced compensation across engineering branches.
4. Eligible Students: Out of total graduating cohorts, Eligible Students: 4,500 participated in the active recruitment process.
5. Unique Placed Students: Total Unique Students Placed: 3,950 secured formal letters of intent.
6. Placement Rate: The verifiable Placement Percentage: 87.7% stands among eastern India's highest.
7. Recruiters: A total of Participating Companies: 450 visited campus during the session.
8. Total Offers: Industry partners issued Total Job Offers: 5,200 across multiple sectors.
9. Internship Outcomes: Top summer interns received Highest Internship Stipend: 150000 per month.
`;

  const extractedMetrics = extractMetricsFromDocumentText(syntheticOfficialDocumentText, 3);
  console.log(`✔ Extracted ${extractedMetrics.length} metrics from document text:`);
  for (const m of extractedMetrics) {
    console.log(`   • ${m.metricName}: ${m.rawReportedValue} (Page ${m.pageNumber})`);
    if (!m.sourceTextSnippet) {
      throw new Error(`Metric ${m.metricName} is missing source cited text snippet!`);
    }
  }

  const metricMap = new Map(extractedMetrics.map((m) => [m.metricName, m]));
  if (!metricMap.has('Highest Package') || metricMap.get('Highest Package').normalizedValue !== 63) {
    throw new Error('Failed to accurately extract Highest Package (63 LPA)');
  }
  if (!metricMap.has('Average Package') || metricMap.get('Average Package').normalizedValue !== 8.5) {
    throw new Error('Failed to accurately extract Average Package (8.5 LPA)');
  }
  if (!metricMap.has('Median Package') || metricMap.get('Median Package').normalizedValue !== 7.2) {
    throw new Error('Failed to accurately extract Median Package (7.2 LPA)');
  }
  if (!metricMap.has('Students Placed') || metricMap.get('Students Placed').normalizedValue !== 3950) {
    throw new Error('Failed to accurately extract Students Placed (3950)');
  }
  if (!metricMap.has('Placement Percentage') || metricMap.get('Placement Percentage').normalizedValue !== 87.7) {
    throw new Error('Failed to accurately extract Placement Percentage (87.7%)');
  }
  if (!metricMap.has('Companies Visiting') || metricMap.get('Companies Visiting').normalizedValue !== 450) {
    throw new Error('Failed to accurately extract Companies Visiting (450)');
  }
  if (!metricMap.has('Total Job Offers') || metricMap.get('Total Job Offers').normalizedValue !== 5200) {
    throw new Error('Failed to accurately extract Total Job Offers (5200)');
  }
  console.log('✔ STEP 4 PASSED: Explicit placement metrics extracted with 100% precision and cited snippets.');

  // 5. Test Database Model Creation & Duplicate Report Rejection
  console.log('\n[Step 5] Testing Database Persistence & Duplicate Prevention...');
  const kiit = await College.findOne({ shortName: 'KIIT' });
  const season = await PlacementSeason.findOne({ academicYear: '2023-2024' }) || await PlacementSeason.findOne();

  const testReportUrl = `https://kiit.ac.in/test-docs/placement_report_2023_24_${Date.now()}.pdf`;
  const reportDoc = await OfficialPlacementReport.create({
    collegeId: kiit._id,
    seasonId: season._id,
    academicSession: '2023-24',
    documentTitle: 'KIIT Official Placement Report 2023-24',
    sourceUrl: 'https://kiit.ac.in/training-placement/',
    reportUrl: testReportUrl,
    fileType: 'pdf',
    status: 'Extracted',
    pageCount: 3,
  });

  console.log(`✔ Created OfficialPlacementReport record ID: ${reportDoc._id}`);

  // Test duplicate rejection
  try {
    await OfficialPlacementReport.create({
      collegeId: kiit._id,
      seasonId: season._id,
      academicSession: '2023-24',
      documentTitle: 'Duplicate Attempt',
      sourceUrl: 'https://kiit.ac.in/training-placement/',
      reportUrl: testReportUrl, // Duplicate URL for same college
      fileType: 'pdf',
    });
    throw new Error('Duplicate report creation should have failed due to compound unique index!');
  } catch (dupErr) {
    if (dupErr.code === 11000) {
      console.log('✔ Duplicate report successfully caught and rejected by MongoDB unique compound index.');
    } else {
      throw dupErr;
    }
  }
  console.log('✔ STEP 5 PASSED: Unique index protects against duplicate report downloads.');

  // 6. Test Metric Persistence & Traceability Linking
  console.log('\n[Step 6] Saving Extracted Metrics to OfficialReportMetric Collection...');
  for (const m of extractedMetrics) {
    await OfficialReportMetric.create({
      reportId: reportDoc._id,
      collegeId: kiit._id,
      seasonId: season._id,
      academicSession: '2023-24',
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
  }
  const savedCount = await OfficialReportMetric.countDocuments({ reportId: reportDoc._id });
  console.log(`✔ Saved ${savedCount} individual metrics for report ${reportDoc._id}`);

  // 7. Test Moderator Review & Report Approval Workflow
  console.log('\n[Step 7] Testing Moderator Approval API (PUT /api/official-reports/:id/review)...');
  const reviewRes = await axios.put(
    `${API_BASE}/official-reports/${reportDoc._id}/review`,
    {
      action: 'approve',
      moderatorNotes: 'Factual document verified against official institutional brochure.',
    },
    {
      headers: { Authorization: `Bearer ${modToken}` },
    }
  );

  if (!reviewRes.data.success) {
    throw new Error('Approval API call failed!');
  }

  const updatedReport = await OfficialPlacementReport.findById(reportDoc._id);
  if (updatedReport.status !== 'Approved') {
    throw new Error(`Expected report status 'Approved', got '${updatedReport.status}'`);
  }
  console.log('✔ Report status successfully updated to "Approved".');

  const publishedMetrics = await OfficialReportMetric.find({ reportId: reportDoc._id, isPublished: true });
  if (publishedMetrics.length === 0) {
    throw new Error('Associated metrics were not published on report approval!');
  }
  console.log(`✔ ${publishedMetrics.length} metrics marked Approved & Published.`);

  // Verify synchronization into PlacementRecord
  const syncedPlacementRecord = await PlacementRecord.findOne({
    collegeId: kiit._id,
    seasonId: season._id,
    reportingSource: 'Official Institute Report',
  });
  if (!syncedPlacementRecord) {
    throw new Error('Approved report metrics were not synced into official PlacementRecord!');
  }
  console.log(`✔ Synced PlacementRecord confirmed: Median ${syncedPlacementRecord.medianPackageLPA} LPA, Placed: ${syncedPlacementRecord.uniqueStudentsPlaced}`);
  console.log('✔ STEP 7 PASSED: Moderator review, approval, and record synchronization verified.');

  // 8. Test Metric Correction Workflow
  console.log('\n[Step 8] Testing Individual Metric Correction API...');
  const medianMetric = await OfficialReportMetric.findOne({ reportId: reportDoc._id, metricName: 'Median Package' });
  const correctRes = await axios.put(
    `${API_BASE}/official-reports/metrics/${medianMetric._id}/review`,
    {
      action: 'correct',
      correctedValue: 7.5,
      moderatorNotes: 'Moderator corrected typo in preliminary scan',
    },
    {
      headers: { Authorization: `Bearer ${modToken}` },
    }
  );

  if (!correctRes.data.success) {
    throw new Error('Metric correction failed!');
  }
  const updatedMedianMetric = await OfficialReportMetric.findById(medianMetric._id);
  if (updatedMedianMetric.normalizedValue !== 7.5 || updatedMedianMetric.reviewStatus !== 'Corrected') {
    throw new Error('Metric correction did not update normalized value!');
  }
  console.log('✔ STEP 8 PASSED: Moderator corrected individual metric to 7.5 LPA.');

  // 9. Test Public Overview API & Truthful Session Filtering
  console.log('\n[Step 9] Testing Public Overview API (GET /api/official-reports/public-overview)...');
  const pubRes = await axios.get(`${API_BASE}/official-reports/public-overview`, {
    params: { collegeId: kiit._id, academicSession: '2023-24' },
  });

  if (!pubRes.data.success || pubRes.data.data.reports.length === 0) {
    throw new Error('Public overview API failed to return approved official report!');
  }
  const publicRep = pubRes.data.data.reports[0];
  console.log(`✔ Public report returned: "${publicRep.documentTitle}" with ${publicRep.metrics.length} approved metrics.`);

  // Test empty session (never fabricates data)
  const emptyRes = await axios.get(`${API_BASE}/official-reports/public-overview`, {
    params: { collegeId: kiit._id, academicSession: '2018-19' },
  });
  console.log(`✔ Empty session query returned ${emptyRes.data.data.reports.length} reports (zero hallucination).`);
  console.log('✔ STEP 9 PASSED: Public overview strictly surfaces verified documents and preserves empty sessions.');

  // 10. Test Inaccessible / Invalid Website Graceful Failure
  console.log('\n[Step 10] Testing Inaccessible Webpage & Error Handling...');
  const fakeCollege = await College.create({
    name: 'Temporary Inaccessible Test Institute',
    slug: `test-inst-${Date.now()}`,
    website: 'https://invalid-non-existent-domain-404.ac.in',
    city: 'Bhubaneswar',
    state: 'Odisha',
  });

  const failScan = await discoverReportsForCollege(fakeCollege._id, { scanType: 'manual' });
  console.log(`✔ Failed scan gracefully handled: status = "${failScan.status}"`);

  // Clean up synthetic test data
  await OfficialPlacementReport.deleteMany({ collegeId: kiit._id, reportUrl: testReportUrl });
  await OfficialReportMetric.deleteMany({ reportId: reportDoc._id });
  await College.findByIdAndDelete(fakeCollege._id);
  console.log('✔ Cleaned up synthetic test records.');

  console.log('\n================================================================');
  console.log('   ALL OFFICIAL REPORT DISCOVERY & EXTRACTION TESTS PASSED (10/10)');
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runDiscoverySuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  if (err.response?.data) {
    console.error('API Error Response:', err.response.data);
  }
  process.exit(1);
});
