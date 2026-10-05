const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
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
      required: [true, 'Department is required'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    internshipRole: {
      type: String,
      required: [true, 'Internship role is required'],
      trim: true,
    },
    internshipPeriodMonths: {
      type: Number,
      default: 2,
      min: 1,
      max: 24,
    },
    startMonthYear: {
      type: String, // e.g. "May 2024"
      required: true,
    },
    endMonthYear: {
      type: String, // e.g. "July 2024"
    },
    monthlyStipendInr: {
      type: Number,
      default: 0,
      min: 0,
    },
    stipendCategory: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Undisclosed'],
      required: true,
      default: 'Paid',
    },
    workMode: {
      type: String,
      enum: ['In-Office', 'Remote', 'Hybrid'],
      default: 'In-Office',
    },
    ppoConversion: {
      type: String,
      enum: ['Offered', 'Not Offered', 'Under Consideration', 'Undisclosed'],
      default: 'Undisclosed',
    },
    verificationEvidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationEvidence',
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Under review', 'Verified', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    rejectionReason: {
      type: String,
      default: null,
    },
    consentToAggregate: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Internship', internshipSchema);
