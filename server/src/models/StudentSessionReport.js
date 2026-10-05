const mongoose = require('mongoose');

const studentSessionReportSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College ID is required'],
      index: true,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementSeason',
      required: [true, 'Season ID is required'],
      index: true,
    },
    academicSession: {
      type: String,
      required: true,
      index: true, // e.g. "2023-24" or "2023-2024"
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: {
      type: String,
      default: 'Verified Student',
    },
    highestPackageLPA: {
      type: Number,
      required: [true, 'Highest package in LPA is required'],
      min: 0,
      max: 500,
    },
    averagePackageLPA: {
      type: Number,
      required: [true, 'Average package in LPA is required'],
      min: 0,
      max: 200,
    },
    medianPackageLPA: {
      type: Number,
      required: [true, 'Median package in LPA is required'],
      min: 0,
      max: 200,
    },
    totalStudentsPlaced: {
      type: Number,
      required: [true, 'Total students placed count is required'],
      min: 0,
    },
    totalRecruitingCompanies: {
      type: Number,
      required: [true, 'Total recruiting companies count is required'],
      min: 0,
    },
    totalJobOffers: {
      type: Number,
      default: null,
      min: 0,
    },
    evidenceNotes: {
      type: String,
      default: 'Verified student cohort placement data submission.',
    },
    verificationStatus: {
      type: String,
      enum: ['Verified', 'Pending', 'Community-Confirmed'],
      default: 'Verified',
      index: true,
    },
    isCurrentSessionReport: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

studentSessionReportSchema.index({ collegeId: 1, seasonId: 1, departmentId: 1 });

const StudentSessionReport = mongoose.model('StudentSessionReport', studentSessionReportSchema);

module.exports = StudentSessionReport;
