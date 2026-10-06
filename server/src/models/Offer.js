const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementSeason',
      required: false,
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
    },
    offerDate: {
      type: Date,
      required: [true, 'Offer date is required'],
    },
    annualCtcLpa: {
      type: Number,
      required: [true, 'Annual CTC (LPA) is required'],
      min: [0.5, 'Annual CTC must be at least 0.5 LPA'],
      max: [300, 'Annual CTC cannot exceed realistic limit (300 LPA)'],
    },
    fixedCompensationLpa: {
      type: Number,
      default: null,
    },
    variableCompensationLpa: {
      type: Number,
      default: null,
    },
    offerType: {
      type: String,
      enum: ['On-Campus Full-Time', 'Pre-Placement Offer (PPO)', 'Off-Campus', 'Pool Campus'],
      required: true,
      default: 'On-Campus Full-Time',
    },
    acceptedOffer: {
      type: String,
      enum: ['Yes', 'No', 'Undecided'],
      default: 'Yes',
    },
    joinedCompany: {
      type: String,
      enum: ['Yes', 'No', 'Yet to Join'],
      default: 'Yet to Join',
    },
    supportingDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationEvidence',
      default: null,
    },
    consentToAggregate: {
      type: Boolean,
      required: [true, 'Consent to use submission in statistical models is required'],
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Under review', 'Verified', 'Rejected', 'More information required', 'Unpublished', 'Draft'],
      default: 'Pending',
      index: true,
    },
    submissionStage: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'REJECTED'],
      default: 'SUBMITTED',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    moderatorNotes: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    // Duplicate detection flag
    isDuplicateFlag: {
      type: Boolean,
      default: false,
    },
    duplicateReason: {
      type: String,
      default: '',
    },
    isPublicAnonymized: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast duplicate detection: student cannot submit exact same company & role in same season twice
offerSchema.index({ studentId: 1, companyName: 1, jobRole: 1, seasonId: 1 });

module.exports = mongoose.model('Offer', offerSchema);
