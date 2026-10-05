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
    pageNumber: {
      type: Number,
      default: 1,
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
    reviewStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Corrected'],
      default: 'Pending',
      index: true,
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
