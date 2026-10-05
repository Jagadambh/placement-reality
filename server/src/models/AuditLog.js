const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'VERIFY_OFFER',
        'REJECT_OFFER',
        'MODERATE_REVIEW',
        'UPDATE_PLACEMENT_RECORD',
        'OVERWRITE_RECORD',
        'TIER_CLASSIFICATION_CHANGE',
        'STATUS_CHANGE',
        'CLASSIFY_INSTITUTION',
        'VERIFY_RECORD',
        'REJECT_RECORD',
        'IMPORT_OFFICIAL_RECORD',
        'IMPORT_OFFICIAL_REPORT',
        'REJECT_INTERNSHIP',
        'DISCOVER_OFFICIAL_REPORT',
        'EXTRACT_REPORT_METRICS',
        'APPROVE_OFFICIAL_REPORT',
        'REJECT_OFFICIAL_REPORT',
        'APPROVE_REPORT_METRIC',
        'REJECT_REPORT_METRIC',
        'CORRECT_REPORT_METRIC',
        'SCAN_OFFICIAL_WEBSITE',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'PlacementRecord',
        'Offer',
        'College',
        'CollegeReview',
        'PlacementSeason',
        'User',
        'VerificationEvidence',
        'Internship',
        'OfficialPlacementReport',
        'OfficialReportMetric',
        'InstitutionDiscoveryLog',
      ],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    performedByEmail: {
      type: String,
    },
    performedByRole: {
      type: String,
    },
    changeReason: {
      type: String,
      required: [true, 'A documented rationale/reason is mandatory for audit compliance'],
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
