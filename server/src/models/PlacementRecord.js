const mongoose = require('mongoose');

const branchPlacementSchema = new mongoose.Schema({
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  departmentName: {
    type: String,
    required: true,
  },
  departmentCode: {
    type: String,
    required: true,
  },
  totalGraduating: {
    type: Number,
    default: null,
  },
  eligibleStudents: {
    type: Number,
    default: null, // Null if undisclosed
  },
  uniqueStudentsPlaced: {
    type: Number,
    required: true,
  },
  totalOffers: {
    type: Number,
    required: true,
  },
  highestPackageLPA: {
    type: Number,
    default: null,
  },
  averagePackageLPA: {
    type: Number,
    default: null,
  },
  medianPackageLPA: {
    type: Number,
    default: null,
  },
  verificationStatus: {
    type: String,
    enum: ['Officially Reported', 'Student-Verified', 'Community-Reported', 'Estimated/Incomplete', 'Undisclosed'],
    default: 'Student-Verified',
  },
}, { _id: false });

const salaryBucketSchema = new mongoose.Schema({
  rangeLabel: {
    type: String,
    required: true, // e.g. "< 4 LPA", "4 - 8 LPA", "8 - 15 LPA", "15 - 25 LPA", "25+ LPA"
  },
  minLPA: Number,
  maxLPA: Number,
  offerCount: {
    type: Number,
    required: true,
  },
  studentCount: {
    type: Number,
    required: true,
  },
}, { _id: false });

const placementRecordSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementSeason',
      required: [true, 'Placement season reference is required'],
    },
    reportingSource: {
      type: String,
      enum: [
        'Official Institute Report',
        'Official Institute Website',
        'NIRF Mandatory Disclosure',
        'Annual Placement Brochure',
        'Advertised Marketing Brochure',
        'Student-Verified Aggregation',
        'Community Submissions',
        'RTI Disclosure',
        'Composite Platform Model'
      ],
      required: true,
      default: 'Official Institute Report',
    },
    reportingPeriod: {
      type: String,
      default: 'Full Academic Year',
    },
    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },
    // Requirement 5 Verification Levels:
    // 'Officially reported', 'Independently verified', 'Partially verified', 'Unverified'
    verificationLevel: {
      type: String,
      enum: ['Officially reported', 'Independently verified', 'Partially verified', 'Unverified'],
      default: 'Unverified',
      index: true,
    },
    recordType: {
      type: String,
      enum: ['Official Report', 'Advertised Claim', 'Verified Outcome'],
      default: 'Official Report',
      index: true,
    },
    isAdvertisedClaim: {
      type: Boolean,
      default: false,
    },
    isOfficialSource: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: [
        'Officially Reported',
        'Student-Verified',
        'Community-Reported',
        'Estimated/Incomplete',
        'Undisclosed'
      ],
      required: true,
      default: 'Officially Reported',
    },
    // Strict Verification & Approval System
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    sourceUrl: {
      type: String,
      default: null,
      description: 'Official college website or NIRF disclosure source URL',
    },
    reportingYear: {
      type: String,
      default: null,
    },
    academicSession: {
      type: String,
      default: null,
      description: 'Standardized session format (e.g. 2018–19 or 2023–24)',
    },
    documentName: {
      type: String,
      default: null,
      description: 'Original published file or report title',
    },
    lastCheckedDate: {
      type: Date,
      default: Date.now,
    },
    importDate: {
      type: Date,
      default: null,
    },
    importedBy: {
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
    verificationNotes: {
      type: String,
      default: 'Source under review for validation against official institutional reports.',
    },
    // Graduating & Eligible Denominators
    totalGraduatingStudents: {
      type: Number,
      default: null,
    },
    totalEligibleStudents: {
      type: Number,
      default: null, // CRITICAL: If undisclosed, cannot compute rate!
    },
    eligibleDenominatorDisclosed: {
      type: Boolean,
      default: false,
    },
    // Placement counts
    uniqueStudentsPlaced: {
      type: Number,
      required: [true, 'Unique placed students count is required'],
    },
    totalJobOffers: {
      type: Number,
      default: null,
    },
    studentsSeekingPlacement: {
      type: Number,
      default: null, // Null if undisclosed
    },
    // Compensation packages in LPA
    highestPackageLPA: {
      type: Number,
      default: null,
    },
    averagePackageLPA: {
      type: Number,
      default: null,
    },
    medianPackageLPA: {
      type: Number,
      default: null,
    },
    lowestPackageLPA: {
      type: Number,
      default: null,
    },
    // Salary breakdown
    salaryDistribution: [salaryBucketSchema],
    // Recruiter & drive metrics
    uniqueRecruitersCount: {
      type: Number,
      default: null,
    },
    totalRecruitmentDrives: {
      type: Number,
      default: null,
    },
    dreamOffersCount: {
      type: Number, // usually 5-10 LPA
      default: 0,
    },
    superDreamOffersCount: {
      type: Number, // usually 10+ LPA
      default: 0,
    },
    domesticOffersCount: {
      type: Number,
      default: null,
    },
    internationalOffersCount: {
      type: Number,
      default: null,
    },
    // Official Internship Metrics (when disclosed in official report)
    officialPaidInternshipsCount: {
      type: Number,
      default: null,
    },
    officialUnpaidInternshipsCount: {
      type: Number,
      default: null,
    },
    officialHighestStipendInr: {
      type: Number,
      default: null,
    },
    officialAverageStipendInr: {
      type: Number,
      default: null,
    },
    officialMedianStipendInr: {
      type: Number,
      default: null,
    },
    // Branch breakdown
    branchBreakdown: [branchPlacementSchema],
    // Top Recruiters list for this season
    topRecruiters: [
      {
        companyName: String,
        offersCount: Number,
        highestLPA: Number,
        tierCategory: String,
      }
    ],
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    isBaselineRecord: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

placementRecordSchema.index({ collegeId: 1, seasonId: 1, reportingSource: 1 }, { unique: true });

module.exports = mongoose.model('PlacementRecord', placementRecordSchema);
