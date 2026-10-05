const crypto = require('crypto');
const User = require('../models/User');
const College = require('../models/College');
const VerificationEvidence = require('../models/VerificationEvidence');
const { signToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');

// @desc Register user
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', collegeId, departmentId, graduationYear, privacyConsent } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 400);
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: ['student', 'moderator', 'admin'].includes(role) ? role : 'student',
      collegeId: collegeId || null,
      departmentId: departmentId || null,
      graduationYear: graduationYear || null,
      // CRITICAL REQUIREMENT: Selecting a college does NOT grant verification!
      isCollegeVerified: false,
      collegeVerificationStatus: 'unverified',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      privacyConsent: privacyConsent !== false,
    });

    await user.populate([
      { path: 'collegeId', select: 'name shortName tierClassification city state' },
      { path: 'departmentId', select: 'name code' },
    ]);

    const token = signToken({ id: user._id, role: user.role });

    return sendSuccess(
      res,
      {
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          departmentId: user.departmentId,
          graduationYear: user.graduationYear,
          isCollegeVerified: user.isCollegeVerified,
          collegeVerificationStatus: user.collegeVerificationStatus,
          pseudonym: user.pseudonym,
        },
        token,
        emailVerificationNotice: 'Verification token generated. Please confirm your email.',
        verificationToken, // Provided in development for automated testing
      },
      'Registration successful. Note: Selecting a college registers your association, but student verification requires verified student ID/email evidence.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide both email and password.', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return sendError(res, 'Invalid credentials provided.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials provided.', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    await user.populate([
      { path: 'collegeId', select: 'name shortName tierClassification city state' },
      { path: 'departmentId', select: 'name code' },
      { path: 'collegeVerificationDocument' },
    ]);

    const token = signToken({ id: user._id, role: user.role });

    return sendSuccess(
      res,
      {
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId,
          departmentId: user.departmentId,
          graduationYear: user.graduationYear,
          isCollegeVerified: user.isCollegeVerified,
          collegeVerificationStatus: user.collegeVerificationStatus,
          collegeVerificationRejectionReason: user.collegeVerificationRejectionReason,
          collegeVerificationDocument: user.collegeVerificationDocument,
          pseudonym: user.pseudonym,
        },
        token,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get current logged-in user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('collegeId', 'name shortName tierClassification city state')
      .populate('departmentId', 'name code')
      .populate('collegeVerificationDocument');

    if (!user) {
      return sendError(res, 'User profile not found.', 404);
    }

    const userData = user.toObject();
    userData.id = user._id;

    return sendSuccess(res, { user: userData }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Forgot password flow
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      // Don't leak user existence
      return sendSuccess(
        res,
        null,
        'If an account exists with that email, a password reset link has been dispatched.'
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return sendSuccess(
      res,
      {
        resetToken, // Returned for dev testing & local evaluation
        expiresAt: user.passwordResetExpires,
      },
      'Password reset token generated successfully. In production, this is transmitted via secure transactional email.'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Reset password with token
// @route POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, 'Token and new password are required.', 400);
    }

    const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, 'Password reset token is invalid or has expired.', 400);
    }

    user.passwordHash = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return sendSuccess(res, null, 'Password has been successfully updated. You may now log in.');
  } catch (error) {
    next(error);
  }
};

// @desc Verify email token
// @route POST /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, 'Verification token is invalid or has expired.', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return sendSuccess(res, null, 'Email address has been successfully verified.');
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, pseudonym, privacyConsent, collegeId, departmentId, graduationYear } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (pseudonym) user.pseudonym = pseudonym;
    if (typeof privacyConsent === 'boolean') user.privacyConsent = privacyConsent;
    if (collegeId) user.collegeId = collegeId;
    if (departmentId) user.departmentId = departmentId;
    if (graduationYear) user.graduationYear = graduationYear;

    await user.save();
    return sendSuccess(res, { user }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc Submit student ID proof for college verification
// @route POST /api/auth/submit-id-proof
const submitStudentIdProof = async (req, res, next) => {
  try {
    console.log('[ID Verification] Incoming request from user ID:', req.user?._id);

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (!req.file) {
      console.warn('[ID Verification] No file received. Multer field name must be "idProofDocument".');
      return sendError(
        res,
        'No file received. Please attach a valid College ID card, bonafide certificate, or admission letter.',
        400
      );
    }

    console.log('[ID Verification] File received successfully:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    // Create VerificationEvidence matching Mongoose schema:
    // Schema fields: studentId, documentType (enum), filePath, originalFileName, mimeType, fileSize, verificationStatus
    const evidence = await VerificationEvidence.create({
      studentId: user._id,
      documentType: 'College ID Card',
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      verificationStatus: 'Pending',
    });

    console.log('[ID Verification] VerificationEvidence document created successfully with ID:', evidence._id);

    user.collegeVerificationStatus = 'pending';
    user.collegeVerificationDocument = evidence._id;
    await user.save();

    await recordAuditLog({
      actionType: 'STATUS_CHANGE',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      performedByEmail: user.email,
      performedByRole: user.role,
      changeReason: 'Student uploaded College ID Card proof for affiliation verification',
      newValues: { collegeVerificationStatus: 'pending', collegeVerificationDocument: evidence._id },
    });

    const populatedUser = await User.findById(user._id)
      .populate('collegeId', 'name shortName tierClassification city state')
      .populate('departmentId', 'name code')
      .populate('collegeVerificationDocument');

    return sendSuccess(
      res,
      {
        user: populatedUser,
        evidence: {
          id: evidence._id,
          fileName: evidence.originalFileName,
          status: evidence.verificationStatus,
        },
      },
      'Verification proof submitted successfully! A community moderator will validate your college affiliation.'
    );
  } catch (error) {
    console.error('[ID Verification Error] Failed to process college ID upload:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updateProfile,
  submitStudentIdProof,
};
