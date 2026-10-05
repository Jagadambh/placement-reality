const mongoose = require('mongoose');

const institutionDiscoveryLogSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
      index: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scanType: {
      type: String,
      enum: ['scheduled', 'manual', 'automated_registration', 'automated'],
      default: 'manual',
    },
    sourcePagesChecked: [
      {
        type: String,
      },
    ],
    reportsFound: {
      type: Number,
      default: 0,
    },
    reportsDownloaded: {
      type: Number,
      default: 0,
    },
    reportsExtracted: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'no_reports_found', 'failed'],
      default: 'success',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InstitutionDiscoveryLog', institutionDiscoveryLogSchema);
