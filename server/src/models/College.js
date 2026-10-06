const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortName: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    campusType: {
      type: String,
      default: 'Private Institute',
      trim: true,
    },
    establishedYear: {
      type: Number,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
    // Institutional Category & Historical Placement Policy
    institutionCategory: {
      category: {
        type: String,
        default: 'Unclassified',
        trim: true,
        index: true,
      },
      subCategory: {
        type: String,
        default: 'Unclassified',
        trim: true,
      },
      policyType: {
        type: String,
        enum: ['Premium Public Policy', 'Strict Private Verification Policy', 'Standard Policy'],
        default: 'Standard Policy',
      },
      classifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      classifiedAt: {
        type: Date,
        default: Date.now,
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
      classificationNotes: {
        type: String,
        default: 'Classified under platform institution policy standards.',
      },
    },
    // CRITICAL: Platform classification, explicitly defined and editable, NOT an objective absolute truth
    tierClassification: {
      tier: {
        type: String,
        enum: ['Tier 1', 'Tier 2', 'Tier 3', 'Unclassified'],
        default: 'Unclassified',
      },
      rationale: {
        type: String,
        default: 'Platform editorial classification based on verified infrastructure, historical admission rank cutoffs, and median placement metrics.',
      },
      lastReviewed: {
        type: Date,
        default: Date.now,
      },
    },
    nirfRanking: {
      engineeringRank: Number,
      overallRank: Number,
      year: Number,
    },
    // Top 50 Private Engineering Directory Attributes
    top50Rank: {
      type: Number,
      default: null,
      index: true,
    },
    isTop50Private: {
      type: Boolean,
      default: false,
      index: true,
    },
    naacGrade: {
      type: String,
      default: null,
    },
    naacScore: {
      type: Number,
      default: null,
    },
    naacCycle: {
      type: String,
      default: null,
    },
    rankingDetails: {
      rank: Number,
      categoryRank: Number,
      nirfEngineeringRank: Number,
      nirfScore: Number,
      rankingSource: {
        type: String,
        default: 'NIRF Engineering 2024 / MoE National Institutional Ranking Framework',
      },
      rankingYear: {
        type: Number,
        default: 2024,
      },
      methodologyNotes: {
        type: String,
        default: 'Classified under transparent NIRF Engineering private institution category with NAAC corroboration.',
      },
    },
    engineeringPrograms: [
      {
        type: String,
        trim: true,
      },
    ],
    majorBranches: [
      {
        type: String,
        trim: true,
      },
    ],
    admissionExams: [
      {
        type: String,
        trim: true,
      },
    ],
    officialPlacementPageUrl: {
      type: String,
      default: null,
    },
    approvedCourses: [
      {
        type: String,
        trim: true,
      },
    ],
    isAutonomous: {
      type: Boolean,
      default: true,
    },
    accreditation: {
      type: String,
      default: 'NAAC Accredited',
    },
    feeStructure: {
      annualTuitionInr: { type: Number, default: null },
      annualHostelMessInr: { type: Number, default: null },
      oneTimeFeesInr: { type: Number, default: null },
      totalEstimatedCourseFeeInr: { type: Number, default: null }, // 4-year total
      feeCategoryOptions: [
        {
          categoryName: String, // e.g. "Merit (Category 1)", "Category 2", "Management"
          totalFourYearFeeInr: Number,
        },
      ],
      feeDisclosedSourceUrl: String,
    },
    about: {
      type: String,
    },
    contactEmail: {
      type: String,
    },
    dataCompletenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      description: 'Calculated platform index from 0 to 100 based on verified reports vs unverified estimates',
    },
    isVerifiedByAdmin: {
      type: Boolean,
      default: true,
    },
    isNewlyEstablished: {
      type: Boolean,
      default: false,
      description: 'Identifies colleges established recently with nascent or upcoming placement records',
    },
    firstGraduatingBatchYear: {
      type: Number,
      default: null,
      description: 'Graduating batch year for first cohort in newly established college',
    },
    isCommunitySubmitted: {
      type: Boolean,
      default: false,
    },
    submissionNotes: {
      type: String,
      default: '',
    },
    aicteApprovalOrAffiliation: {
      type: String,
      default: '',
    },
    studentVerifiedStats: {
      sampleSize: { type: Number, default: null },
      verifiedStudentOutcomes: { type: Number, default: 0 },
      verifiedPackageRecords: { type: Number, default: 0 },
      placedVerifiedStudents: { type: Number, default: 0 },
      highestPackageLPA: { type: Number, default: null },
      averagePackageLPA: { type: Number, default: null },
      medianPackageLPA: { type: Number, default: null },
      verifiedMedianPackageLPA: { type: Number, default: null },
      lowestPackageLPA: { type: Number, default: null },
      actualPlacementRate: { type: Number, default: null },
      observedPlacementRate: { type: Number, default: null },
      totalVerifiedOffers: { type: Number, default: null },
      dreamOffersPercent: { type: Number, default: null },
      confidenceScore: { type: Number, default: 0 },
      verifiedReviewsCount: { type: Number, default: 0 },
      isLowSample: { type: Boolean, default: false },
      observedCoveragePercentage: { type: Number, default: null },
      hasEnoughData: { type: Boolean, default: false },
      lastUpdated: { type: Date, default: Date.now },
    },
    placementDiscovery: {
      status: {
        type: String,
        enum: ['idle', 'pending', 'in_progress', 'completed', 'no_data_found', 'failed'],
        default: 'idle',
        index: true,
      },
      message: {
        type: String,
        default: '',
      },
      lastRunAt: {
        type: Date,
        default: null,
      },
      pagesCheckedCount: {
        type: Number,
        default: 0,
      },
      documentsDiscoveredCount: {
        type: Number,
        default: 0,
      },
      reportsFoundCount: {
        type: Number,
        default: 0,
      },
      uniqueSessionsFound: [
        {
          type: String,
        },
      ],
      lastSuccessfulSourceUrl: {
        type: String,
        default: null,
      },
      lastError: {
        type: String,
        default: null,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

collegeSchema.pre('save', function (next) {
  if (!this.institutionCategory || !this.institutionCategory.category || this.institutionCategory.category === 'Unclassified') {
    const isPublic = ['IIT', 'NIT', 'IIIT'].includes(this.campusType) ||
      (this.name && (this.name.includes('Indian Institute of Technology') || this.name.includes('National Institute of Technology')));

    if (isPublic) {
      this.institutionCategory = {
        category: 'Category A: Premium Public',
        subCategory: this.campusType === 'IIT' ? 'IIT' : (this.campusType === 'NIT' ? 'NIT' : (this.campusType === 'IIIT' ? 'IIIT' : 'IIT')),
        policyType: 'Premium Public Policy',
        classificationNotes: 'Government public institution under statutory charter.',
        classifiedAt: new Date(),
      };
    } else {
      this.institutionCategory = {
        category: 'Category B: Private',
        subCategory: this.campusType === 'Private Deemed University' ? 'Deemed-to-be University (Private)' : 'Private Engineering College',
        policyType: 'Strict Private Verification Policy',
        classificationNotes: 'Private sector institution subject to mandatory session verification.',
        classifiedAt: new Date(),
      };
    }
  }
  next();
});

collegeSchema.index({ name: 'text', shortName: 'text', city: 'text', state: 'text' });
collegeSchema.index({ isTop50Private: 1, top50Rank: 1 });

module.exports = mongoose.model('College', collegeSchema);
