const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const College = require('../models/College');
const Department = require('../models/Department');
const Offer = require('../models/Offer');
const PlacementSeason = require('../models/PlacementSeason');
const User = require('../models/User');
const {
  calculatePlacementStatistics,
  syncCollegeStudentVerifiedStats,
} = require('../services/studentVerifiedAggregationService');

async function runTests() {
  console.log('--- STARTING LIVE STUDENT PLACEMENT AGGREGATION & AUTO-UPDATE ENGINE TESTS ---');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not configured. Skipping live database tests.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  let testCollege = null;
  let testDepartment = null;
  let season2026 = null;
  let season2025 = null;
  let testStudent1 = null;
  let testStudent2 = null;
  const createdStudents = [];
  const createdOfferIds = [];

  try {
    // 1. Setup Test College and Placement Seasons
    const testSlug = `test-agg-college-${Date.now()}`;
    testCollege = await College.create({
      name: 'Test Engineering Institute of Technology',
      shortName: 'TEIT',
      slug: testSlug,
      city: 'Bhubaneswar',
      state: 'Odisha',
      campusType: 'Private University',
      establishedYear: 2010,
      institutionCategory: {
        category: 'Category B: Private',
        subCategory: 'Private University',
      },
    });

    testDepartment = await Department.create({
      collegeId: testCollege._id,
      name: 'Computer Science and Engineering',
      code: 'CSE',
    });

    season2026 = await PlacementSeason.create({
      collegeId: testCollege._id,
      academicYear: '2026-2027',
      isCurrentSeason: true,
      seasonStatus: 'Ongoing',
    });

    season2025 = await PlacementSeason.create({
      collegeId: testCollege._id,
      academicYear: '2025-2026',
      isCurrentSeason: false,
      seasonStatus: 'Concluded',
    });

    // Setup Test Students
    testStudent1 = await User.create({
      name: 'Test Student Alpha',
      email: `student.alpha.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_dummy',
      role: 'student',
      collegeId: testCollege._id,
    });

    testStudent2 = await User.create({
      name: 'Test Student Beta',
      email: `student.beta.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_dummy',
      role: 'student',
      collegeId: testCollege._id,
    });

    console.log(`Setup completed. College ID: ${testCollege._id}, Season 2026: ${season2026._id}`);

    // =========================================================================
    // TEST 1: EMPTY STATE
    // =========================================================================
    console.log('\n--- TEST 1: Initial Empty State (Zero verified submissions) ---');
    const emptyStats = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2026._id,
    });

    console.log('Empty state result:', {
      hasEnoughData: emptyStats.hasEnoughData,
      emptyStateMessage: emptyStats.emptyStateMessage,
      verifiedStudentOutcomes: emptyStats.verifiedStudentOutcomes,
      verifiedMedianPackageLPA: emptyStats.verifiedMedianPackageLPA,
      verifiedAveragePackageLPA: emptyStats.verifiedAveragePackageLPA,
    });

    if (
      emptyStats.hasEnoughData === false &&
      emptyStats.emptyStateMessage === 'Not enough verified student data yet.' &&
      emptyStats.verifiedStudentOutcomes === 0 &&
      emptyStats.verifiedMedianPackageLPA === null &&
      emptyStats.verifiedAveragePackageLPA === null
    ) {
      console.log('✅ TEST 1 PASSED: Clean empty state without fabricated or hardcoded numbers.');
    } else {
      throw new Error(`TEST 1 FAILED: Expected clean empty state, got ${JSON.stringify(emptyStats)}`);
    }

    // =========================================================================
    // TEST 2: 5 APPROVED OFFERS (4.0, 4.1, 5.0, 6.5, 8.0 LPA)
    // =========================================================================
    console.log('\n--- TEST 2: Ingest 5 Approved Offers ---');
    const testPackages = [4.0, 4.1, 5.0, 6.5, 8.0];

    for (let i = 0; i < testPackages.length; i++) {
      const student = await User.create({
        name: `Cohort Student ${i + 1}`,
        email: `cohort.student.${i + 1}.${Date.now()}@example.com`,
        passwordHash: 'dummy',
        role: 'student',
        collegeId: testCollege._id,
      });
      createdStudents.push(student);

      const offer = await Offer.create({
        studentId: student._id,
        collegeId: testCollege._id,
        departmentId: testDepartment._id,
        seasonId: season2026._id,
        graduationYear: 2026,
        companyName: `Company ${i + 1}`,
        jobRole: 'Software Engineer',
        offerDate: new Date('2026-02-15'),
        annualCtcLpa: testPackages[i],
        verificationStatus: 'Verified',
        submissionStage: 'VERIFIED',
        isPublished: true,
        consentToAggregate: true,
      });
      createdOfferIds.push(offer._id);
    }

    const fiveStats = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2026._id,
    });

    console.log('5 Offers stats result:', {
      verifiedStudentOutcomes: fiveStats.verifiedStudentOutcomes,
      verifiedPackageRecords: fiveStats.verifiedPackageRecords,
      verifiedAveragePackageLPA: fiveStats.verifiedAveragePackageLPA,
      verifiedMedianPackageLPA: fiveStats.verifiedMedianPackageLPA,
      verifiedHighestPackageLPA: fiveStats.verifiedHighestPackageLPA,
      verifiedLowestPackageLPA: fiveStats.verifiedLowestPackageLPA,
    });

    // Expected:
    // Avg = (4.0 + 4.1 + 5.0 + 6.5 + 8.0) / 5 = 27.6 / 5 = 5.52
    // Median = sorted [4.0, 4.1, 5.0, 6.5, 8.0] -> index 2 = 5.00
    // Max = 8.0, Min = 4.0
    if (
      fiveStats.verifiedStudentOutcomes === 5 &&
      fiveStats.verifiedPackageRecords === 5 &&
      Math.abs(fiveStats.verifiedAveragePackageLPA - 5.52) < 0.001 &&
      Math.abs(fiveStats.verifiedMedianPackageLPA - 5.0) < 0.001 &&
      fiveStats.verifiedHighestPackageLPA === 8.0 &&
      fiveStats.verifiedLowestPackageLPA === 4.0
    ) {
      console.log('✅ TEST 2 PASSED: 5-offer metrics calculated with floating-point precision.');
    } else {
      throw new Error(`TEST 2 FAILED: Expected Avg=5.52, Med=5.00, got Avg=${fiveStats.verifiedAveragePackageLPA}, Med=${fiveStats.verifiedMedianPackageLPA}`);
    }

    // =========================================================================
    // TEST 3: 6TH OFFER (10.75 LPA - EVEN COUNT MEDIAN)
    // =========================================================================
    console.log('\n--- TEST 3: Ingest 6th Offer (10.75 LPA) to test even-length median ---');
    const student6 = await User.create({
      name: 'Cohort Student 6',
      email: `cohort.student.6.${Date.now()}@example.com`,
      passwordHash: 'dummy',
      role: 'student',
      collegeId: testCollege._id,
    });
    createdStudents.push(student6);

    const offer6 = await Offer.create({
      studentId: student6._id,
      collegeId: testCollege._id,
      departmentId: testDepartment._id,
      seasonId: season2026._id,
      graduationYear: 2026,
      companyName: 'FinTech Corp',
      jobRole: 'SDE-1',
      offerDate: new Date('2026-03-01'),
      annualCtcLpa: 10.75,
      verificationStatus: 'Verified',
      submissionStage: 'VERIFIED',
      isPublished: true,
      consentToAggregate: true,
    });
    createdOfferIds.push(offer6._id);

    const sixStats = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2026._id,
    });

    console.log('6 Offers stats result:', {
      verifiedStudentOutcomes: sixStats.verifiedStudentOutcomes,
      verifiedPackageRecords: sixStats.verifiedPackageRecords,
      verifiedAveragePackageLPA: sixStats.verifiedAveragePackageLPA,
      verifiedMedianPackageLPA: sixStats.verifiedMedianPackageLPA,
      verifiedHighestPackageLPA: sixStats.verifiedHighestPackageLPA,
      verifiedLowestPackageLPA: sixStats.verifiedLowestPackageLPA,
    });

    // Expected:
    // Avg = (4.0 + 4.1 + 5.0 + 6.5 + 8.0 + 10.75) / 6 = 38.35 / 6 = 6.391666... -> 6.39
    // Median = sorted [4.0, 4.1, 5.0, 6.5, 8.0, 10.75] -> (5.0 + 6.5) / 2 = 5.75
    // Max = 10.75, Min = 4.0
    if (
      sixStats.verifiedStudentOutcomes === 6 &&
      sixStats.verifiedPackageRecords === 6 &&
      Math.abs(sixStats.verifiedAveragePackageLPA - 6.39) < 0.01 &&
      Math.abs(sixStats.verifiedMedianPackageLPA - 5.75) < 0.001 &&
      sixStats.verifiedHighestPackageLPA === 10.75 &&
      sixStats.verifiedLowestPackageLPA === 4.0
    ) {
      console.log('✅ TEST 3 PASSED: Even-length median and floating-point average calculated correctly.');
    } else {
      throw new Error(`TEST 3 FAILED: Expected Avg=6.39, Med=5.75, Max=10.75, got ${JSON.stringify(sixStats)}`);
    }

    // =========================================================================
    // TEST 4: DUPLICATE STUDENT PROTECTION (Multiple offers for Student 6)
    // =========================================================================
    console.log('\n--- TEST 4: Student 6 receives 2nd offer (Accenture @ 12.0 LPA) ---');
    const offer6Second = await Offer.create({
      studentId: student6._id, // SAME student
      collegeId: testCollege._id,
      departmentId: testDepartment._id,
      seasonId: season2026._id,
      graduationYear: 2026,
      companyName: 'Accenture Tech',
      jobRole: 'Associate Software Engineer',
      offerDate: new Date('2026-03-10'),
      annualCtcLpa: 12.0,
      verificationStatus: 'Verified',
      submissionStage: 'VERIFIED',
      isPublished: true,
      consentToAggregate: true,
    });
    createdOfferIds.push(offer6Second._id);

    const dupStats = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2026._id,
    });

    console.log('Duplicate check stats result:', {
      uniqueStudentOutcomes: dupStats.verifiedStudentOutcomes,
      totalPackageRecords: dupStats.verifiedPackageRecords,
      verifiedMedianPackageLPA: dupStats.verifiedMedianPackageLPA,
      verifiedHighestPackageLPA: dupStats.verifiedHighestPackageLPA,
    });

    // Expected:
    // Unique students: stays 6! (Student 6 is not double-counted)
    // Total package records: 7
    // Sorted packages: [4.0, 4.1, 5.0, 6.5, 8.0, 10.75, 12.0] -> median (index 3) = 6.50
    // Highest: 12.0
    if (
      dupStats.verifiedStudentOutcomes === 6 &&
      dupStats.verifiedPackageRecords === 7 &&
      Math.abs(dupStats.verifiedMedianPackageLPA - 6.50) < 0.001 &&
      dupStats.verifiedHighestPackageLPA === 12.0
    ) {
      console.log('✅ TEST 4 PASSED: Student de-duplication preserved unique count = 6, package records = 7.');
    } else {
      throw new Error(`TEST 4 FAILED: Expected Outcomes=6, Packages=7, Med=6.50, got ${JSON.stringify(dupStats)}`);
    }

    // =========================================================================
    // TEST 5: SUBMISSION LIFECYCLE (Unpublish & Soft Delete)
    // =========================================================================
    console.log('\n--- TEST 5: Unpublish Offer 1 (4.0 LPA) & Check Immediate Recalculation ---');
    const offer1Id = createdOfferIds[0];
    await Offer.findByIdAndUpdate(offer1Id, {
      isPublished: false,
      verificationStatus: 'Unpublished',
    });

    const unpublishStats = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2026._id,
    });

    console.log('Unpublish result:', {
      verifiedPackageRecords: unpublishStats.verifiedPackageRecords,
      verifiedLowestPackageLPA: unpublishStats.verifiedLowestPackageLPA,
    });

    // 4.0 LPA is now excluded. Lowest package must become 4.10 LPA!
    if (
      unpublishStats.verifiedPackageRecords === 6 &&
      unpublishStats.verifiedLowestPackageLPA === 4.1
    ) {
      console.log('✅ TEST 5 PASSED: Unpublished offer was immediately removed from live calculation; lowest package updated to 4.1 LPA.');
    } else {
      throw new Error(`TEST 5 FAILED: Expected lowest=4.1, got ${unpublishStats.verifiedLowestPackageLPA}`);
    }

    // =========================================================================
    // TEST 6: ACADEMIC SESSION ISOLATION
    // =========================================================================
    console.log('\n--- TEST 6: Academic Session Isolation (Querying Season 2025-2026) ---');
    const stats2025 = await calculatePlacementStatistics({
      collegeId: testCollege._id,
      seasonId: season2025._id,
    });

    console.log('Season 2025 result:', {
      hasEnoughData: stats2025.hasEnoughData,
      verifiedStudentOutcomes: stats2025.verifiedStudentOutcomes,
      emptyStateMessage: stats2025.emptyStateMessage,
    });

    // Submissions in 2026 must NEVER bleed into 2025!
    if (
      stats2025.hasEnoughData === false &&
      stats2025.verifiedStudentOutcomes === 0 &&
      stats2025.emptyStateMessage === 'Not enough verified student data yet.'
    ) {
      console.log('✅ TEST 6 PASSED: Strict academic session isolation verified. 2026-27 records did not bleed into 2025-26.');
    } else {
      throw new Error(`TEST 6 FAILED: Session leakage detected! Got ${JSON.stringify(stats2025)}`);
    }

    // =========================================================================
    // TEST 7: SYNCHRONIZATION WITH COLLEGE DOCUMENT & SESSION REPORT
    // =========================================================================
    console.log('\n--- TEST 7: syncCollegeStudentVerifiedStats Persistence ---');
    await syncCollegeStudentVerifiedStats(testCollege._id, season2026._id);
    const updatedCollege = await College.findById(testCollege._id);

    console.log('Synced college stats in DB:', {
      verifiedStudentOutcomes: updatedCollege.studentVerifiedStats?.verifiedStudentOutcomes,
      medianPackageLPA: updatedCollege.studentVerifiedStats?.medianPackageLPA,
      averagePackageLPA: updatedCollege.studentVerifiedStats?.averagePackageLPA,
      lowestPackageLPA: updatedCollege.studentVerifiedStats?.lowestPackageLPA,
      highestPackageLPA: updatedCollege.studentVerifiedStats?.highestPackageLPA,
    });

    if (
      updatedCollege.studentVerifiedStats?.verifiedStudentOutcomes === unpublishStats.verifiedStudentOutcomes &&
      updatedCollege.studentVerifiedStats?.lowestPackageLPA === 4.1
    ) {
      console.log('✅ TEST 7 PASSED: College model studentVerifiedStats successfully persisted and synchronized.');
    } else {
      throw new Error('TEST 7 FAILED: College studentVerifiedStats did not update properly.');
    }

    console.log('\n=============================================================');
    console.log('🎉 ALL 7 LIVE AGGREGATION & AUTO-UPDATE ENGINE TESTS PASSED!');
    console.log('=============================================================');
  } finally {
    // Cleanup test artifacts
    console.log('\nCleaning up test artifacts...');
    if (createdOfferIds.length > 0) {
      await Offer.deleteMany({ _id: { $in: createdOfferIds } });
    }
    if (createdStudents.length > 0) {
      const studentIds = createdStudents.map((s) => s._id);
      await User.deleteMany({ _id: { $in: studentIds } });
    }
    if (testDepartment) {
      await Department.deleteOne({ _id: testDepartment._id });
    }
    if (testCollege) {
      await College.deleteOne({ _id: testCollege._id });
    }
    if (season2026) {
      await PlacementSeason.deleteOne({ _id: season2026._id });
    }
    if (season2025) {
      await PlacementSeason.deleteOne({ _id: season2025._id });
    }
    if (testStudent1) {
      await User.deleteOne({ _id: testStudent1._id });
    }
    if (testStudent2) {
      await User.deleteOne({ _id: testStudent2._id });
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
