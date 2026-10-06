require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function initVerifierAccount() {
  const email = (process.env.VERIFIER_EMAIL || 'placement.reality1@gmail.com').trim().toLowerCase();
  const initialPassword = process.env.VERIFIER_INITIAL_PASSWORD || 'PlacementVerifier@2026!';
  const name = 'Lead Placement Verifier';

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
  console.log('[Verifier Init] Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  try {
    let user = await User.findOne({ email });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    if (user) {
      console.log(`[Verifier Init] Existing user found for ${email}. Updating to Lead Verifier with forced password change...`);
      user.role = 'moderator';
      user.passwordHash = passwordHash;
      user.name = name;
      user.mustChangePassword = true;
      user.isEmailVerified = true;
      user.isCollegeVerified = true;
      user.isActive = true;
      await user.save();
      console.log(`[Verifier Init] User ${email} updated successfully.`);
    } else {
      console.log(`[Verifier Init] Creating new Lead Verifier account for ${email}...`);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'moderator',
        mustChangePassword: true,
        isEmailVerified: true,
        isCollegeVerified: true,
        isActive: true,
        pseudonym: 'Verifier_Lead',
      });
      console.log(`[Verifier Init] Account created successfully with ID: ${user._id}`);
    }

    try {
      await AuditLog.create({
        actionType: 'STATUS_CHANGE',
        entityType: 'User',
        entityId: user._id,
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: 'moderator',
        changeReason: 'Lead Verifier account initialized with mandatory first-login password reset policy',
        newValues: { role: 'moderator', mustChangePassword: true },
      });
    } catch (_) {}

    console.log('===============================================================');
    console.log('SUCCESS: Lead Verifier Account Initialized');
    console.log(`Email:            ${email}`);
    console.log(`Initial Password: ${initialPassword}`);
    console.log(`Role:             ${user.role}`);
    console.log(`mustChangePassword: ${user.mustChangePassword}`);
    console.log('===============================================================');
  } catch (error) {
    console.error('[Verifier Init Error]', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Verifier Init] Disconnected.');
  }
}

initVerifierAccount();
