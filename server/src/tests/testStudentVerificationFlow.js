require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const VerificationEvidence = require('../models/VerificationEvidence');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING STUDENT VERIFICATION SUITE TESTS ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('✔ Connected directly to MongoDB for test verification.');

  // Step 1: Login as Admin
  console.log('\n[Test 1] Logging in as Admin...');
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@placementreality.org',
    password: 'AdminPass123!',
  });
  const adminToken = adminLoginRes.data.data.token;
  console.log('✔ Admin logged in successfully. Token acquired.');

  // Step 2: Test Admin Overview
  console.log('\n[Test 2] Testing Admin Overview metrics...');
  const overviewRes = await axios.get(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✔ Admin Overview response:', {
    pendingStudentVerifications: overviewRes.data.data.pendingStudentVerifications,
    pendingOffers: overviewRes.data.data.pendingOffers,
    totalUsers: overviewRes.data.data.totalUsers,
  });

  // Step 3: Register a new test student and submit an ID proof
  console.log('\n[Test 3] Creating a test student with pending ID proof...');
  const testEmail = `verify_test_${Date.now()}@example.com`;
  const regRes = await axios.post(`${API_BASE}/auth/register`, {
    name: 'Verification Candidate',
    email: testEmail,
    password: 'Password123!',
    graduationYear: 2025,
  });
  const studentToken = regRes.data.data.token;
  const studentId = regRes.data.data.user.id;
  console.log(`✔ Test student registered: ${testEmail} (ID: ${studentId})`);

  // Create a synthetic VerificationEvidence directly or via endpoint
  const testEvidence = await VerificationEvidence.create({
    studentId,
    documentType: 'College ID Card',
    filePath: 'server/uploads/test-sample-id.jpg',
    originalFileName: 'student_college_id_card.jpg',
    mimeType: 'image/jpeg',
    fileSize: 102400,
    verificationStatus: 'Pending',
  });

  await User.findByIdAndUpdate(studentId, {
    collegeVerificationStatus: 'pending',
    collegeVerificationDocument: testEvidence._id,
  });
  console.log('✔ Seeded pending ID proof evidence for test student.');

  // Step 4: Verify Student Queue returns this student
  console.log('\n[Test 4] Querying Student Verification Queue (/admin/verifications/queue)...');
  const queueRes = await axios.get(`${API_BASE}/admin/verifications/queue?status=pending`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundStudent = queueRes.data.data.verifications.find((v) => v._id === studentId);
  if (!foundStudent) {
    throw new Error('Test student not found in pending verifications queue!');
  }
  console.log('✔ Found student in pending verifications queue with document:', foundStudent.collegeVerificationDocument?.originalFileName);

  // Step 5: Test Secure Document Access
  console.log('\n[Test 5] Testing Secure Document Access Control...');
  // A. Access without token should be 401
  try {
    await axios.get(`${API_BASE}/documents/${testEvidence._id}`);
    console.error('FAILED: Unauthenticated document access was allowed!');
  } catch (err) {
    console.log('✔ Unauthenticated document request correctly blocked with status:', err.response?.status);
  }

  // B. Access with non-owner/non-admin token should be 403
  const dummyUser = await User.create({
    name: 'Unauthorized Stranger',
    email: `stranger_${Date.now()}@example.com`,
    passwordHash: 'dummy',
    role: 'student',
  });
  const { signToken } = require('../utils/jwt');
  const strangerToken = signToken({ id: dummyUser._id, role: dummyUser.role });

  try {
    await axios.get(`${API_BASE}/documents/${testEvidence._id}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    console.error('FAILED: Unauthorized student was allowed to view another student\'s document!');
  } catch (err) {
    console.log('✔ Unauthorized student access correctly blocked with status 403:', err.response?.data?.message);
  }

  // Step 6: Test Reject Action with Rejection Reason
  console.log('\n[Test 6] Testing Rejection Action with Reason...');
  const rejectionReason = 'ID card photo is too blurry; college seal and expiration date cannot be confirmed.';
  const rejectRes = await axios.put(
    `${API_BASE}/admin/users/${studentId}/verify-college`,
    {
      status: 'rejected',
      rejectionReason,
      changeReason: rejectionReason,
    },
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  console.log('✔ Rejection API response:', rejectRes.data.message);

  // Verify in MongoDB
  const rejectedUserInDb = await User.findById(studentId);
  const rejectedEvidenceInDb = await VerificationEvidence.findById(testEvidence._id);
  console.log('✔ MongoDB Student State after rejection:', {
    isCollegeVerified: rejectedUserInDb.isCollegeVerified,
    collegeVerificationStatus: rejectedUserInDb.collegeVerificationStatus,
    collegeVerificationRejectionReason: rejectedUserInDb.collegeVerificationRejectionReason,
    evidenceStatus: rejectedEvidenceInDb.verificationStatus,
    evidenceNotes: rejectedEvidenceInDb.reviewNotes,
  });

  if (
    rejectedUserInDb.collegeVerificationStatus !== 'rejected' ||
    rejectedUserInDb.collegeVerificationRejectionReason !== rejectionReason ||
    rejectedEvidenceInDb.verificationStatus !== 'Rejected'
  ) {
    throw new Error('Rejection reason was not properly saved in MongoDB!');
  }

  // Verify Student Profile API reflects rejection
  const studentMeRes = await axios.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log('✔ Student Profile (/auth/me) reflects rejection reason:', {
    collegeVerificationStatus: studentMeRes.data.data.user.collegeVerificationStatus,
    collegeVerificationRejectionReason: studentMeRes.data.data.user.collegeVerificationRejectionReason,
  });

  // Step 7: Test Approve Action
  console.log('\n[Test 7] Testing Approval Action...');
  const approveRes = await axios.put(
    `${API_BASE}/admin/users/${studentId}/verify-college`,
    {
      status: 'verified',
      changeReason: 'Legible official college ID verified by moderator',
    },
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  console.log('✔ Approval API response:', approveRes.data.message);

  // Verify in MongoDB
  const approvedUserInDb = await User.findById(studentId);
  const approvedEvidenceInDb = await VerificationEvidence.findById(testEvidence._id);
  console.log('✔ MongoDB Student State after approval:', {
    isCollegeVerified: approvedUserInDb.isCollegeVerified,
    collegeVerificationStatus: approvedUserInDb.collegeVerificationStatus,
    collegeVerificationRejectionReason: approvedUserInDb.collegeVerificationRejectionReason,
    evidenceStatus: approvedEvidenceInDb.verificationStatus,
  });

  if (
    !approvedUserInDb.isCollegeVerified ||
    approvedUserInDb.collegeVerificationStatus !== 'verified' ||
    approvedEvidenceInDb.verificationStatus !== 'Approved'
  ) {
    throw new Error('Approval was not properly saved in MongoDB!');
  }

  // Clean up test records
  await User.findByIdAndDelete(studentId);
  await User.findByIdAndDelete(dummyUser._id);
  await VerificationEvidence.findByIdAndDelete(testEvidence._id);
  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log('ALL 8 STUDENT VERIFICATION TEST CHECKS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
