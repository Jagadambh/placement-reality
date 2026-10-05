const mongoose = require('mongoose');

const uploadedReportSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementSeason',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: ['Official Brochure', 'NIRF Mandatory Disclosure', 'Annual Placement Report', 'RTI Disclosure', 'Audit Agency Report'],
      default: 'Annual Placement Report',
    },
    documentUrl: {
      type: String,
      required: true,
    },
    parsingStatus: {
      type: String,
      enum: ['Uploaded', 'Processing', 'Processed', 'Needs Review'],
      default: 'Processed',
    },
    extractedStats: {
      totalGraduating: Number,
      totalEligible: Number,
      uniquePlaced: Number,
      totalOffers: Number,
      highestLPA: Number,
      averageLPA: Number,
      medianLPA: Number,
      recruiterCount: Number,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('UploadedReport', uploadedReportSchema);
