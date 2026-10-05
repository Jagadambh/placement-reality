const mongoose = require('mongoose');

const placementSeasonSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2024-2025)'],
      trim: true,
      match: [/^(\d{4}-\d{4}|\d{4}–\d{2}|\d{4}-\d{2})$/, 'Format must be YYYY-YYYY or YYYY–YY (e.g. 2023-2024 or 2023–24)'],
    },
    displaySession: {
      type: String,
      default: null,
    },
    seasonStatus: {
      type: String,
      enum: ['Ongoing', 'Concluded', 'Archived'],
      default: 'Ongoing',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    officialReportPublished: {
      type: Boolean,
      default: false,
    },
    officialReportUrl: {
      type: String,
    },
    dataCompletenessRating: {
      type: String,
      enum: ['Comprehensive', 'Substantial', 'Partial', 'Initial', 'Unverified'],
      default: 'Partial',
    },
    methodologyNotes: {
      type: String,
      default: 'Aggregation comprises institute NIRF filings, verified student submissions, and accredited third-party reports. Duplicate student offers are segmented from unique headcounts.',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

placementSeasonSchema.index({ collegeId: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('PlacementSeason', placementSeasonSchema);
