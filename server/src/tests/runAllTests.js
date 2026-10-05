require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
require('../models'); // Register all Mongoose models
const {
  calculateMedian,
  calculateAverage,
  calculatePlacementRate,
  calculateSalaryDistribution,
  calculateDataQualityIndicators,
} = require('../utils/calculateMetrics');
const { checkOfferDuplicate } = require('../services/duplicateDetectionService');
const User = require('../models/User');
const College = require('../models/College');
const Offer = require('../models/Offer');
const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const Department = require('../models/Department');
const { signToken, verifyToken } = require('../utils/jwt');
const { getCollegeSeasonAnalytics } = require('../services/analyticsService');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   PLACEMENT REALITY TEST SUITE - BACKEND & ANALYTICS');
  console.log('====================================================\n');

  // TEST SUITE 1: Analytics & Mathematical Truth
  console.log('[Test Suite 1: Analytics & Metrics Engine]');
  const oddSalaries = [4.5, 6.0, 8.5, 12.0, 44.0];
  const evenSalaries = [4.0, 6.0, 8.0, 10.0];
  assert(calculateMedian(oddSalaries) === 8.5, 'Median of odd numbers (8.5 LPA)');
  assert(calculateMedian(evenSalaries) === 7.0, 'Median of even numbers (7.0 LPA)');
  assert(calculateAverage([10, 20, 30]) === 20.0, 'Average calculation (20.0)');
  assert(calculateMedian([]) === null, 'Empty array returns null, never 0');

  // Denominator Rule: Never manufacture percentage if denominator undisclosed
  const rateWithDenominator = calculatePlacementRate(90, 100);
  assert(rateWithDenominator.canCalculate === true && rateWithDenominator.percentage === 90.0, 'Calculates placement rate when denominator is disclosed (90%)');

  const rateWithoutDenominator = calculatePlacementRate(90, null);
  assert(rateWithoutDenominator.canCalculate === false && rateWithoutDenominator.percentage === null, 'Refuses to calculate placement rate when denominator is null/undisclosed');

  const rateWithZeroDenominator = calculatePlacementRate(90, 0);
  assert(rateWithZeroDenominator.canCalculate === false, 'Refuses to calculate placement rate when denominator is 0');

  // Salary distribution bucketing
  const buckets = calculateSalaryDistribution([3.5, 6.0, 7.5, 12.0, 18.0, 50.0]);
  assert(buckets.find(b => b.rangeLabel === '< 4 LPA').offerCount === 1, 'Salary bucketing: < 4 LPA correctly counts 1');
  assert(buckets.find(b => b.rangeLabel === '4 - 8 LPA').offerCount === 2, 'Salary bucketing: 4 - 8 LPA correctly counts 2');
  assert(buckets.find(b => b.rangeLabel === '25+ LPA').offerCount === 1, 'Salary bucketing: 25+ LPA correctly counts 1');

  // Data Quality Indicators
  const highQuality = calculateDataQualityIndicators({
    hasOfficialReport: true,
    hasEligibleDenominator: true,
    hasMedianDisclosure: true,
    hasBranchWiseBreakdown: true,
    verifiedStudentSubmissionsCount: 12,
  });
  assert(highQuality.score >= 80 && highQuality.tier === 'High Transparency', 'Data quality score reaches High Transparency tier when all sources corroborated');

  const lowQuality = calculateDataQualityIndicators({
    hasOfficialReport: false,
    hasEligibleDenominator: false,
    hasMedianDisclosure: false,
  });
  assert(lowQuality.score < 50 && lowQuality.tier === 'Partial / Unverified', 'Data quality identifies unverified/undisclosed records');

  // TEST SUITE 2: Security & Authentication
  console.log('\n[Test Suite 2: Security & Token Auth]');
  const payload = { id: '65f123456789012345678901', role: 'student' };
  const token = signToken(payload);
  assert(typeof token === 'string' && token.length > 20, 'JWT Token generated successfully');
  const decoded = verifyToken(token);
  assert(decoded.id === payload.id && decoded.role === 'student', 'JWT Token verified successfully');

  // Connect to DB for integration tests
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('\n[Test Suite 3: Database & Integration Verification]');

  // Check KIIT and VIT exist
  const kiit = await College.findOne({ shortName: 'KIIT' });
  const vit = await College.findOne({ shortName: 'VIT' });
  assert(Boolean(kiit), 'KIIT College record found in DB');
  assert(Boolean(vit), 'VIT College record found in DB');
  assert(kiit.tierClassification.tier === 'Tier 2', 'College tier is defined as editable platform classification');

  // Test Analytics Service against real seed data
  const kiitSeason = await PlacementSeason.findOne({ collegeId: kiit._id, academicYear: '2023-2024' });
  const kiitAnalytics = await getCollegeSeasonAnalytics(kiit._id, kiitSeason._id);
  assert(kiitAnalytics.headlineStats.uniqueStudentsPlaced === 3950, 'Unique placed students matches official ground-truth (3950)');
  assert(kiitAnalytics.headlineStats.totalJobOffers === 5200, 'Total job offers distinct from unique students (5200 vs 3950)');
  assert(kiitAnalytics.headlineStats.placementRate.canCalculate === true, 'KIIT has disclosed denominator: placement rate calculated');

  const vitSeason = await PlacementSeason.findOne({ collegeId: vit._id, academicYear: '2023-2024' });
  const vitAnalytics = await getCollegeSeasonAnalytics(vit._id, vitSeason._id);
  assert(vitAnalytics.headlineStats.placementRate.canCalculate === false, 'VIT has undisclosed denominator: placement rate correctly withheld with notice');

  // TEST SUITE 4: Duplicate Submission Detection
  console.log('\n[Test Suite 4: Duplicate Offer Detection]');
  const student = (await User.findOne({ email: 'student.rahul@kiit.ac.in' })) || (await User.findOne({ role: 'student' }));
  
  const dept = await Department.findOne({ collegeId: kiit._id });
  const tempOffer = await Offer.create({
    studentId: student._id,
    collegeId: kiit._id,
    departmentId: dept?._id || student.departmentId,
    graduationYear: 2024,
    offerDate: new Date(),
    seasonId: kiitSeason._id,
    companyName: 'HighRadius',
    jobRole: 'Associate Software Engineer',
    annualCtcLpa: 8.5,
    status: 'pending',
  });

  // Duplicate check for company already submitted by this student in this season
  const dupCheck1 = await checkOfferDuplicate({
    studentId: student._id,
    companyName: 'HighRadius',
    jobRole: 'Associate Software Engineer',
    seasonId: kiitSeason._id,
    annualCtcLpa: 8.5,
  });
  assert(dupCheck1.isDuplicate === true, 'Correctly flags hard duplicate for existing company submission in same season');

  const dupCheck2 = await checkOfferDuplicate({
    studentId: student._id,
    companyName: 'New Unique Company Inc',
    jobRole: 'Backend Engineer',
    seasonId: kiitSeason._id,
    annualCtcLpa: 14.0,
  });
  assert(dupCheck2.isDuplicate === false, 'Allows valid non-duplicate offer submission');

  await Offer.findByIdAndDelete(tempOffer._id);

  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
