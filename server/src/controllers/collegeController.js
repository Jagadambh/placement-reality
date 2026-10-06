const College = require('../models/College');
const Department = require('../models/Department');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { recordAuditLog } = require('../services/auditService');
const { ensureCollegeSessions } = require('../utils/academicSessionHelper');
const { validateUrlForCrawling } = require('../utils/urlValidator');
const mongoose = require('mongoose');
const { queueBackgroundPlacementDiscovery } = require('../services/placementDiscoveryJobService');
const { aggregateStudentVerifiedIntelligence } = require('../services/studentVerifiedAggregationService');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');

// @desc Get colleges directory with search and filter
// @route GET /api/colleges
const getColleges = async (req, res, next) => {
  try {
    const { search, state, city, tier, course, category, page = 1, limit = 20 } = req.query;

    const query = {};

    if (category) {
      query['institutionCategory.category'] = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    if (state) {
      query.state = { $regex: `^${state}$`, $options: 'i' };
    }

    if (city) {
      query.city = { $regex: `^${city}$`, $options: 'i' };
    }

    if (tier) {
      query['tierClassification.tier'] = tier;
    }

    if (course) {
      query.approvedCourses = { $in: [course] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await College.countDocuments(query);
    const colleges = await College.find(query)
      .sort({ dataCompletenessScore: -1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach latest season metrics preview to each college card
    const collegesWithStats = await Promise.all(
      colleges.map(async (college) => {
        const latestRecord = await PlacementRecord.findOne({ collegeId: college._id })
          .populate('seasonId', 'academicYear')
          .sort({ createdAt: -1 });

        return {
          ...college.toObject(),
          latestStatsPreview: latestRecord
            ? {
                academicYear: latestRecord.academicSession || latestRecord.seasonId?.academicYear || latestRecord.reportingYear || '2023–24',
                medianPackageLPA: latestRecord.medianPackageLPA,
                averagePackageLPA: latestRecord.averagePackageLPA,
                highestPackageLPA: latestRecord.highestPackageLPA,
                uniqueStudentsPlaced: latestRecord.uniqueStudentsPlaced,
                totalJobOffers: latestRecord.totalJobOffers,
                verificationStatus: latestRecord.verificationStatus,
                confidenceScore: latestRecord.confidenceScore,
              }
            : null,
        };
      })
    );

    return sendSuccess(
      res,
      {
        colleges: collegesWithStats,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
      'Colleges directory fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get single college by slug or ID
// @route GET /api/colleges/:slugOrId
const getCollegeBySlug = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    let college;

    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      college = await College.findById(slugOrId);
    } else {
      college = await College.findOne({ slug: slugOrId.toLowerCase() });
    }

    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const departments = await Department.find({ collegeId: college._id }).sort({ name: 1 });
    const seasons = await ensureCollegeSessions(college._id);

    return sendSuccess(
      res,
      {
        college,
        departments,
        seasons,
      },
      'College details fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Create college (Admin)
// @route POST /api/colleges
const createCollege = async (req, res, next) => {
  try {
    const {
      name,
      shortName,
      code,
      state,
      city,
      campusType,
      establishedYear,
      website,
      tierClassification,
      approvedCourses,
      about,
      accreditation,
    } = req.body;

    const slug = (shortName || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (website) {
      const urlCheck = await validateUrlForCrawling(website);
      if (!urlCheck.valid) {
        return sendError(res, `Official website validation failed: ${urlCheck.reason}`, 400);
      }
    }

    const college = await College.create({
      name,
      slug,
      shortName,
      code,
      state,
      city,
      campusType,
      establishedYear,
      website: website?.trim() || '',
      placementDiscovery: {
        status: website ? 'pending' : 'idle',
        message: website ? 'Placement data discovery queued for official website...' : 'No official website provided.',
      },
      tierClassification: {
        tier: tierClassification?.tier || 'Unclassified',
        rationale:
          tierClassification?.rationale ||
          'Editable platform classification based on NIRF cutoffs and placement telemetry.',
      },
      approvedCourses: approvedCourses || ['B.Tech', 'M.Tech'],
      about,
      accreditation,
      createdBy: req.user._id,
    });

    await recordAuditLog({
      actionType: 'CREATE',
      entityType: 'College',
      entityId: college._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: 'New college profile registered in platform directory',
      newValues: college.toObject(),
    });

    if (college.website) {
      queueBackgroundPlacementDiscovery(college._id, { initiatedBy: req.user?._id });
    }

    return sendSuccess(res, { college }, 'College created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc Update college (Admin)
// @route PUT /api/colleges/:id
const updateCollege = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { changeReason, ...updates } = req.body;

    const college = await College.findById(id);
    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const oldState = college.toObject();

    if (updates.tierClassification) {
      college.tierClassification = {
        ...college.tierClassification.toObject(),
        ...updates.tierClassification,
        lastReviewed: new Date(),
      };
      delete updates.tierClassification;
    }

    Object.assign(college, updates);
    await college.save();

    await recordAuditLog({
      actionType: updates.tierClassification ? 'TIER_CLASSIFICATION_CHANGE' : 'UPDATE',
      entityType: 'College',
      entityId: college._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: changeReason || 'Administrative update of college details',
      oldValues: oldState,
      newValues: college.toObject(),
    });

    return sendSuccess(res, { college }, 'College updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Get departments for a college
// @route GET /api/colleges/:id/departments
const getCollegeDepartments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const departments = await Department.find({ collegeId: id }).sort({ name: 1 });
    return sendSuccess(res, { departments }, 'Departments fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Get placement seasons for a college
// @route GET /api/colleges/:id/seasons
const getCollegeSeasons = async (req, res, next) => {
  try {
    const { id } = req.params;
    const seasons = await ensureCollegeSessions(id);
    return sendSuccess(res, { seasons }, 'Seasons fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Submit newly established or unlisted college (Available to students & public)
// @route POST /api/colleges/submit-unlisted
const submitUnlistedCollege = async (req, res, next) => {
  try {
    const {
      name,
      shortName,
      code,
      state,
      city,
      campusType = 'Private Institute',
      establishedYear,
      isNewlyEstablished = false,
      firstGraduatingBatchYear,
      website,
      officialPlacementPageUrl,
      nirfRank,
      nirfRanking,
      approvedCourses,
      initialDepartments,
      about,
      submissionNotes,
      aicteApprovalOrAffiliation,
    } = req.body;

    if (!name || !state || !city) {
      return sendError(res, 'College name, state, and city are mandatory.', 400);
    }

    if (website) {
      const urlCheck = await validateUrlForCrawling(website);
      if (!urlCheck.valid) {
        return sendError(res, `Official website validation failed: ${urlCheck.reason}`, 400);
      }
    }

    // Check if college already exists
    const existing = await College.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
        ...(shortName ? [{ shortName: { $regex: new RegExp(`^${shortName.trim()}$`, 'i') }, city: { $regex: new RegExp(`^${city.trim()}$`, 'i') } }] : []),
      ],
    });

    if (existing) {
      const depts = await Department.find({ collegeId: existing._id });
      return sendSuccess(
        res,
        { college: existing, departments: depts, alreadyExisted: true },
        `"${existing.name}" is already cataloged on Placement Reality. You can select it directly.`
      );
    }

    // Generate unique slug
    let baseSlug = (shortName || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await College.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const estYear = establishedYear ? parseInt(establishedYear, 10) : new Date().getFullYear();
    const isNew = Boolean(isNewlyEstablished || (estYear && estYear >= 2020));

    const college = await College.create({
      name: name.trim(),
      slug,
      shortName: shortName?.trim() || name.slice(0, 10).toUpperCase(),
      code: code?.trim() || shortName?.trim() || slug.slice(0, 8).toUpperCase(),
      state: state.trim(),
      city: city.trim(),
      campusType,
      establishedYear: estYear,
      isNewlyEstablished: isNew,
      firstGraduatingBatchYear: firstGraduatingBatchYear ? parseInt(firstGraduatingBatchYear, 10) : (isNew ? estYear + 4 : null),
      isCommunitySubmitted: true,
      submissionNotes: submissionNotes || 'Submitted by student via the unlisted college registration workflow.',
      aicteApprovalOrAffiliation: aicteApprovalOrAffiliation || '',
      website: website?.trim() || '',
      officialPlacementPageUrl: officialPlacementPageUrl?.trim() || null,
      nirfRanking: nirfRanking || (nirfRank ? { engineeringRank: parseInt(nirfRank, 10), year: new Date().getFullYear() } : undefined),
      placementDiscovery: {
        status: website ? 'pending' : 'idle',
        message: website
          ? 'Placement data discovery queued. System will automatically extract official reports from official website.'
          : 'No official website provided.',
      },
      tierClassification: {
        tier: 'Unclassified',
        rationale: isNew
          ? `Newly established campus (Est. ${estYear}). First placement cohorts graduating around ${firstGraduatingBatchYear || estYear + 4}. Placement telemetry will be recorded as recruitment seasons conclude.`
          : 'Community-submitted institution. Pending platform verification and NIRF disclosure corroboration.',
      },
      approvedCourses: Array.isArray(approvedCourses)
        ? approvedCourses
        : (approvedCourses ? approvedCourses.split(',').map(s => s.trim()) : ['B.Tech']),
      about: about || `Newly registered college in ${city}, ${state}. Added to enable placement tracking and transparency for current cohorts.`,
      accreditation: aicteApprovalOrAffiliation || 'Awaiting Affiliation Review',
      dataCompletenessScore: 35,
      isVerifiedByAdmin: false,
      createdBy: req.user ? req.user._id : null,
    });

    // Automatically create default initial departments
    const defaultDeptList = [];
    if (initialDepartments && Array.isArray(initialDepartments)) {
      initialDepartments.forEach(d => {
        if (typeof d === 'string' && d.trim()) {
          defaultDeptList.push({ name: d.trim(), code: d.trim().slice(0, 6).toUpperCase() });
        } else if (d.name && d.code) {
          defaultDeptList.push({ name: d.name.trim(), code: d.code.trim().toUpperCase() });
        }
      });
    } else if (typeof initialDepartments === 'string' && initialDepartments.trim()) {
      initialDepartments.split(',').forEach(d => {
        const clean = d.trim();
        if (clean) defaultDeptList.push({ name: clean, code: clean.slice(0, 6).toUpperCase() });
      });
    }

    if (defaultDeptList.length === 0) {
      defaultDeptList.push(
        { name: 'Computer Science and Engineering', code: 'CSE' },
        { name: 'Electronics and Communication Engineering', code: 'ECE' }
      );
    }

    const createdDepts = await Promise.all(
      defaultDeptList.map(d =>
        Department.create({
          collegeId: college._id,
          name: d.name,
          code: d.code,
          degreeLevel: 'B.Tech',
        })
      )
    );

    // Create current placement season for immediate offer/internship submissions
    const currentAcademicYear = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    const season = await PlacementSeason.create({
      collegeId: college._id,
      academicYear: currentAcademicYear,
      seasonStatus: 'Ongoing',
      dataCompletenessRating: 'Initial',
      methodologyNotes: isNew
        ? 'Initial placement season for newly established campus. Awaiting verified student submissions.'
        : 'Student-initiated college profile. Verified student submissions will populate benchmarks.',
      createdBy: req.user ? req.user._id : null,
    });

    // Record in audit log
    await recordAuditLog({
      actionType: 'CREATE',
      entityType: 'College',
      entityId: college._id,
      performedBy: req.user ? req.user._id : college._id,
      performedByEmail: req.user ? req.user.email : 'community-student@guest.org',
      performedByRole: req.user ? req.user.role : 'student',
      changeReason: `Community submission of ${isNew ? 'newly established' : 'unlisted'} college: ${college.name}`,
      newValues: college.toObject(),
    });

    // Asynchronously kick off official placement discovery if website exists
    if (college.website) {
      queueBackgroundPlacementDiscovery(college._id, { initiatedBy: req.user?._id });
    }

    return sendSuccess(
      res,
      {
        college,
        departments: createdDepts,
        season,
      },
      isNew
        ? `"${college.name}" has been successfully added as a newly established college! You can now select it, submit offers, or write reviews.`
        : `"${college.name}" has been registered! You can now select it directly.`,
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get placement discovery status & telemetry for college
// @route GET /api/colleges/:id/discovery-status
const getCollegeDiscoveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id).select('name website placementDiscovery');
    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const officialRecords = await PlacementRecord.find({
      collegeId: college._id,
      $or: [
        { isOfficialSource: true },
        { recordType: 'Official Report' },
        { reportingSource: { $in: ['Official Institute Website', 'Official Institute Report'] } },
      ],
    })
      .select('academicYear reportingYear academicSession highestPackageLPA averagePackageLPA medianPackageLPA lowestPackageLPA totalJobOffers uniqueRecruitersCount uniqueStudentsPlaced totalEligibleStudents topRecruiters sourceUrl documentName isOfficialSource verificationStatus recordType')
      .sort({ academicYear: -1, reportingYear: -1 });

    return sendSuccess(res, {
      collegeId: college._id,
      name: college.name,
      website: college.website,
      placementDiscovery: college.placementDiscovery || { status: 'idle', message: 'No discovery run yet.' },
      officialRecordsCount: officialRecords.length,
      officialRecords,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Manually trigger or refresh official placement discovery
// @route POST /api/colleges/:id/discover-placements
const triggerCollegeDiscovery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id);
    if (!college) {
      return sendError(res, 'College not found', 404);
    }
    if (!college.website) {
      return sendError(res, 'College does not have an official website configured.', 400);
    }

    const urlCheck = await validateUrlForCrawling(college.website);
    if (!urlCheck.valid) {
      return sendError(res, `Official website is invalid: ${urlCheck.reason}`, 400);
    }

    // Queue in background so it doesn't block response
    queueBackgroundPlacementDiscovery(college._id, {
      initiatedBy: req.user?._id,
      manualTrigger: true,
    });

    return sendSuccess(res, {
      message: 'Placement discovery has been queued. Crawling official domain...',
      collegeId: college._id,
      status: 'pending',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Classify institution category and data policy (Admin / Moderator)
// @route PUT /api/colleges/:id/classify
const classifyInstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, subCategory, classificationNotes } = req.body;

    if (!category || !['Category A: Premium Public', 'Category B: Private'].includes(category)) {
      return sendError(res, 'Valid category is required ("Category A: Premium Public" or "Category B: Private")', 400);
    }

    const college = await College.findById(id);
    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const oldCategory = college.institutionCategory ? college.institutionCategory.toObject() : null;

    college.institutionCategory = {
      category,
      subCategory: subCategory || (category === 'Category A: Premium Public' ? 'IIT' : 'Private University'),
      policyType: category === 'Category A: Premium Public' ? 'Premium Public Policy' : 'Strict Private Verification Policy',
      classifiedBy: req.user._id,
      classifiedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      classificationNotes: classificationNotes || 'Institution classified by platform moderator.',
    };

    await college.save();

    await recordAuditLog({
      actionType: 'CLASSIFY_INSTITUTION',
      entityType: 'College',
      entityId: college._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByRole: req.user.role,
      changeReason: `Classified college as ${category} (${college.institutionCategory.subCategory}). Notes: ${classificationNotes || 'N/A'}`,
      oldValues: oldCategory,
      newValues: college.institutionCategory,
    });

    return sendSuccess(res, { college }, `Institution successfully classified as ${category}`);
  } catch (error) {
    next(error);
  }
};

// @desc Get Top 50 Curated Private Engineering Colleges in India with verified benchmarks
// @route GET /api/colleges/top-50-private
const getTop50PrivateColleges = async (req, res, next) => {
  try {
    const {
      search,
      state,
      city,
      branch,
      accreditation,
      minHighestPackage,
      minAveragePackage,
      minMedianPackage,
      sortBy = 'rank',
      sortOrder = 'asc',
      page,
      limit,
    } = req.query;

    const query = { isTop50Private: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }

    if (state) {
      query.state = { $regex: `^${state}$`, $options: 'i' };
    }

    if (city) {
      query.city = { $regex: `^${city}$`, $options: 'i' };
    }

    if (branch) {
      query.majorBranches = { $regex: branch, $options: 'i' };
    }

    if (accreditation) {
      query.naacGrade = { $regex: `^${accreditation}$`, $options: 'i' };
    }

    // Fetch matching Top 50 colleges
    const colleges = await College.find(query).lean();

    // Attach latest placement records and official reports
    const collegeIds = colleges.map((c) => c._id);

    // Get all official placement records for these colleges
    const records = await PlacementRecord.find({
      collegeId: { $in: collegeIds },
    })
      .sort({ academicSession: -1, createdAt: -1 })
      .lean();

    // Get official reports
    const officialReports = await OfficialPlacementReport.find({
      collegeId: { $in: collegeIds },
    })
      .sort({ academicSession: -1 })
      .lean();

    // Map records and reports by collegeId
    const recordsByCollege = {};
    for (const rec of records) {
      const cid = rec.collegeId.toString();
      if (!recordsByCollege[cid]) recordsByCollege[cid] = [];
      recordsByCollege[cid].push(rec);
    }

    const reportsByCollege = {};
    for (const rep of officialReports) {
      const cid = rep.collegeId.toString();
      if (!reportsByCollege[cid]) reportsByCollege[cid] = [];
      reportsByCollege[cid].push(rep);
    }

    let enrichedColleges = colleges.map((college) => {
      const cid = college._id.toString();
      const collegeRecords = recordsByCollege[cid] || [];
      const collegeReports = reportsByCollege[cid] || [];

      // Find the most recent record
      const latestRecord = collegeRecords[0] || null;

      // Extract sessions available
      const availableSessions = collegeRecords.map((r) => r.academicSession).filter(Boolean);

      return {
        ...college,
        latestPlacementRecord: latestRecord
          ? {
              academicSession: latestRecord.academicSession,
              reportingYear: latestRecord.reportingYear,
              highestPackageLPA: latestRecord.highestPackageLPA,
              averagePackageLPA: latestRecord.averagePackageLPA,
              medianPackageLPA: latestRecord.medianPackageLPA,
              uniqueStudentsPlaced: latestRecord.uniqueStudentsPlaced,
              totalJobOffers: latestRecord.totalJobOffers,
              uniqueRecruitersCount: latestRecord.uniqueRecruitersCount,
              topRecruiters: latestRecord.topRecruiters || [],
              sourceUrl: latestRecord.sourceUrl,
              verificationLevel: latestRecord.verificationLevel,
              verificationStatus: latestRecord.verificationStatus,
              isOfficialSource: latestRecord.isOfficialSource,
            }
          : null,
        placementRecordsHistory: collegeRecords.map((r) => ({
          academicSession: r.academicSession,
          highestPackageLPA: r.highestPackageLPA,
          averagePackageLPA: r.averagePackageLPA,
          medianPackageLPA: r.medianPackageLPA,
          uniqueStudentsPlaced: r.uniqueStudentsPlaced,
          totalJobOffers: r.totalJobOffers,
          uniqueRecruitersCount: r.uniqueRecruitersCount,
          sourceUrl: r.sourceUrl,
          verificationLevel: r.verificationLevel,
        })),
        availableSessions: [...new Set(availableSessions)],
        officialReportsCount: collegeReports.length,
        officialReportsPreview: collegeReports.slice(0, 3).map((r) => ({
          documentTitle: r.documentTitle,
          reportUrl: r.reportUrl,
          academicSession: r.academicSession,
          status: r.status,
        })),
      };
    });

    // Package threshold filters
    if (minHighestPackage) {
      const minH = parseFloat(minHighestPackage);
      if (!isNaN(minH)) {
        enrichedColleges = enrichedColleges.filter(
          (c) => (c.latestPlacementRecord?.highestPackageLPA || 0) >= minH
        );
      }
    }
    if (minAveragePackage) {
      const minA = parseFloat(minAveragePackage);
      if (!isNaN(minA)) {
        enrichedColleges = enrichedColleges.filter(
          (c) => (c.latestPlacementRecord?.averagePackageLPA || 0) >= minA
        );
      }
    }
    if (minMedianPackage) {
      const minM = parseFloat(minMedianPackage);
      if (!isNaN(minM)) {
        enrichedColleges = enrichedColleges.filter(
          (c) => (c.latestPlacementRecord?.medianPackageLPA || 0) >= minM
        );
      }
    }

    // Sorting
    enrichedColleges.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'highestPackage':
        case 'highest_desc':
          comparison = (b.latestPlacementRecord?.highestPackageLPA || 0) - (a.latestPlacementRecord?.highestPackageLPA || 0);
          break;
        case 'averagePackage':
        case 'average_desc':
          comparison = (b.latestPlacementRecord?.averagePackageLPA || 0) - (a.latestPlacementRecord?.averagePackageLPA || 0);
          break;
        case 'medianPackage':
        case 'median_desc':
          comparison = (b.latestPlacementRecord?.medianPackageLPA || 0) - (a.latestPlacementRecord?.medianPackageLPA || 0);
          break;
        case 'recruiters':
        case 'recruiters_desc':
          comparison = (b.latestPlacementRecord?.uniqueRecruitersCount || 0) - (a.latestPlacementRecord?.uniqueRecruitersCount || 0);
          break;
        case 'nirf':
        case 'nirf_asc':
          comparison = (a.nirfRanking?.engineeringRank || 999) - (b.nirfRanking?.engineeringRank || 999);
          break;
        case 'name':
        case 'name_asc':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rank':
        default:
          comparison = (a.top50Rank || 999) - (b.top50Rank || 999);
          break;
      }
      return sortOrder === 'desc' && !sortBy.endsWith('_desc') ? -comparison : comparison;
    });

    // Compute overview stats for all 50 colleges
    const allTop50 = await College.find({ isTop50Private: true }).lean();
    const states = [...new Set(allTop50.map((c) => c.state).filter(Boolean))].sort();
    const branches = [
      ...new Set(allTop50.flatMap((c) => c.majorBranches || []).filter(Boolean)),
    ].sort();
    const accreditations = ['A++', 'A+', 'A'];

    const totalCount = enrichedColleges.length;
    let paginatedColleges = enrichedColleges;

    if (page && limit) {
      const p = parseInt(page);
      const l = parseInt(limit);
      const skip = (p - 1) * l;
      paginatedColleges = enrichedColleges.slice(skip, skip + l);
    }

    return sendSuccess(
      res,
      {
        colleges: paginatedColleges,
        total: totalCount,
        filterOptions: {
          states,
          branches,
          accreditations,
        },
        methodology: {
          name: 'Transparent National Private Engineering Benchmark 2024–25',
          rankingSource: 'NIRF Engineering 2024 (Ministry of Education, GoI) & NAAC Category Standard',
          rankingYear: 2024,
          sources: [
            'NIRF Engineering 2024 Ranking & Disclosures (Ministry of Education, GoI)',
            'NAAC Accreditation Grade & Cycle Assessments',
            'AICTE Statutory Technical Approval Status',
            'Official Institutional Placement Bulletins & Mandatory Disclosures',
          ],
          exclusions: [
            'IITs (Indian Institutes of Technology)',
            'NITs (National Institutes of Technology)',
            'IIITs (Central / State Government funded)',
            'Central Universities & Government Engineering Colleges',
          ],
          principles: [
            'Separation of Average Package and Median Package: never conflated or assumed identical.',
            'Distinct counts for Unique Students Placed vs Total Job Offers (multi-offer accounting).',
            'No fabricated numbers: Missing figures are designated as "Not Disclosed".',
            'Strict college-specific provenance: Each metric links to its authentic official report URL.',
          ],
        },
      },
      'Top 50 Private Engineering Colleges fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// @desc Get live student-verified placement intelligence (Requirement 4 & 11)
// @route GET /api/colleges/:id/student-verified-intelligence
const getStudentVerifiedIntelligence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seasonId, academicSession, departmentId } = req.query;

    let college = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      college = await College.findById(id);
    }
    if (!college) {
      college = await College.findOne({ slug: id.toLowerCase() });
    }
    if (!college) {
      return sendError(res, 'College not found', 404);
    }

    const summary = await aggregateStudentVerifiedIntelligence(college._id, {
      seasonId,
      academicSession,
      departmentId,
    });

    return sendSuccess(res, summary, 'Student-verified intelligence aggregated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getColleges,
  getTop50PrivateColleges,
  getCollegeBySlug,
  createCollege,
  updateCollege,
  getCollegeDepartments,
  getCollegeSeasons,
  submitUnlistedCollege,
  classifyInstitution,
  getCollegeDiscoveryStatus,
  triggerCollegeDiscovery,
  getStudentVerifiedIntelligence,
};
