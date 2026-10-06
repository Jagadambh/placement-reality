const mongoose = require('mongoose');
const College = require('../models/College');
const CommunityPost = require('../models/CommunityPost');
const PlacementRecord = require('../models/PlacementRecord');
const OfficialPlacementReport = require('../models/OfficialPlacementReport');
const { seedMultiCollegeOfficialData } = require('../seed/seedMultiCollegeOfficialData');
const { seedTop50PrivateColleges } = require('../seeds/seedTop50PrivateColleges');
const { seedCommunityData } = require('../seeds/seedCommunityPosts');
const { seedVerifiedStudentReportsAndReviews } = require('../seeds/seedVerifiedStudentReportsAndReviews');

let isBootstrapping = false;

async function autoBootstrapDatabase(force = false) {
  if (isBootstrapping) {
    console.log('[AutoBootstrap] Bootstrap is already in progress, skipping duplicate call.');
    return { status: 'in_progress' };
  }
  isBootstrapping = true;

  try {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/placement_reality';
      console.log(`[AutoBootstrap] Connecting to database...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    }

    const collegeCount = await College.countDocuments();
    const top50Count = await College.countDocuments({ isTop50Private: true });
    const postCount = await CommunityPost.countDocuments();
    const recordCount = await PlacementRecord.countDocuments();

    console.log(`[AutoBootstrap] Checking database: ${collegeCount} colleges (${top50Count} Top 50 Private), ${recordCount} placement records, ${postCount} community posts.`);

    const needsColleges = force || collegeCount < 80 || top50Count < 50;
    const needsPosts = force || postCount === 0;

    if (!needsColleges && !needsPosts) {
      console.log(`[AutoBootstrap] Database fully populated. Skipping bootstrap.`);
      return {
        success: true,
        alreadyPopulated: true,
        colleges: collegeCount,
        top50Private: top50Count,
        communityPosts: postCount,
        placementRecords: recordCount,
      };
    }

    // 1. Seed Multi College Official Data (IIT Bombay, IIT Delhi, NIT Trichy, KIIT, VIT, etc.)
    if (needsColleges) {
      console.log(`[AutoBootstrap] Populating core official colleges & verified placement statistics...`);
      try {
        await seedMultiCollegeOfficialData();
        console.log(`[AutoBootstrap] Phase 1 completed: Core colleges & placement stats seeded.`);
      } catch (err) {
        console.error(`[AutoBootstrap] Warning in Phase 1:`, err.message);
      }

      // 2. Seed Top 50 Private Colleges
      try {
        await seedTop50PrivateColleges();
        console.log(`[AutoBootstrap] Phase 2 completed: Top 50 private institutions seeded.`);
      } catch (err) {
        console.error(`[AutoBootstrap] Warning in Phase 2:`, err.message);
      }
    }

    // 3. Seed Community Discussions if empty
    if (needsPosts) {
      console.log(`[AutoBootstrap] Seeding campus community discussions and verified student reviews...`);
      try {
        await seedCommunityData();
        console.log(`[AutoBootstrap] Phase 3 completed: Campus community posts seeded.`);
      } catch (err) {
        console.error(`[AutoBootstrap] Warning in Phase 3:`, err.message);
      }
    }

    // 4. Seed Verified Student Comments & Placement Statistics
    try {
      console.log(`[AutoBootstrap] Seeding verified student comments, ratings, and ground-truth stats...`);
      await seedVerifiedStudentReportsAndReviews();
      console.log(`[AutoBootstrap] Phase 4 completed: Verified student comments and stats seeded.`);
    } catch (err) {
      console.error(`[AutoBootstrap] Warning in Phase 4:`, err.message);
    }

    // 5. Ensure Strict Tier Classification: IITs & NITs in Tier 1, all rest in Tier 2
    const allColleges = await College.find({});
    for (const c of allColleges) {
      const isIit = /^Indian Institute of Technology/i.test(c.name) || 
                    c.campusType === 'IIT' || 
                    c.institutionCategory?.subCategory === 'IIT' ||
                    /^(IIT|IIT-)/i.test(c.shortName || '') ||
                    /^(IIT|IIT-)/i.test(c.code || '');

      const isNit = /^National Institute of Technology/i.test(c.name) || 
                    c.campusType === 'NIT' || 
                    c.institutionCategory?.subCategory === 'NIT' ||
                    /^(NIT|NIT-)/i.test(c.shortName || '') ||
                    /^(NIT|NIT-)/i.test(c.code || '');

      const targetTier = (isIit || isNit) ? 'Tier 1' : 'Tier 2';
      const rationale = (isIit || isNit) 
        ? 'Institute of National Importance (Tier 1)' 
        : 'Platform Tier 2 Classification (Tier 1 reserved exclusively for IITs and NITs)';

      if (c.tierClassification?.tier !== targetTier) {
        c.tierClassification = {
          tier: targetTier,
          rationale,
          lastReviewed: new Date(),
        };
        await c.save();
      }
    }

    const finalColleges = await College.countDocuments();
    const finalTop50 = await College.countDocuments({ isTop50Private: true });
    const finalPosts = await CommunityPost.countDocuments();
    const finalRecords = await PlacementRecord.countDocuments();
    const finalReports = await OfficialPlacementReport.countDocuments();

    console.log(`[AutoBootstrap] Complete! Total colleges: ${finalColleges} (${finalTop50} Top 50 Private), records: ${finalRecords}, posts: ${finalPosts}.`);

    return {
      success: true,
      colleges: finalColleges,
      top50Private: finalTop50,
      communityPosts: finalPosts,
      placementRecords: finalRecords,
      officialReports: finalReports,
    };
  } catch (error) {
    console.error(`[AutoBootstrap Error] Failed during auto-bootstrap:`, error.message);
    return { success: false, error: error.message };
  } finally {
    isBootstrapping = false;
  }
}

module.exports = { autoBootstrapDatabase };
