const mongoose = require('mongoose');

const verificationEvidenceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      default: null,
    },
    documentType: {
      type: String,
      enum: ['Offer Letter', 'Internship Certificate', 'College ID Card', 'Official Mailer Screenshot', 'Salary Slip'],
      required: true,
    },
    filePath: {
      type: String,
      required: true,
      description: 'Encrypted or controlled storage path - strictly inaccessible without admin/owner permission',
    },
    originalFileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VerificationEvidence', verificationEvidenceSchema);
