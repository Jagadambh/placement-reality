require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function createModerator() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.MODERATOR_EMAIL || '').trim().toLowerCase();
  const password = args[1] || process.env.MODERATOR_PASSWORD || 'ModPass123!';
  const name = args[2] || process.env.MODERATOR_NAME || 'Community Moderator';

  if (!email) {
    console.error('===============================================================');
    console.error('ERROR: Missing Moderator Email');
    console.error('Usage: node src/scripts/createModerator.js <email> [password] [name]');
    console.error('Example: node src/scripts/createModerator.js mod@placementreality.org ModPass123! "Lead Moderator"');
    console.error('===============================================================');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ERROR: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
  console.log('[Moderator Init] Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('[Moderator Init] Connected successfully.');

  try {
    let user = await User.findOne({ email });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (user) {
      console.log(`[Moderator Init] Existing user found for ${email}. Promoting to Moderator...`);
      const oldRole = user.role;
      user.role = 'moderator';
      user.passwordHash = passwordHash;
      user.isEmailVerified = true;
      user.isCollegeVerified = true;
      user.isActive = true;
      if (name) user.name = name;
      await user.save();

      console.log(`[Moderator Init] User ${email} successfully promoted from "${oldRole}" to "moderator".`);
    } else {
      console.log(`[Moderator Init] Creating new moderator account: ${email}...`);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'moderator',
        isEmailVerified: true,
        isCollegeVerified: true,
        isActive: true,
        pseudonym: 'Mod_Verified',
      });
      console.log(`[Moderator Init] Moderator account created successfully with ID: ${user._id}`);
    }

    try {
      await AuditLog.create({
        actionType: 'STATUS_CHANGE',
        entityType: 'User',
        entityId: user._id,
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: 'moderator',
        changeReason: 'Moderator account provisioned/promoted via secure CLI script',
        newValues: { role: 'moderator', isEmailVerified: true, isCollegeVerified: true },
      });
    } catch (auditErr) {
      console.warn('[Moderator Init] Audit log warning (non-fatal):', auditErr.message);
    }

    console.log('===============================================================');
    console.log('SUCCESS: Moderator Account Ready');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${user.role}`);
    console.log('Dashboard URL: http://localhost:5173/admin');
    console.log('===============================================================');
  } catch (error) {
    console.error('[Moderator Init Error]', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Moderator Init] Disconnected from MongoDB.');
  }
}

createModerator();
