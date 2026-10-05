require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = args[1] || process.env.ADMIN_PASSWORD;
  const name = args[2] || process.env.ADMIN_NAME || 'Platform Administrator';

  if (!email || !password) {
    console.error('===============================================================');
    console.error('ERROR: Missing Admin Credentials');
    console.error('Usage: node src/scripts/createAdmin.js <email> <password> [name]');
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.');
    console.error('Example: node src/scripts/createAdmin.js admin@placementreality.org SecureAdminPass123! "Super Admin"');
    console.error('===============================================================');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ERROR: Password must be at least 8 characters long for security compliance.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
  console.log('[Admin Init] Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('[Admin Init] Connected successfully.');

  try {
    let user = await User.findOne({ email });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (user) {
      console.log(`[Admin Init] Existing user found for ${email}. Promoting to Admin...`);
      const oldRole = user.role;
      user.role = 'admin';
      user.passwordHash = passwordHash;
      user.isEmailVerified = true;
      user.isCollegeVerified = true;
      user.isActive = true;
      if (name) user.name = name;
      await user.save();

      console.log(`[Admin Init] User ${email} successfully promoted from "${oldRole}" to "admin".`);
    } else {
      console.log(`[Admin Init] Creating new administrator account: ${email}...`);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        isEmailVerified: true,
        isCollegeVerified: true,
        isActive: true,
        pseudonym: 'Admin_Lead',
      });
      console.log(`[Admin Init] Administrator account created successfully with ID: ${user._id}`);
    }

    try {
      await AuditLog.create({
        actionType: 'STATUS_CHANGE',
        entityType: 'User',
        entityId: user._id,
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: 'admin',
        changeReason: 'Administrator account provisioned/promoted via secure CLI script',
        newValues: { role: 'admin', isEmailVerified: true, isCollegeVerified: true },
      });
    } catch (auditErr) {
      console.warn('[Admin Init] Audit log warning (non-fatal):', auditErr.message);
    }

    console.log('===============================================================');
    console.log('SUCCESS: Admin Account Ready');
    console.log(`Email: ${email}`);
    console.log(`Role:  ${user.role}`);
    console.log('===============================================================');
  } catch (error) {
    console.error('[Admin Init Error]', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Admin Init] Disconnected from MongoDB.');
  }
}

createAdmin();
