require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('====================================================');
  console.log('   STRICT DATA VERIFICATION END-TO-END TEST SUITE   ');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('[DB] Connected to MongoDB');

  const College = require('../models/College');
  const PlacementSeason = require('../models/PlacementSeason');
  const Department = require('../models/Department');
  const User = require('../models/User');

  const college = await College.findOne({ shortName: 'KIIT' });
  if (!college) throw new Error('KIIT college record not found');
  const season = await PlacementSeason.findOne({ collegeId: college._id, academicYear: '2023-2024' });
  if (!season) throw new Error('Season not found');
  const department = await Department.findOne({ collegeId: college._id, code: 'CSE' });
  if (!department) throw new Error('CSE department not found');

  console.log(`[Setup] Target College: ${college.name} (${college._id})`);
  console.log(`[Setup] Target Season: ${season.academicYear} (${season._id})`);

  // --- STEP 1: TEST EMPTY DATABASE BEHAVIOR ---
  console.log('\n--- Step 1: Testing Empty Database / Zero Synthetic Data Behavior ---');
  
  // 1a. Placement Season Analytics
  const analyticsRes = await axios.get(`${API_BASE}/placements/${college._id}/seasons/${season._id}`);
  console.log(`[API] GET /placements/.../seasons/... -> status: ${analyticsRes.status}`);
  console.log(`[Check] hasVerifiedData: ${analyticsRes.data.data.hasVerifiedData}`);
  console.log(`[Check] message: "${analyticsRes.data.data.message}"`);
  if (analyticsRes.data.data.hasVerifiedData !== false) {
    throw new Error('FAILED: Expected hasVerifiedData: false on empty verified DB');
  }
  if (!analyticsRes.data.data.message.includes('No verified placement data available yet')) {
    throw new Error('FAILED: Expected empty state message');
  }

  // 1b. Public Internships
  const internshipsRes = await axios.get(`${API_BASE}/internships?collegeId=${college._id}`);
  console.log(`[API] GET /internships -> count: ${internshipsRes.data.data.internships.length}`);
  if (internshipsRes.data.data.internships.length !== 0) {
    throw new Error('FAILED: Expected 0 public internships when unverified');
  }

  // 1c. Internship Analytics
  const internAnalyticsRes = await axios.get(`${API_BASE}/internships/analytics/${college._id}`);
  console.log(`[API] GET /internships/analytics/... -> hasVerifiedData: ${internAnalyticsRes.data.data.hasVerifiedData}`);
  if (internAnalyticsRes.data.data.hasVerifiedData !== false) {
    throw new Error('FAILED: Expected hasVerifiedData: false on empty verified internships');
  }

  // 1d. Public Offers
  const publicOffersRes = await axios.get(`${API_BASE}/offers/college/${college._id}`);
  console.log(`[API] GET /offers/college/... -> count: ${publicOffersRes.data.data.offers.length}`);
  if (publicOffersRes.data.data.offers.length !== 0) {
    throw new Error('FAILED: Expected 0 public offers when unverified');
  }
  console.log('✅ STEP 1 PASSED: Strict empty database behavior confirmed.');

  // --- STEP 2: AUTHENTICATION TOKENS ---
  console.log('\n--- Step 2: Logging in Moderator & Registering Test Student ---');
  // Moderator login
  const modLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'moderator@placementreality.org',
    password: 'ModPass123!',
  });
  const modToken = modLoginRes.data.data.token;
  console.log(`[Auth] Moderator logged in: ${modLoginRes.data.data.user.role}`);

  // Register Student
  const studentEmail = `verify_student_${Date.now()}@kiit.ac.in`;
  const studentRegRes = await axios.post(`${API_BASE}/auth/register`, {
    name: 'Test Evidence Submitter',
    email: studentEmail,
    password: 'Password123!',
    role: 'student',
    collegeId: college._id,
    departmentId: department._id,
    graduationYear: 2024,
    privacyConsent: true,
  });
  const studentToken = studentRegRes.data.data.token;
  const studentUser = studentRegRes.data.data.user;
  console.log(`[Auth] Test student registered: ${studentEmail}`);
  console.log('✅ STEP 2 PASSED: Authentication verified.');

  // --- STEP 3: STUDENT SUBMITS OFFER & INTERNSHIP (PENDING STATUS) ---
  console.log('\n--- Step 3: Student Submits Offer & Internship with Pending Status ---');
  
  // Submit Offer
  const offerPayload = {
    collegeId: college._id,
    departmentId: department._id,
    seasonId: season._id,
    graduationYear: 2024,
    companyName: 'Acme Test Corp',
    jobRole: 'Software Developer',
    offerDate: '2024-03-01',
    annualCtcLpa: 12.5,
    fixedCompensationLpa: 10.0,
    variableCompensationLpa: 2.5,
    offerType: 'On-Campus Full-Time',
    acceptedOffer: 'Yes',
    joinedCompany: 'Yes',
    consentToAggregate: true,
  };
  const submitOfferRes = await axios.post(`${API_BASE}/offers`, offerPayload, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const createdOffer = submitOfferRes.data.data.offer;
  console.log(`[Offer] Submitted: ${createdOffer.companyName} (${createdOffer.annualCtcLpa} LPA)`);
  console.log(`[Offer] Verification Status: ${createdOffer.verificationStatus}`);
  if (!['Pending', 'Under review'].includes(createdOffer.verificationStatus)) {
    throw new Error('FAILED: Expected initial offer status to be Pending or Under review');
  }

  // Submit Internship
  const internPayload = {
    collegeId: college._id,
    departmentId: department._id,
    companyName: 'Acme Intern Labs',
    internshipRole: 'Cloud Intern',
    internshipPeriodMonths: 3,
    startMonthYear: 'May 2023',
    endMonthYear: 'Aug 2023',
    monthlyStipendInr: 30000,
    stipendCategory: 'Paid',
    workMode: 'In-Office',
    ppoConversion: 'Offered',
  };
  const submitInternRes = await axios.post(`${API_BASE}/internships`, internPayload, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const createdIntern = submitInternRes.data.data.internship;
  console.log(`[Internship] Submitted: ${createdIntern.companyName}`);
  console.log(`[Internship] Verification Status: ${createdIntern.verificationStatus}`);
  if (!['Pending', 'Under review'].includes(createdIntern.verificationStatus)) {
    throw new Error('FAILED: Expected initial internship status to be Pending or Under review');
  }

  // Verify Student can see their own submissions privately
  const myOffersRes = await axios.get(`${API_BASE}/offers/my-offers`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[Student] GET /offers/my-offers count: ${myOffersRes.data.data.offers.length}`);
  if (myOffersRes.data.data.offers.length !== 1) {
    throw new Error('FAILED: Expected student to see their own submitted offer');
  }

  const myInternsRes = await axios.get(`${API_BASE}/internships/my-internships`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`[Student] GET /internships/my-internships count: ${myInternsRes.data.data.internships.length}`);
  if (myInternsRes.data.data.internships.length !== 1) {
    throw new Error('FAILED: Expected student to see their own submitted internship');
  }
  console.log('✅ STEP 3 PASSED: Student submissions stored privately with Pending status.');

  // --- STEP 4: PUBLIC INVISIBILITY OF PENDING RECORDS ---
  console.log('\n--- Step 4: Verifying Pending Submissions Are INVISIBLE to Public APIs ---');
  const publicOffersCheck = await axios.get(`${API_BASE}/offers/college/${college._id}`);
  if (publicOffersCheck.data.data.offers.length !== 0) {
    throw new Error('FAILED: Public API exposed unverified offer!');
  }

  const publicInternsCheck = await axios.get(`${API_BASE}/internships?collegeId=${college._id}`);
  if (publicInternsCheck.data.data.internships.length !== 0) {
    throw new Error('FAILED: Public API exposed unverified internship!');
  }
  console.log('✅ STEP 4 PASSED: Public APIs strictly hide pending submissions.');

  // --- STEP 5: MODERATOR REVIEW & REJECTION FLOW ---
  console.log('\n--- Step 5: Moderator Reviews & Rejects Internship with Reason ---');
  const rejectReason = 'Uploaded certificate lacked official company authorized seal.';
  const rejectInternRes = await axios.put(
    `${API_BASE}/admin/internships/${createdIntern._id}/verify`,
    {
      status: 'Rejected',
      rejectionReason: rejectReason,
    },
    { headers: { Authorization: `Bearer ${modToken}` } }
  );
  console.log(`[Moderation] Rejected internship: ${rejectInternRes.data.data.internship.verificationStatus}`);
  console.log(`[Moderation] Saved rejection reason: "${rejectInternRes.data.data.internship.rejectionReason}"`);
  if (rejectInternRes.data.data.internship.verificationStatus !== 'Rejected') {
    throw new Error('FAILED: Expected internship status to be Rejected');
  }
  if (rejectInternRes.data.data.internship.rejectionReason !== rejectReason) {
    throw new Error('FAILED: Rejection reason not saved properly');
  }

  // Student checks my-internships and sees rejection reason
  const studentInternCheck = await axios.get(`${API_BASE}/internships/my-internships`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myRejected = studentInternCheck.data.data.internships.find(i => i._id === createdIntern._id);
  console.log(`[Student View] Internship status: ${myRejected.verificationStatus}, Reason: "${myRejected.rejectionReason}"`);
  if (myRejected.verificationStatus !== 'Rejected' || myRejected.rejectionReason !== rejectReason) {
    throw new Error('FAILED: Student view did not reflect rejection reason');
  }

  // Ensure still hidden publicly
  const publicInternsCheck2 = await axios.get(`${API_BASE}/internships?collegeId=${college._id}`);
  if (publicInternsCheck2.data.data.internships.length !== 0) {
    throw new Error('FAILED: Rejected internship was exposed publicly!');
  }
  console.log('✅ STEP 5 PASSED: Rejection flow and reason documentation verified.');

  // --- STEP 6: MODERATOR APPROVAL FLOW ---
  console.log('\n--- Step 6: Moderator Approves Offer -> Public Visibility Activated ---');
  const approveOfferRes = await axios.put(
    `${API_BASE}/offers/${createdOffer._id}/verify`,
    {
      status: 'Verified',
      moderatorNotes: 'Offer letter salary and candidate roll number verified.',
    },
    { headers: { Authorization: `Bearer ${modToken}` } }
  );
  console.log(`[Moderation] Offer marked as: ${approveOfferRes.data.data.offer.verificationStatus}`);

  // Now check public offers API
  const publicOffersAfterApproval = await axios.get(`${API_BASE}/offers/college/${college._id}`);
  console.log(`[Public API] GET /offers/college/... count: ${publicOffersAfterApproval.data.data.offers.length}`);
  if (publicOffersAfterApproval.data.data.offers.length !== 1) {
    throw new Error('FAILED: Approved offer not visible in public API');
  }
  const publishedOffer = publicOffersAfterApproval.data.data.offers[0];
  console.log(`[Public Offer] Company: ${publishedOffer.companyName}, CTC: ${publishedOffer.annualCtcLpa} LPA`);
  if (publishedOffer.studentId) {
    throw new Error('FAILED: Student PII leaked in public offer response!');
  }

  // Check Placement Analytics: Now hasVerifiedData should be TRUE!
  const analyticsAfterApproval = await axios.get(`${API_BASE}/placements/${college._id}/seasons/${season._id}`);
  console.log(`[Analytics] hasVerifiedData: ${analyticsAfterApproval.data.data.hasVerifiedData}`);
  console.log(`[Analytics] Headline median CTC: ${analyticsAfterApproval.data.data.headlineStats?.medianPackageLPA} LPA`);
  if (!analyticsAfterApproval.data.data.hasVerifiedData) {
    throw new Error('FAILED: Expected analytics hasVerifiedData: true after verified offer');
  }
  console.log('✅ STEP 6 PASSED: Moderator approval and public visibility verified with strict privacy.');

  // --- STEP 7: ADMIN OFFICIAL REPORT IMPORT ---
  console.log('\n--- Step 7: Admin Official Report Import (Requires Verification) ---');
  // Admin Login
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@placementreality.org',
    password: 'AdminPass123!',
  });
  const adminToken = adminLoginRes.data.data.token;

  const importPayload = {
    collegeId: college._id,
    seasonId: season._id,
    reportingYear: '2023-2024',
    sourceUrl: 'https://kiit.ac.in/placements/annual-official-report-2024.pdf',
    reportingSource: 'Official Institute Website',
    totalGraduatingStudents: 5200,
    totalEligibleStudents: 4400,
    uniqueStudentsPlaced: 4000,
    totalJobOffers: 5300,
    highestPackageLPA: 62.0,
    averagePackageLPA: 8.5,
    medianPackageLPA: 6.8,
    uniqueRecruitersCount: 450,
  };

  const importRes = await axios.post(`${API_BASE}/admin/official-imports`, importPayload, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const importedRecord = importRes.data.data.record;
  console.log(`[Import] Record created with ID: ${importedRecord._id}`);
  console.log(`[Import] Source URL: ${importedRecord.sourceUrl}`);
  console.log(`[Import] Reporting Year: ${importedRecord.reportingYear}`);
  console.log(`[Import] Import Date: ${importedRecord.importDate}`);
  console.log(`[Import] Approval Status: ${importedRecord.approvalStatus}`);

  // REQUIREMENT 7 CHECK: Do not automatically mark records as verified!
  if (importedRecord.approvalStatus !== 'Pending') {
    throw new Error('FAILED: Imported official record must be initialized with Pending status!');
  }
  if (!importedRecord.sourceUrl || !importedRecord.reportingYear || !importedRecord.importDate) {
    throw new Error('FAILED: Missing sourceUrl, reportingYear, or importDate on imported record!');
  }

  // Moderator approves the official import
  const verifyImportRes = await axios.put(
    `${API_BASE}/admin/official-imports/${importedRecord._id}/verify`,
    {
      approvalStatus: 'Verified',
      notes: 'Audited against official university PDF publication.',
    },
    { headers: { Authorization: `Bearer ${modToken}` } }
  );
  console.log(`[Moderation] Official report approvalStatus updated to: ${verifyImportRes.data.data.record.approvalStatus}`);
  if (verifyImportRes.data.data.record.approvalStatus !== 'Verified') {
    throw new Error('FAILED: Expected approvalStatus to update to Verified');
  }

  // Check Placement Analytics now reflects the verified official baseline metrics
  const finalAnalyticsRes = await axios.get(`${API_BASE}/placements/${college._id}/seasons/${season._id}`);
  const finalHeadline = finalAnalyticsRes.data.data.headlineStats;
  console.log(`[Final Analytics] Median Package: ${finalHeadline.medianPackageLPA} LPA`);
  console.log(`[Final Analytics] Average Package: ${finalHeadline.averagePackageLPA} LPA`);
  console.log(`[Final Analytics] Verified Placement Rate: ${finalHeadline.placementRate.percentage}%`);
  console.log('✅ STEP 7 PASSED: Official report import, source retention, and approval workflow verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL 14 DATA VERIFICATION REQUIREMENTS PASSED! 🎉');
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(0);
};

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err.response?.data || err.message);
  process.exit(1);
});
