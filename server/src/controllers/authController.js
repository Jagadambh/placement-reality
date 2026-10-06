const crypto = require('crypto');
const User = require('../models/User');
const College = require('../models/College');
const VerificationEvidence = require('../models/VerificationEvidence');
const Department = require('../models/Department');
const Offer = require('../models/Offer');
const CollegeReview = require('../models/CollegeReview');
const PlacementSeason = require('../models/PlacementSeason');
const Notification = require('../models/Notification');
const { signToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');
const { syncCollegeStudentVerifiedStats } = require('../services/studentVerifiedAggregationService');
const { validateCollegeEmail } = require('../utils/collegeEmailValidator');

// @desc Register user
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', collegeId, departmentId, graduationYear, privacyConsent } = req.body;

    // Enforce that student accounts must use an official college email ID
    if (role === 'student' || !['moderator', 'admin'].includes(role)) {
      let targetCollege = null;
      if (collegeId) {
        targetCollege = await College.findById(collegeId);
      }
      const emailValidation = validateCollegeEmail(email, targetCollege);
      if (!emailValidation.isValid) {
        return sendError(res, emailValidation.message, 400);
      }
    }

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
          mustChangePassword: user.mustChangePassword || false,
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

// @desc Change user password (authenticated)
// @route POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters long.', 400);
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return sendError(res, 'User profile not found.', 404);
    }

    // If user is not flagged with mustChangePassword, check current password
    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return sendError(res, 'Current temporary password is incorrect.', 400);
      }
    } else if (!user.mustChangePassword) {
      return sendError(res, 'Current password is required to change password.', 400);
    }

    user.passwordHash = newPassword;
    user.mustChangePassword = false;
    await user.save();

    await recordAuditLog({
      actionType: 'STATUS_CHANGE',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      performedByEmail: user.email,
      performedByRole: user.role,
      changeReason: 'User changed password / completed mandatory initial password change',
      newValues: { mustChangePassword: false },
    });

    const refreshedUser = await User.findById(user._id)
      .populate('collegeId', 'name shortName tierClassification')
      .populate('departmentId', 'name code');

    const userData = refreshedUser.toObject();
    userData.id = refreshedUser._id;
    userData.mustChangePassword = false;

    return sendSuccess(res, { user: userData }, 'Password successfully changed! You now have full access.');
  } catch (error) {
    next(error);
  }
};

// @desc Unified Student Join & Verification Submission (College ID + Offer Letter)
// @route POST /api/auth/student-join-submit
const studentJoinSubmit = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      collegeId,
      departmentId,
      departmentName,
      graduationYear,
      academicSession = '2026-2027',
      degree = 'B.Tech',
      isPseudonymous = true,
      privacyConsent = true,
      placementStatus = 'placed',
      companyName,
      jobRole,
      annualCtcLpa,
      fixedCompensationLpa,
      offerType = 'On-Campus Full-Time',
      rating,
      comment,
      batchMedianLPA,
      batchAvgLPA,
      batchHighestLPA,
      batchPlacementRate,
    } = req.body;

    if (!name || !email || !collegeId) {
      return sendError(res, 'Please provide student name, email, and select your college.', 400);
    }

    // Require ID Proof file
    const idProofFile = req.files?.['idProofDocument']?.[0];
    if (!idProofFile) {
      return sendError(res, 'A valid College ID Card or enrollment proof document is required for verification.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce that student accounts must use an official college email ID
    let targetCollege = null;
    if (collegeId) {
      targetCollege = await College.findById(collegeId);
    }
    const emailValidation = validateCollegeEmail(cleanEmail, targetCollege);
    if (!emailValidation.isValid) {
      return sendError(res, emailValidation.message, 400);
    }

    let user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (user) {
      // If user exists, verify password if provided
      if (password) {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return sendError(res, 'An account with this email exists. Please enter the correct password to submit new proof.', 401);
        }
      }
      user.collegeId = collegeId;
      if (departmentId) user.departmentId = departmentId;
      if (graduationYear) user.graduationYear = parseInt(graduationYear, 10);
      user.collegeVerificationStatus = 'pending';
    } else {
      if (!password || password.length < 6) {
        return sendError(res, 'Password is required and must be at least 6 characters long.', 400);
      }
      user = new User({
        name: name.trim(),
        email: cleanEmail,
        passwordHash: password,
        role: 'student',
        collegeId,
        departmentId: departmentId || null,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : 2026,
        isCollegeVerified: false,
        collegeVerificationStatus: 'pending',
        isEmailVerified: true,
        privacyConsent: privacyConsent !== false && privacyConsent !== 'false',
      });
    }

    // 1. Create College ID Proof Evidence
    const idEvidence = await VerificationEvidence.create({
      studentId: user._id,
      documentType: 'College ID Card',
      filePath: idProofFile.path,
      originalFileName: idProofFile.originalname,
      mimeType: idProofFile.mimetype,
      fileSize: idProofFile.size,
      verificationStatus: 'Pending',
      reviewNotes: `Submitted during Student Join registration for session ${academicSession}`,
    });

    user.collegeVerificationDocument = idEvidence._id;
    user.collegeVerificationStatus = 'pending';
    await user.save();

    // 2. Handle Placement Offer Submission if placed
    let offerRecord = null;
    let offerEvidence = null;
    const offerLetterFile = req.files?.['offerLetterDocument']?.[0];

    if (placementStatus === 'placed' && companyName && annualCtcLpa) {
      if (offerLetterFile) {
        offerEvidence = await VerificationEvidence.create({
          studentId: user._id,
          documentType: 'Offer Letter',
          filePath: offerLetterFile.path,
          originalFileName: offerLetterFile.originalname,
          mimeType: offerLetterFile.mimetype,
          fileSize: offerLetterFile.size,
          verificationStatus: 'Pending',
          reviewNotes: `Offer letter for ${companyName} (${annualCtcLpa} LPA)`,
        });
      }

      // Check or create season
      const cleanSession = academicSession.includes('–') ? academicSession.replace('–', '-') : academicSession;
      let season = await PlacementSeason.findOne({ collegeId, academicYear: cleanSession });
      if (!season) {
        try {
          season = await PlacementSeason.create({
            collegeId,
            academicYear: cleanSession,
            displaySession: academicSession,
            seasonStatus: 'Ongoing',
          });
        } catch (_) {}
      }

      // Resolve departmentId if missing
      let resolvedDeptId = departmentId;
      if (!resolvedDeptId && departmentName) {
        const foundDept = await Department.findOne({
          collegeId,
          name: new RegExp(`^${departmentName.trim()}$`, 'i'),
        });
        if (foundDept) resolvedDeptId = foundDept._id;
      }
      if (!resolvedDeptId) {
        const firstDept = await Department.findOne({ collegeId });
        if (firstDept) resolvedDeptId = firstDept._id;
      }

      offerRecord = await Offer.create({
        studentId: user._id,
        collegeId,
        departmentId: resolvedDeptId || null,
        seasonId: season ? season._id : null,
        graduationYear: user.graduationYear || 2026,
        companyName: companyName.trim(),
        jobRole: (jobRole || 'Graduate Engineer Trainee').trim(),
        offerDate: new Date(),
        annualCtcLpa: parseFloat(annualCtcLpa),
        fixedCompensationLpa: fixedCompensationLpa ? parseFloat(fixedCompensationLpa) : null,
        offerType: offerType || 'On-Campus Full-Time',
        acceptedOffer: 'Yes',
        joinedCompany: 'Yet to Join',
        supportingDocument: offerEvidence ? offerEvidence._id : null,
        verificationStatus: 'Pending',
        consentToAggregate: true,
      });

      if (offerEvidence) {
        offerEvidence.offerId = offerRecord._id;
        await offerEvidence.save();
      }
    }

    // 3. Handle Student Review / Ground-Truth Batch Stats if provided
    let reviewRecord = null;
    const hasBatchStats = Boolean(batchMedianLPA || batchAvgLPA || batchHighestLPA || batchPlacementRate);
    if ((comment && comment.trim().length >= 5) || hasBatchStats) {
      try {
        const ratingVal = Math.min(5, Math.max(1, parseInt(rating, 10) || 4));
        const cleanReportedStats = {
          medianPackageLPA: batchMedianLPA ? parseFloat(batchMedianLPA) : null,
          averagePackageLPA: batchAvgLPA ? parseFloat(batchAvgLPA) : null,
          highestPackageLPA: batchHighestLPA ? parseFloat(batchHighestLPA) : null,
          actualPlacementRate: batchPlacementRate ? parseFloat(batchPlacementRate) : null,
        };

        reviewRecord = await CollegeReview.create({
          collegeId,
          studentId: user._id,
          graduationYear: user.graduationYear || 2026,
          branch: departmentName || 'Engineering & Technology',
          authorDisplayName: (isPseudonymous === true || isPseudonymous === 'true') ? user.pseudonym : user.name,
          isPseudonymous: isPseudonymous === true || isPseudonymous === 'true',
          isVerifiedStudentBadge: true,
          verificationProofType: 'College ID Card & Offer Verified',
          title: companyName ? `Placement Experience at ${companyName}` : 'Student Placement Ground-Truth Reality',
          reviewText: (comment && comment.trim().length >= 5)
            ? comment.trim()
            : `Batch ground-reality metrics reported by student for ${academicSession}: Median ₹${cleanReportedStats.medianPackageLPA || 'N/A'} LPA, Avg ₹${cleanReportedStats.averagePackageLPA || 'N/A'} LPA.`,
          reportedStats: cleanReportedStats,
          ratings: {
            placementSupport: ratingVal,
            internshipSupport: ratingVal,
            teachingAcademics: 4,
            infrastructure: 4,
            campusExperience: 4,
            careerPrep: 4,
          },
          overallRating: ratingVal,
          moderationStatus: 'Approved',
        });

        // Synchronize college ground-truth statistics immediately
        try {
          await syncCollegeStudentVerifiedStats(collegeId);
        } catch (syncErr) {
          console.warn('[Join Us] Stats sync warning:', syncErr.message);
        }
      } catch (revErr) {
        console.warn('[Join Us] Review creation error (non-fatal):', revErr.message);
      }
    }

    // 4. Create Notification
    try {
      await Notification.create({
        userId: user._id,
        title: 'Verification Proofs Received',
        message: 'Your College ID Card and placement documents have been submitted to the Lead Verifier (placement.reality1@gmail.com). You will be notified once reviewed.',
        type: 'Verification Update',
      });
    } catch (_) {}

    // 5. Generate Token and return
    const token = signToken({ id: user._id, role: user.role });

    const populatedUser = await User.findById(user._id)
      .populate('collegeId', 'name shortName tierClassification city state')
      .populate('departmentId', 'name code')
      .populate('collegeVerificationDocument');

    const userData = populatedUser.toObject();
    userData.id = populatedUser._id;
    userData.mustChangePassword = false;

    return sendSuccess(
      res,
      {
        user: userData,
        token,
        evidence: {
          idProofId: idEvidence._id,
          offerProofId: offerEvidence ? offerEvidence._id : null,
          offerId: offerRecord ? offerRecord._id : null,
        },
      },
      'Verification documents submitted successfully! Your credentials have been queued for the Lead Verifier.',
      201
    );
  } catch (error) {
    console.error('[Student Join Submit Error]', error);
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
  changePassword,
  studentJoinSubmit,
};

