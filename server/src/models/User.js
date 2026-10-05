const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'moderator', 'admin'],
      default: 'student',
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    graduationYear: {
      type: Number,
      min: [2000, 'Graduation year must be 2000 or later'],
      max: [2035, 'Graduation year cannot be beyond 2035'],
      default: null,
    },
    // CRITICAL: Merely selecting a college does NOT grant verified status!
    isCollegeVerified: {
      type: Boolean,
      default: false,
    },
    collegeVerificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },
    collegeVerificationDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationEvidence',
      default: null,
    },
    collegeVerificationRejectionReason: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    privacyConsent: {
      type: Boolean,
      default: true,
      description: 'Consent to use anonymous submissions in aggregated statistical models',
    },
    pseudonym: {
      type: String,
      default: function() {
        return `Student_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Avoid re-hashing if already a bcrypt hash
  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
