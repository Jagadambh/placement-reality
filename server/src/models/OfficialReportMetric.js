const mongoose = require('mongoose');

const officialReportMetricSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfficialPlacementReport',
      required: [true, 'Report reference is required'],
      index: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
      index: true,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementSeason',
      default: null,
      index: true,
    },
    academicSession: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    institutionCategory: {
      type: String,
      default: 'Unclassified',
      trim: true,
    },
    graduatingBatch: {
      type: Number,
      default: null,
    },
    branchName: {
      type: String,
      default: 'All Branches / Institute Wide',
      trim: true,
    },
    metricName: {
      type: String,
      required: [true, 'Metric name is required'],
      trim: true,
      index: true,
    },
    rawReportedValue: {
      type: String,
      required: [true, 'Raw reported value string is required'],
      trim: true,
    },
    normalizedValue: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: [
        'Official Report',
        'Official Website',
        'NIRF Mandatory Disclosure',
        'Annual Placement Brochure',
        'RTI Disclosure',
        'Student Verified',
        'Independent Audit',
      ],
      default: 'Official Report',
    },
    sourceUrl: {
      type: String,
      default: null,
      trim: true,
    },
    sourceDocument: {
      type: String,
      default: null,
      trim: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    sourcePublicationDate: {
      type: Date,
      default: null,
    },
    retrievedDate: {
      type: Date,
      default: Date.now,
    },
    sourceTextSnippet: {
      type: String,
      required: [true, 'Cited source text snippet is required for evidence traceability'],
      trim: true,
    },
    tableReference: {
      type: String,
      default: null,
      trim: true,
    },
    confidenceScore: {
      type: Number,
      default: 90,
      min: 0,
      max: 100,
    },
    // Requirement 11 Verification Levels
    verificationStatus: {
      type: String,
      enum: [
        'Officially Reported',
        'Independently Verified',
        'Student Verified',
        'Partially Verified',
        'Unverified',
        'Pending Review',
      ],
      default: 'Pending Review',
      index: true,
    },
    coverage: {
      verifiedOutcomesCount: { type: Number, default: null },
      totalEligibleDenominator: { type: Number, default: null },
      coveragePercentage: { type: Number, default: null },
      isKnown: { type: Boolean, default: false },
      coverageNotes: { type: String, default: 'Coverage unknown unless total eligible population is officially reported.' },
    },
    reviewStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Corrected'],
      default: 'Pending',
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
    moderatorNotes: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    extractionMethod: {
      type: String,
      enum: ['deterministic_regex', 'table_parser', 'ai_assistant', 'manual_moderator'],
      default: 'deterministic_regex',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate identical metric extraction for the same report, branch, and metric
officialReportMetricSchema.index(
  { reportId: 1, metricName: 1, branchName: 1, rawReportedValue: 1 },
  { unique: true }
);

module.exports = mongoose.model('OfficialReportMetric', officialReportMetricSchema);
