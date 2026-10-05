const mongoose = require('mongoose');

const officialPlacementReportSchema = new mongoose.Schema(
  {
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
      trim: true,
      default: 'Unknown / Undetected',
      index: true,
    },
    documentTitle: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    sourceUrl: {
      type: String,
      required: [true, 'Official source webpage URL is required'],
      trim: true,
    },
    reportUrl: {
      type: String,
      required: [true, 'Report download / document URL is required'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'html', 'scanned_pdf'],
      default: 'pdf',
    },
    localFilePath: {
      type: String,
      default: null,
    },
    fileHash: {
      type: String,
      default: null,
      index: true,
    },
    fileSizeBytes: {
      type: Number,
      default: null,
    },
    pageCount: {
      type: Number,
      default: 1,
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    retrievalDate: {
      type: Date,
      default: Date.now,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    discoveryMethod: {
      type: String,
      enum: ['automated_crawl', 'manual_scan', 'direct_url'],
      default: 'automated_crawl',
    },
    status: {
      type: String,
      enum: [
        'Discovered',
        'Downloaded',
        'Extraction pending',
        'Extracted',
        'Pending moderator review',
        'Approved',
        'Rejected',
        'Extraction failed',
      ],
      default: 'Discovered',
      index: true,
    },
    extractionError: {
      type: String,
      default: null,
    },
    rejectionReason: {
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
    hasConflictingFigures: {
      type: Boolean,
      default: false,
    },
    conflictNotes: {
      type: String,
      default: null,
    },
    rawTextSnippet: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reports for the same college and URL
officialPlacementReportSchema.index({ collegeId: 1, reportUrl: 1 }, { unique: true });
// Compound deduplication indexes: College + Session/Year + Report Type (Requirement 8)
officialPlacementReportSchema.index({ collegeId: 1, academicSession: 1 });
officialPlacementReportSchema.index({ collegeId: 1, academicSession: 1, fileType: 1 });

module.exports = mongoose.model('OfficialPlacementReport', officialPlacementReportSchema);
