const mongoose = require('mongoose');

const collegeReviewSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    graduationYear: {
      type: Number,
      required: true,
    },
    branch: {
      type: String,
      default: 'Computer Science & Engineering',
    },
    authorDisplayName: {
      type: String,
      default: 'Anonymous Student',
    },
    isPseudonymous: {
      type: Boolean,
      default: true,
    },
    isVerifiedStudentBadge: {
      type: Boolean,
      default: true,
    },
    verificationProofType: {
      type: String,
      default: 'Institutional Roll ID & Portal Verified',
    },
    reportedStats: {
      medianPackageLPA: { type: Number, default: null },
      averagePackageLPA: { type: Number, default: null },
      highestPackageLPA: { type: Number, default: null },
      actualPlacementRate: { type: Number, default: null },
      dreamOffersPercent: { type: Number, default: null },
      batchSizeEstimate: { type: Number, default: null },
    },
    ratings: {
      placementSupport: { type: Number, min: 1, max: 5, required: true },
      internshipSupport: { type: Number, min: 1, max: 5, required: true },
      teachingAcademics: { type: Number, min: 1, max: 5, required: true },
      infrastructure: { type: Number, min: 1, max: 5, required: true },
      campusExperience: { type: Number, min: 1, max: 5, required: true },
      careerPrep: { type: Number, min: 1, max: 5, required: true },
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      maxlength: 120,
    },
    reviewText: {
      type: String,
      required: [true, 'Review text is required'],
      minlength: [30, 'Review text must be at least 30 characters long'],
      maxlength: [3000, 'Review text cannot exceed 3000 characters'],
    },
    pros: {
      type: String,
      maxlength: 1000,
    },
    cons: {
      type: String,
      maxlength: 1000,
    },
    moderationStatus: {
      type: String,
      enum: ['Approved', 'Pending', 'Flagged', 'Rejected'],
      default: 'Approved', // Set to Approved by default unless spam detected
      index: true,
    },
    flaggedReasons: [String],
    reportCount: {
      type: Number,
      default: 0,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderationNotes: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

collegeReviewSchema.pre('save', function (next) {
  if (this.ratings) {
    const scores = [
      this.ratings.placementSupport,
      this.ratings.internshipSupport,
      this.ratings.teachingAcademics,
      this.ratings.infrastructure,
      this.ratings.campusExperience,
      this.ratings.careerPrep,
    ];
    const sum = scores.reduce((a, b) => a + b, 0);
    this.overallRating = Number((sum / scores.length).toFixed(1));
  }
  next();
});

module.exports = mongoose.model('CollegeReview', collegeReviewSchema);
