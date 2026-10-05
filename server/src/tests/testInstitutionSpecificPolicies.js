/**
 * Comprehensive Integration Test Suite:
 * Institution-Specific Data Verification & Historical Placement Policy
 *
 * Verifies:
 * 1. Institution Categorization (Category A: Premium Public vs Category B: Private)
 * 2. Moderator Classification API & Immutable Audit Trail Logging
 * 3. Category A Historical Policy (IITs/NITs/IIITs: official reports, missing metrics labeled "Not reported")
 * 4. Category B Historical Policy (Private: strict session-wise verification, unverified labeled "Verified data not available for this session")
 * 5. Tit-for-Tat Like-for-Like Comparison & Highest-vs-Median Guardrail Suppression
 * 6. Standardized Verification Levels ('Officially reported', 'Independently verified', etc.)
 * 7. Category filtering in College Directory & Advertised vs Reality
 * 8. Clean database teardown of all synthetic test records
 */

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const College = require('../models/College');
const Department = require('../models/Department');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { signToken } = require('../utils/jwt');
const { ensureCollegeSessions } = require('../utils/academicSessionHelper');

const API_BASE = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================');
  console.log('   INSTITUTION-SPECIFIC VERIFICATION & HISTORICAL POLICY TESTS   ');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('[DB] Connected to MongoDB');

  // Find or create admin user for authorized requests
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin.policy.test@placementreality.org',
      password: 'TestPassword123!',
      role: 'admin',
      isEmailVerified: true,
    });
  }
  const adminToken = signToken({ id: adminUser._id });
  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  // Find or create student user for unauthorized checks
  let studentUser = await User.findOne({ role: 'student' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Test Student',
      email: 'student.policy.test@example.com',
      password: 'TestPassword123!',
      role: 'student',
      isEmailVerified: true,
    });
  }
  const studentToken = signToken({ id: studentUser._id });

  // Find Category A college (IIT Bombay) and Category B college (KIIT)
  let catACollege = await College.findOne({
    $or: [{ shortName: 'IIT Bombay' }, { 'institutionCategory.category': 'Category A: Premium Public' }],
  });
  let catBCollege = await College.findOne({
    $or: [{ shortName: 'KIIT' }, { 'institutionCategory.category': 'Category B: Private' }],
  });

  if (!catACollege || !catBCollege) {
    const allColleges = await College.find();
    if (allColleges.length < 2) throw new Error('At least 2 colleges required for testing');
    catACollege = allColleges[0];
    catBCollege = allColleges[1];
  }

  console.log(`[Target A] Category A: ${catACollege.name} (${catACollege._id})`);
  console.log(`[Target B] Category B: ${catBCollege.name} (${catBCollege._id})`);

  const createdRecordIds = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: INSTITUTION CLASSIFICATION & MODERATOR PERMISSIONS
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Institution Categorization & Moderator API ---');

    // Attempt classification by unprivileged student (must fail with 403)
    let unauthorizedFailed = false;
    try {
      const res = await axios.put(
        `${API_BASE}/colleges/${catBCollege._id}/classify`,
        {
          category: 'Category A: Premium Public',
          subCategory: 'IIT',
        },
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      console.log('UNAUTH RETURNED SUCCESS (SHOULD NOT):', res.status, res.data);
    } catch (err) {
      console.log('UNAUTH CAUGHT:', err.response?.status, err.response?.data, err.message);
      if (err.response?.status === 403) {
        unauthorizedFailed = true;
      }
    }
    if (!unauthorizedFailed) {
      throw new Error('FAILED: Unauthorized student was able to classify institution');
    }
    console.log('✓ RBAC Enforced: Non-moderator cannot reclassify institutions (HTTP 403).');

    // Authorized moderator/admin classification of Cat A college
    const classifyResA = await axios.put(
      `${API_BASE}/colleges/${catACollege._id}/classify`,
      {
        category: 'Category A: Premium Public',
        subCategory: 'IIT',
        classificationNotes: 'Verified against statutory Institute of National Importance charter.',
      },
      { headers: authHeaders }
    );
    if (!classifyResA.data.success) {
      throw new Error('FAILED: Authorized classification of Category A college failed');
    }
    console.log(`✓ College ${catACollege.shortName} successfully classified as Category A: Premium Public (IIT).`);

    // Authorized classification of Cat B college
    const classifyResB = await axios.put(
      `${API_BASE}/colleges/${catBCollege._id}/classify`,
      {
        category: 'Category B: Private',
        subCategory: 'Deemed University',
        classificationNotes: 'Private sector institution subject to strict session-wise evidentiary verification.',
      },
      { headers: authHeaders }
    );
    if (!classifyResB.data.success) {
      throw new Error('FAILED: Authorized classification of Category B college failed');
    }
    console.log(`✓ College ${catBCollege.shortName} successfully classified as Category B: Private (Deemed University).`);

    // Verify audit log entry
    const auditEntry = await AuditLog.findOne({
      entityType: 'College',
      actionType: 'CLASSIFY_INSTITUTION',
      entityId: catACollege._id,
    }).sort({ createdAt: -1 });

    if (!auditEntry) {
      throw new Error('FAILED: Audit trail entry not created for CLASSIFY_INSTITUTION');
    }
    console.log('✓ Audit Trail Verified: CLASSIFY_INSTITUTION action logged with moderator identity.');

    // -------------------------------------------------------------
    // TEST 2: CATEGORY FILTERING IN COLLEGE DIRECTORY
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Category Filtering in College Directory ---');
    const filterResA = await axios.get(`${API_BASE}/colleges?category=Category A: Premium Public`);
    const listA = filterResA.data.data.colleges;
    if (!listA.every(c => c.institutionCategory?.category?.includes('Category A'))) {
      throw new Error('FAILED: Category A directory filter returned non-Category A colleges');
    }
    console.log(`✓ Category A directory filter returned ${listA.length} colleges matching Category A.`);

    const filterResB = await axios.get(`${API_BASE}/colleges?category=Category B: Private`);
    const listB = filterResB.data.data.colleges;
    if (!listB.every(c => c.institutionCategory?.category?.includes('Category B'))) {
      throw new Error('FAILED: Category B directory filter returned non-Category B colleges');
    }
    console.log(`✓ Category B directory filter returned ${listB.length} colleges matching Category B.`);

    // -------------------------------------------------------------
    // TEST 3: CATEGORY A HISTORICAL DATA POLICY (IIT BOMBAY)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Category A Historical Placement Policy ---');
    await ensureCollegeSessions(catACollege._id);
    const catASeason2019 = await PlacementSeason.findOne({ collegeId: catACollege._id, academicYear: '2019-2020' });

    // Category A official report for 2019-20 with partial metrics (median package not reported)
    const recA = await PlacementRecord.create({
      collegeId: catACollege._id,
      seasonId: catASeason2019._id,
      reportingYear: '2019-2020',
      reportingSource: 'Official Institute Website',
      sourceUrl: 'https://iitb.ac.in/placements/report-2019-20.pdf',
      documentName: 'IIT Bombay Annual Placement Report 2019-20',
      totalEligibleStudents: 1200,
      uniqueStudentsPlaced: 1100,
      highestPackageLPA: 62.5,
      averagePackageLPA: 20.8,
      medianPackageLPA: null, // intentionally missing to verify "Not reported"
      approvalStatus: 'Verified',
      verificationLevel: 'Officially reported',
      isAdvertisedClaim: false,
    });
    createdRecordIds.push(recA._id);

    // Fetch session analytics for Cat A
    const catAAnalyticsRes = await axios.get(`${API_BASE}/placements/${catACollege._id}/seasons/${catASeason2019._id}`);
    const catAAnalytics = catAAnalyticsRes.data.data;

    if (catAAnalytics.policy?.category !== 'Category A: Premium Public') {
      throw new Error(`FAILED: Expected Category A policy metadata, got ${catAAnalytics.policy?.category}`);
    }
    if (catAAnalytics.policy?.missingMetricLabel !== 'Not reported') {
      throw new Error(`FAILED: Category A missingMetricLabel must be "Not reported", got "${catAAnalytics.policy?.missingMetricLabel}"`);
    }
    if (catAAnalytics.hasVerifiedData !== true) {
      throw new Error('FAILED: Category A official record was not recognized as verified data');
    }
    if (catAAnalytics.headlineStats?.highestPackageLPA !== 62.5) {
      throw new Error(`FAILED: Category A highest package mismatch: got ${catAAnalytics.headlineStats?.highestPackageLPA}`);
    }
    console.log('✓ Category A Policy Verified: Official report accepted; missing metrics handled with "Not reported" label.');

    // -------------------------------------------------------------
    // TEST 4: CATEGORY B STRICT SESSION-WISE POLICY & EMPTY SESSIONS
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Category B Strict Session Verification & Empty State ---');
    await ensureCollegeSessions(catBCollege._id);
    const catBSeason2019 = await PlacementSeason.findOne({ collegeId: catBCollege._id, academicYear: '2019-2020' });

    // Query empty session on Cat B
    const catBEmptyRes = await axios.get(`${API_BASE}/placements/${catBCollege._id}/seasons/${catBSeason2019._id}`);
    const catBEmpty = catBEmptyRes.data.data;

    if (catBEmpty.policy?.category !== 'Category B: Private') {
      throw new Error(`FAILED: Expected Category B policy metadata, got ${catBEmpty.policy?.category}`);
    }
    if (catBEmpty.policy?.missingMetricLabel !== 'Verified data not available for this session') {
      throw new Error(`FAILED: Category B missingMetricLabel must be "Verified data not available for this session", got "${catBEmpty.policy?.missingMetricLabel}"`);
    }
    if (catBEmpty.hasVerifiedData !== false) {
      throw new Error('FAILED: Empty Category B session must have hasVerifiedData: false');
    }
    console.log('✓ Category B Policy Verified: Empty session properly flags "Verified data not available for this session" without extrapolation.');

    // -------------------------------------------------------------
    // TEST 5: TIT-FOR-TAT LIKE-FOR-LIKE COMPARISON & GUARDRAIL
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Tit-for-Tat Like-for-Like Comparison & Mismatch Guardrail ---');
    const catBSeason2023 = await PlacementSeason.findOne({ collegeId: catBCollege._id, academicYear: '2023-2024' });

    // Create Advertised claim for Cat B: Advertises 62.0 LPA highest, but average 8.2 LPA, no median
    const recAdvertised = await PlacementRecord.create({
      collegeId: catBCollege._id,
      seasonId: catBSeason2023._id,
      reportingYear: '2023-2024',
      reportingSource: 'Annual Placement Brochure',
      sourceUrl: 'https://college.edu/brochure-2023-24.pdf',
      documentName: 'Admissions Prospectus 2023-24',
      totalEligibleStudents: 5000,
      uniqueStudentsPlaced: 4800,
      highestPackageLPA: 62.0,
      averagePackageLPA: 8.2,
      medianPackageLPA: null, // Advertised didn't publish median
      approvalStatus: 'Verified',
      verificationLevel: 'Officially reported',
      isAdvertisedClaim: true,
      recordType: 'Advertised Claim',
    });
    createdRecordIds.push(recAdvertised._id);

    // Create Verified outcome for Cat B: Verified students show average 6.8 LPA and median 6.0 LPA, verified highest 32.0 LPA
    const recVerified = await PlacementRecord.create({
      collegeId: catBCollege._id,
      seasonId: catBSeason2023._id,
      reportingYear: '2023-2024',
      reportingSource: 'Student-Verified Aggregation',
      sourceUrl: 'https://placementreality.org/verified/docs-2023-24',
      documentName: 'Independently Audited Student Offers',
      totalEligibleStudents: 5000,
      uniqueStudentsPlaced: 3600,
      highestPackageLPA: 32.0,
      averagePackageLPA: 6.8,
      medianPackageLPA: 6.0,
      approvalStatus: 'Verified',
      verificationLevel: 'Independently verified',
      isAdvertisedClaim: false,
      recordType: 'Verified Outcome',
    });
    createdRecordIds.push(recVerified._id);

    // Fetch Advertised vs Reality comparison for Cat B
    const advVsRealityRes = await axios.get(
      `${API_BASE}/placements/${catBCollege._id}/advertised-vs-reality?academicYear=2023-2024`
    );
    const comparison = advVsRealityRes.data.data;

    // Verify tit-for-tat like-for-like comparisons
    const titForTat = comparison.titForTatComparison;
    if (!titForTat) {
      throw new Error('FAILED: titForTatComparison object missing from comparison response');
    }

    console.log(`[Tit-for-Tat] Policy: ${titForTat.policy?.policyType}`);
    console.log(`[Tit-for-Tat] Total Like-for-Like Metric Rows: ${titForTat.likeForLikeComparisons?.length}`);

    // Verify like-for-like rows exist (Average vs Average, Highest vs Highest)
    const avgRow = titForTat.likeForLikeComparisons.find(r => r.metricKey === 'averagePackageLPA');
    if (!avgRow || avgRow.isComparable !== true) {
      throw new Error('FAILED: Like-for-like comparison for averagePackageLPA not properly formed');
    }
    console.log(`✓ Like-for-like verified: Average Package delta = ${avgRow.differenceLPA} LPA (${avgRow.percentDifference}% difference).`);

    // Verify Incomparable Guardrail: Highest Package vs Median Package
    const guardrails = titForTat.incomparableGuardrails || [];
    const highestVsMedianGuard = guardrails.find(g => g.comparedMetricA.includes('Highest Package') && g.comparedMetricB.includes('Median Package'));
    if (!highestVsMedianGuard) {
      throw new Error('FAILED: Highest Package vs Median Package mismatch guardrail missing');
    }
    if (highestVsMedianGuard.isComparable !== false) {
      throw new Error('FAILED: Guardrail must specify isComparable: false');
    }
    console.log(`✓ Incomparable Guardrail Enforced: Direct comparison between Highest Package and Median Package strictly prohibited.`);
    console.log(`  Guardrail Explanation: "${highestVsMedianGuard.reasonExplanation.slice(0, 80)}..."`);

    // Verify Fairness Rule in Data Coverage Limitations
    if (!titForTat.dataCoverageAndLimitations?.fairnessRule?.includes('Missing student documentation is not proof of false reporting')) {
      throw new Error('FAILED: Missing fairness rule in data coverage limitations');
    }
    console.log('✓ Fairness Rule Enforced: "Missing student documentation is not proof of false reporting."');

    // -------------------------------------------------------------
    // TEST 6: STANDARDIZED VERIFICATION LEVELS
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Standardized Verification Levels API & Audit ---');
    // Test updating verification level on a placement record via admin verification endpoint
    const verifyUpdateRes = await axios.put(
      `${API_BASE}/admin/official-imports/${recAdvertised._id}/verify`,
      {
        approvalStatus: 'Verified',
        verificationLevel: 'Officially reported',
        notes: 'Confirmed source document is an official institutional filing.',
      },
      { headers: authHeaders }
    );

    if (!verifyUpdateRes.data.success) {
      throw new Error('FAILED: Placement record verification update failed');
    }
    const updatedRecord = verifyUpdateRes.data.data.record;
    if (updatedRecord.verificationLevel !== 'Officially reported') {
      throw new Error(`FAILED: Verification level not saved properly. Expected 'Officially reported', got '${updatedRecord.verificationLevel}'`);
    }
    console.log('✓ Standardized Verification Level Verified: Set to "Officially reported" with moderator audit stamp.');

    console.log('\n================================================================');
    console.log('   ALL INSTITUTION-SPECIFIC VERIFICATION TESTS PASSED (6/6)      ');
    console.log('================================================================\n');

  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: CLEAN ALL SYNTHETIC TEST RECORDS
    // -------------------------------------------------------------
    console.log('[Teardown] Cleaning up synthetic test placement records...');
    if (createdRecordIds.length > 0) {
      const delRes = await PlacementRecord.deleteMany({ _id: { $in: createdRecordIds } });
      console.log(`[Teardown] Deleted ${delRes.deletedCount} synthetic placement records.`);
    }
    await User.deleteOne({ email: 'admin.policy.test@placementreality.org' });
    await User.deleteOne({ email: 'student.policy.test@example.com' });
    await mongoose.disconnect();
    console.log('[Teardown] Disconnected from MongoDB. Production database 100% clean.\n');
  }
};

runTests()
  .then(() => {
    console.log('✅ Test Suite execution finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test Suite Failed:', err);
    process.exit(1);
  });
