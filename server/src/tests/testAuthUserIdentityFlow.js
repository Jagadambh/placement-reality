require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const College = require('../models/College');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_placement_reality_jwt_secret_key_2026';

async function runIdentityFlowTests() {
  console.log('===============================================================');
  console.log('       AUTHENTICATION & USER IDENTITY FLOW TEST SUITE         ');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('✔ Connected directly to MongoDB for database state validation.');

  // Step 1: Inspect database record for Harish Sonkar
  console.log('\n[Test 1] Inspecting registered database record for HARISH SONKAR...');
  const harishDbUser = await User.findOne({ email: '2405114@kiit.ac.in' }).populate('collegeId');
  if (!harishDbUser) {
    throw new Error('❌ HARISH SONKAR user record not found in MongoDB!');
  }
  console.log('✔ Found DB Record:');
  console.log(`   _id:       ${harishDbUser._id}`);
  console.log(`   name:      ${harishDbUser.name}`);
  console.log(`   email:     ${harishDbUser.email}`);
  console.log(`   role:      ${harishDbUser.role}`);
  console.log(`   college:   ${harishDbUser.collegeId?.name} (${harishDbUser.collegeId?.shortName})`);
  console.log(`   status:    ${harishDbUser.collegeVerificationStatus}`);

  if (harishDbUser.name !== 'HARISH SONKAR') {
    throw new Error(`Expected name 'HARISH SONKAR', got '${harishDbUser.name}'`);
  }
  if (harishDbUser.email !== '2405114@kiit.ac.in') {
    throw new Error(`Expected email '2405114@kiit.ac.in', got '${harishDbUser.email}'`);
  }
  console.log('✔ Test 1 PASSED: Harish Sonkar database record is authentic and verified.');

  // Step 2: Test Login API with Harish Sonkar credentials
  console.log('\n[Test 2] Testing POST /api/auth/login for HARISH SONKAR...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: '2405114@kiit.ac.in',
    password: 'Password123!',
  });

  if (!loginRes.data.success) {
    throw new Error('❌ Login API failed for Harish Sonkar!');
  }

  const { token: harishToken, user: harishLoginUser } = loginRes.data.data;
  console.log('✔ Login successful. Token received.');
  console.log(`   Returned user name:    ${harishLoginUser.name}`);
  console.log(`   Returned user email:   ${harishLoginUser.email}`);
  console.log(`   Returned user college: ${harishLoginUser.collegeId?.name || harishLoginUser.collegeId}`);

  if (harishLoginUser.name !== 'HARISH SONKAR') {
    throw new Error(`Login payload returned wrong name: '${harishLoginUser.name}'`);
  }

  // Step 3: Verify JWT payload identifies the correct database user
  console.log('\n[Test 3] Verifying JWT Token Cryptographic Payload...');
  const decodedHarish = jwt.verify(harishToken, JWT_SECRET);
  console.log('✔ Decoded JWT Payload:', decodedHarish);

  if (String(decodedHarish.id) !== String(harishDbUser._id)) {
    throw new Error(`❌ JWT ID mismatch! Expected ${harishDbUser._id}, got ${decodedHarish.id}`);
  }
  console.log(`✔ Test 3 PASSED: JWT payload ID (${decodedHarish.id}) strictly matches Harish Sonkar's DB _id.`);

  // Step 4: Test GET /api/auth/me using Harish Sonkar's JWT
  console.log('\n[Test 4] Testing GET /api/auth/me for HARISH SONKAR profile retrieval...');
  const meRes = await axios.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${harishToken}` },
  });

  if (!meRes.data.success) {
    throw new Error('❌ GET /api/auth/me failed for Harish Sonkar!');
  }

  const harishMe = meRes.data.data.user;
  console.log('✔ GET /api/auth/me Response:');
  console.log(`   _id:       ${harishMe._id}`);
  console.log(`   name:      ${harishMe.name}`);
  console.log(`   email:     ${harishMe.email}`);
  console.log(`   college:   ${harishMe.collegeId?.name} (${harishMe.collegeId?.shortName})`);
  console.log(`   tier:      ${harishMe.collegeId?.tierClassification?.tier}`);

  if (harishMe.name !== 'HARISH SONKAR') {
    throw new Error(`Profile name mismatch: Expected 'HARISH SONKAR', got '${harishMe.name}'`);
  }
  if (harishMe.name.includes('Rahul') || harishMe.name.includes('Sharma')) {
    throw new Error(`❌ Stale identity detected! Profile contains 'Rahul Sharma'`);
  }
  if (!harishMe.collegeId?.name?.includes('Kalinga Institute')) {
    throw new Error(`Profile college mismatch: Expected KIIT, got '${harishMe.collegeId?.name}'`);
  }
  console.log('✔ Test 4 PASSED: Profile retrieval strictly returns HARISH SONKAR with KIIT affiliation.');

  // Step 5: Register a second distinct user account
  console.log('\n[Test 5] Registering distinct second user (User B: Priya Patel)...');
  const vitCollege = await College.findOne({ shortName: 'VIT' }) || await College.findOne();
  const userBEmail = `priya_patel_${Date.now()}@vit.ac.in`;

  const regUserBRes = await axios.post(`${API_BASE}/auth/register`, {
    name: 'PRIYA PATEL',
    email: userBEmail,
    password: 'Password123!',
    collegeId: vitCollege._id,
    graduationYear: 2026,
  });

  if (!regUserBRes.data.success) {
    throw new Error('❌ Registration failed for User B!');
  }

  const userBToken = regUserBRes.data.data.token;
  const userBId = regUserBRes.data.data.user.id || regUserBRes.data.data.user._id;
  console.log(`✔ User B registered successfully: PRIYA PATEL (${userBEmail}, ID: ${userBId})`);

  // Step 6: Verify User B profile retrieval
  console.log('\n[Test 6] Testing GET /api/auth/me for User B (Priya Patel)...');
  const meUserBRes = await axios.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });

  const userBProfile = meUserBRes.data.data.user;
  console.log('✔ User B Profile:');
  console.log(`   name:    ${userBProfile.name}`);
  console.log(`   email:   ${userBProfile.email}`);
  console.log(`   college: ${userBProfile.collegeId?.name}`);

  if (userBProfile.name !== 'PRIYA PATEL') {
    throw new Error(`User B name mismatch: Expected 'PRIYA PATEL', got '${userBProfile.name}'`);
  }
  if (userBProfile.email !== userBEmail) {
    throw new Error(`User B email mismatch!`);
  }
  console.log('✔ Test 6 PASSED: User B profile isolated and correct.');

  // Step 7: Account Switching Verification (Zero crossover)
  console.log('\n[Test 7] Testing Account Switching between User A (Harish) and User B (Priya)...');
  for (let cycle = 1; cycle <= 3; cycle++) {
    const resA = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${harishToken}` },
    });
    if (resA.data.data.user.name !== 'HARISH SONKAR') {
      throw new Error(`Cycle ${cycle} User A identity cross-talk error!`);
    }

    const resB = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    if (resB.data.data.user.name !== 'PRIYA PATEL') {
      throw new Error(`Cycle ${cycle} User B identity cross-talk error!`);
    }
  }
  console.log('✔ Test 7 PASSED: 3 cycles of switching verified zero cross-talk or stale profile data.');

  // Step 8: Logout / Unauthorized Session Invalidation
  console.log('\n[Test 8] Testing Logout and Unauthorized Request Rejection...');
  try {
    await axios.get(`${API_BASE}/auth/me`, {
      headers: {}, // No token (simulating logged out client)
    });
    throw new Error('❌ Request without token should have failed with 401!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✔ Unauthenticated request properly rejected with HTTP 401 Unauthorized.');
    } else {
      throw err;
    }
  }

  try {
    await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer invalid_garbage_token_123' },
    });
    throw new Error('❌ Request with invalid token should have failed with 401!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✔ Malformed/invalid token properly rejected with HTTP 401 Unauthorized.');
    } else {
      throw err;
    }
  }
  console.log('✔ Test 8 PASSED: Logout & unauthenticated requests securely blocked.');

  // Clean up test user B
  await User.findByIdAndDelete(userBId);
  console.log(`✔ Cleaned up temporary test user: ${userBEmail}`);

  console.log('\n===============================================================');
  console.log('     ALL AUTHENTICATION & IDENTITY TESTS PASSED (8/8)         ');
  console.log('===============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runIdentityFlowTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  if (err.response?.data) {
    console.error('API Error Response:', err.response.data);
  }
  process.exit(1);
});
