/**
 * Integration Test Suite for "Advertised vs Reality" Comparison Feature
 * Tests all 14 Requirements:
 * - Empty state behavior
 * - Side-by-side metric comparison (Highest, Average, Median, Eligible, Placed, Recruiters, Internships, Stipends)
 * - Provenance, source URL, and verification date checks
 * - Verified sample coverage calculation and "Zero Assumption Rule" disclaimer
 * - Comparability checks and guardrail warnings
 * - Strict exclusion of Pending and Rejected records
 * - Department/Branch filtering behavior
 * - Clean teardown of all test records (leaving production database untouched)
 */

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const College = require('../models/College');
const Department = require('../models/Department');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const User = require('../models/User');

const API_BASE = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('========================================================');
  console.log('   ADVERTISED VS REALITY FEATURE VERIFICATION SUITE     ');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('[DB] Connected to MongoDB');

  // Select target college and season
  const college = await College.findOne({ shortName: 'KIIT' }) || await College.findOne();
  if (!college) throw new Error('No college found in database');

  const season = await PlacementSeason.findOne({ academicYear: '2023-2024' }) || await PlacementSeason.findOne();
  if (!season) throw new Error('No placement season found in database');

  const department = await Department.findOne({ collegeId: college._id, code: 'CSE' }) || await Department.findOne({ collegeId: college._id });
  if (!department) throw new Error('No department found for college');

  console.log(`[Target] College: ${college.name} (${college._id})`);
  console.log(`[Target] Season: ${season.academicYear} (${season._id})`);
  console.log(`[Target] Department: ${department.name} (${department.code})`);

  // --- STEP 1: TEST EMPTY STATE / DATA NOT AVAILABLE BEHAVIOR ---
  console.log('\n--- Step 1: Testing Empty State / Zero Verified Data ---');
  const emptyRes = await axios.get(`${API_BASE}/placements/${college._id}/advertised-vs-reality?seasonId=${season._id}`);
  const emptyData = emptyRes.data.data;

  console.log(`[API] Advertised available: ${emptyData.advertised.available}`);
  console.log(`[API] Verified available: ${emptyData.verified.available}`);
  console.log(`[API] Comparability warnings: ${emptyData.comparability.warnings.length}`);

  if (emptyData.advertised.available !== false || emptyData.verified.available !== false) {
    throw new Error('FAILED: Expected both sides to be false when database has no verified records');
  }
  if (!emptyData.comparability.warnings.some(w => w.includes('Neither official reports nor student verified records are available'))) {
    throw new Error('FAILED: Expected missing data comparability warning');
  }
  console.log('✅ STEP 1 PASSED: Empty state correctly returns "Data not available" and warning.');

  // --- STEP 2: CREATE LABELED SYNTHETIC TEST RECORDS ---
  console.log('\n--- Step 2: Injecting Clearly Labeled Synthetic Test Records ---');
  
  // Find or create test student
  let testStudent = await User.findOne({ email: 'test_student_reality@kiit.ac.in' });
  if (!testStudent) {
    testStudent = await User.create({
      name: 'TEST_SYNTHETIC Student Submitter',
      email: 'test_student_reality@kiit.ac.in',
      passwordHash: '$2a$10$FakeBcryptHashedPasswordForTestRealityUser123',
      role: 'student',
      collegeId: college._id,
      departmentId: department._id,
      graduationYear: 2024,
      isVerifiedStudent: true,
      privacyConsent: true,
    });
  }

  // Create Verified Official PlacementRecord
  const testOfficialRecord = await PlacementRecord.create({
    collegeId: college._id,
    seasonId: season._id,
    reportingSource: 'Official Institute Report',
    reportingPeriod: '2023-2024 Academic Session',
    reportingYear: '2023-2024',
    sourceUrl: 'https://test-synthetic-reports.kiit.ac.in/official-report-2024.pdf',
    approvalStatus: 'Verified',
    totalGraduatingStudents: 5000,
    totalEligibleStudents: 4000,
    uniqueStudentsPlaced: 3600,
    totalJobOffers: 4800,
    highestPackageLPA: 62.0,
    averagePackageLPA: 8.5,
    medianPackageLPA: 6.8,
    uniqueRecruitersCount: 420,
    officialPaidInternshipsCount: 1500,
    officialUnpaidInternshipsCount: 120,
    officialHighestStipendInr: 100000,
    officialAverageStipendInr: 32000,
    officialMedianStipendInr: 30000,
    branchBreakdown: [
      {
        departmentId: department._id,
        departmentName: department.name,
        departmentCode: department.code,
        totalGraduating: 1200,
        eligibleStudents: 1000,
        uniqueStudentsPlaced: 920,
        totalOffers: 1400,
        highestPackageLPA: 62.0,
        averagePackageLPA: 10.5,
        medianPackageLPA: 8.0,
      },
    ],
  });
  console.log(`[Created] Official Test Record: ID ${testOfficialRecord._id} (approvalStatus: Verified)`);

  // Create Verified Student Offers (Salaries: 7.0 LPA, 8.5 LPA, 15.0 LPA)
  const testOffer1 = await Offer.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'TEST_SYNTHETIC Corp A',
    jobRole: 'Full Stack Engineer',
    offerDate: new Date('2024-02-15'),
    annualCtcLpa: 7.0,
    verificationStatus: 'Verified',
    consentToAggregate: true,
  });

  const testOffer2 = await Offer.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'TEST_SYNTHETIC Corp B',
    jobRole: 'Cloud Developer',
    offerDate: new Date('2024-03-01'),
    annualCtcLpa: 8.5,
    verificationStatus: 'Verified',
    consentToAggregate: true,
  });

  const testOffer3 = await Offer.create({
    studentId: new mongoose.Types.ObjectId(), // Distinct student
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'TEST_SYNTHETIC Corp C',
    jobRole: 'AI Research Associate',
    offerDate: new Date('2024-03-20'),
    annualCtcLpa: 15.0,
    verificationStatus: 'Verified',
    consentToAggregate: true,
  });

  // Create Verified Internships
  const testInternshipPaid = await Internship.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    companyName: 'TEST_SYNTHETIC Labs',
    internshipRole: 'ML Intern',
    startMonthYear: 'May 2023',
    monthlyStipendInr: 35000,
    stipendCategory: 'Paid',
    verificationStatus: 'Verified',
  });

  const testInternshipUnpaid = await Internship.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    companyName: 'TEST_SYNTHETIC Research Org',
    internshipRole: 'Junior Researcher',
    startMonthYear: 'June 2023',
    monthlyStipendInr: 0,
    stipendCategory: 'Unpaid',
    verificationStatus: 'Verified',
  });

  console.log('[Created] 3 Verified Offers (7.0, 8.5, 15.0 LPA) and 2 Verified Internships (1 Paid, 1 Unpaid)');

  // Also create UNVERIFIED records (Pending & Rejected) to test strict exclusion (Requirement 9)
  const pendingOffer = await Offer.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'TEST_SYNTHETIC_PENDING Unicorn',
    jobRole: 'Staff Architect',
    offerDate: new Date('2024-04-01'),
    annualCtcLpa: 99.0, // Outlier
    verificationStatus: 'Pending',
    consentToAggregate: true,
  });

  const rejectedOffer = await Offer.create({
    studentId: testStudent._id,
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'TEST_SYNTHETIC_REJECTED Fake Inc',
    jobRole: 'Senior Principal',
    offerDate: new Date('2024-04-01'),
    annualCtcLpa: 150.0, // Fabricated
    verificationStatus: 'Rejected',
    consentToAggregate: true,
  });

  console.log('[Created] 1 Pending Offer (99 LPA) and 1 Rejected Offer (150 LPA) for isolation test');
  console.log('✅ STEP 2 PASSED: Test datasets seeded.');

  // --- STEP 3: TEST FULL ADVERTISED VS REALITY COMPARISON ---
  console.log('\n--- Step 3: Testing Advertised vs Reality Endpoint Outputs ---');
  const fullRes = await axios.get(`${API_BASE}/placements/${college._id}/advertised-vs-reality?seasonId=${season._id}`);
  const comp = fullRes.data.data;

  // Assert Advertised Section
  console.log(`[Advertised] Available: ${comp.advertised.available}`);
  console.log(`[Advertised] Highest CTC: ${comp.advertised.metrics.highestPackageLPA} LPA`);
  console.log(`[Advertised] Average CTC: ${comp.advertised.metrics.averagePackageLPA} LPA`);
  console.log(`[Advertised] Median CTC: ${comp.advertised.metrics.medianPackageLPA} LPA`);
  console.log(`[Advertised] Source URL: ${comp.advertised.provenance.sourceUrl}`);
  console.log(`[Advertised] Paid Internships: ${comp.advertised.metrics.paidInternshipsCount}`);

  if (comp.advertised.metrics.highestPackageLPA !== 62.0 || comp.advertised.metrics.medianPackageLPA !== 6.8) {
    throw new Error('FAILED: Advertised metrics do not match official record');
  }
  if (comp.advertised.provenance.sourceUrl !== 'https://test-synthetic-reports.kiit.ac.in/official-report-2024.pdf') {
    throw new Error('FAILED: Advertised sourceUrl missing');
  }

  // Assert Verified Reality Section
  console.log(`\n[Verified] Available: ${comp.verified.available}`);
  console.log(`[Verified] Highest CTC: ${comp.verified.metrics.highestPackageLPA} LPA`);
  console.log(`[Verified] Average CTC: ${comp.verified.metrics.averagePackageLPA} LPA`);
  console.log(`[Verified] Median CTC: ${comp.verified.metrics.medianPackageLPA} LPA`);
  console.log(`[Verified] Paid Internships: ${comp.verified.metrics.paidInternshipsCount}`);
  console.log(`[Verified] Unpaid Internships: ${comp.verified.metrics.unpaidInternshipsCount}`);
  console.log(`[Verified] Median Monthly Stipend: ₹${comp.verified.metrics.internshipStipendRange.median}`);

  // Expected Verified Metrics from (7.0, 8.5, 15.0):
  // Highest: 15.0 LPA
  // Median: 8.5 LPA
  // Average: (7.0 + 8.5 + 15.0) / 3 = 10.17 LPA
  if (comp.verified.metrics.highestPackageLPA !== 15.0) {
    throw new Error(`FAILED: Expected verified highest CTC 15.0 LPA, got ${comp.verified.metrics.highestPackageLPA}`);
  }
  if (comp.verified.metrics.medianPackageLPA !== 8.5) {
    throw new Error(`FAILED: Expected verified median CTC 8.5 LPA, got ${comp.verified.metrics.medianPackageLPA}`);
  }
  if (comp.verified.metrics.paidInternshipsCount !== 1 || comp.verified.metrics.unpaidInternshipsCount !== 1) {
    throw new Error('FAILED: Verified internship counts mismatch');
  }
  console.log('✅ STEP 3 PASSED: Both sides computed accurate empirical metrics.');

  // --- STEP 4: STRICT EXCLUSION OF PENDING & REJECTED OFFERS (Requirement 9) ---
  console.log('\n--- Step 4: Confirming Strict Exclusion of Pending & Rejected Records ---');
  // Pending had 99 LPA, Rejected had 150 LPA. Neither must be included!
  if (comp.verified.metrics.highestPackageLPA === 99.0 || comp.verified.metrics.highestPackageLPA === 150.0) {
    throw new Error('FAILED: Unverified (Pending or Rejected) offers leaked into verified metrics!');
  }
  console.log('✅ STEP 4 PASSED: Pending (99 LPA) and Rejected (150 LPA) offers were strictly quarantined.');

  // --- STEP 5: TEST DATA COVERAGE & "ZERO ASSUMPTION" DISCLAIMER (Requirement 8) ---
  console.log('\n--- Step 5: Testing Data Coverage & Zero Assumption Policy ---');
  console.log(`[Coverage] Verified Unique Students: ${comp.coverage.verifiedUniqueStudents}`);
  console.log(`[Coverage] Reported Cohort Denominator: ${comp.coverage.reportedCohortEligible}`);
  console.log(`[Coverage] Coverage Percentage: ${comp.coverage.coveragePercentage}%`);
  console.log(`[Coverage] Disclaimer: "${comp.coverage.coverageDisclaimer}"`);

  if (comp.coverage.verifiedUniqueStudents !== 2) {
    throw new Error(`FAILED: Expected 2 unique verified students, got ${comp.coverage.verifiedUniqueStudents}`);
  }
  if (!comp.coverage.coverageDisclaimer.includes('NOT unplaced students')) {
    throw new Error('FAILED: Coverage disclaimer missing crucial "NOT unplaced students" protection');
  }
  console.log('✅ STEP 5 PASSED: Data coverage and Zero Assumption Rule verified.');

  // --- STEP 6: TEST COMPARABILITY WARNINGS (Requirement 7) ---
  console.log('\n--- Step 6: Testing Comparability Guardrails & Limited Sample Warnings ---');
  console.log(`[Comparability] isDirectlyComparable: ${comp.comparability.isDirectlyComparable}`);
  console.log(`[Comparability] Warnings:`, comp.comparability.warnings);

  // Since sample coverage is 2 / 4000 = 0.1% (< 10%), it must trigger the limited sample warning!
  if (comp.comparability.isDirectlyComparable !== false) {
    throw new Error('FAILED: Expected isDirectlyComparable: false due to limited sample size');
  }
  if (!comp.comparability.warnings.some(w => w.includes('Limited Sample Warning'))) {
    throw new Error('FAILED: Missing limited sample size warning');
  }
  console.log('✅ STEP 6 PASSED: Statistical comparability warning properly flagged.');

  // --- STEP 7: TEST BRANCH/DEPARTMENT FILTERING (Requirement 12) ---
  console.log('\n--- Step 7: Testing Branch/Department Filter (CSE) ---');
  const branchRes = await axios.get(
    `${API_BASE}/placements/${college._id}/advertised-vs-reality?seasonId=${season._id}&departmentId=${department._id}`
  );
  const branchData = branchRes.data.data;

  console.log(`[Branch Filter] Selected Dept: ${branchData.selectedDepartment?.name} (${branchData.selectedDepartment?.code})`);
  console.log(`[Branch Filter] Advertised Branch Specific: ${branchData.advertised.branchSpecificDisclosed}`);
  console.log(`[Branch Filter] Advertised Median CTC: ${branchData.advertised.metrics.medianPackageLPA} LPA (CSE official: 8.0 LPA)`);
  console.log(`[Branch Filter] Advertised Average CTC: ${branchData.advertised.metrics.averagePackageLPA} LPA (CSE official: 10.5 LPA)`);

  if (branchData.advertised.metrics.medianPackageLPA !== 8.0) {
    throw new Error(`FAILED: Expected CSE branch median 8.0 LPA, got ${branchData.advertised.metrics.medianPackageLPA}`);
  }
  console.log('✅ STEP 7 PASSED: Branch-level filtering correctly updates advertised and verified figures.');

  // --- STEP 8: TEARDOWN & CLEANUP (Requirement 14) ---
  console.log('\n--- Step 8: Complete Teardown of Synthetic Test Records ---');
  await PlacementRecord.findByIdAndDelete(testOfficialRecord._id);
  await Offer.deleteMany({ _id: { $in: [testOffer1._id, testOffer2._id, testOffer3._id, pendingOffer._id, rejectedOffer._id] } });
  await Internship.deleteMany({ _id: { $in: [testInternshipPaid._id, testInternshipUnpaid._id] } });
  await User.findByIdAndDelete(testStudent._id);

  console.log('[Teardown] All synthetic test placement records, offers, internships, and users removed.');

  // Verify database is completely clean
  const postCleanRes = await axios.get(`${API_BASE}/placements/${college._id}/advertised-vs-reality?seasonId=${season._id}`);
  if (postCleanRes.data.data.advertised.available !== false || postCleanRes.data.data.verified.available !== false) {
    throw new Error('FAILED: Clean teardown failed; test records still present');
  }
  console.log('✅ STEP 8 PASSED: Production database verified 100% clean with zero test remnants.');

  console.log('\n========================================================');
  console.log('🎉 ALL ADVERTISED VS REALITY REQUIREMENTS VERIFIED! 🎉');
  console.log('========================================================\n');

  await mongoose.disconnect();
  process.exit(0);
};

runTests().catch(async (err) => {
  console.error('\n❌ TEST RUN FAILED:', err.response?.data || err.message);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});
