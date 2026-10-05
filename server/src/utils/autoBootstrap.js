const College = require('../models/College');
const { seedMultiCollegeOfficialData } = require('../seed/seedMultiCollegeOfficialData');
const { seedTop50PrivateColleges } = require('../seeds/seedTop50PrivateColleges');

let isBootstrapping = false;

async function autoBootstrapDatabase() {
  if (isBootstrapping) return;
  isBootstrapping = true;

  try {
    const collegeCount = await College.countDocuments();
    console.log(`[AutoBootstrap] Checking database: ${collegeCount} colleges found.`);

    if (collegeCount >= 50) {
      console.log(`[AutoBootstrap] Database already populated with ${collegeCount} colleges.`);
      isBootstrapping = false;
      return;
    }

    console.log(`[AutoBootstrap] Database has only ${collegeCount} colleges. Auto-populating verified colleges and placement statistics...`);

    // 1. Seed Multi College Official Data (IIT Bombay, IIT Delhi, NIT Trichy, KIIT, VIT, etc.)
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

    // 3. Ensure Strict Tier Classification: IITs & NITs in Tier 1, all rest in Tier 2
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

    const finalCount = await College.countDocuments();
    console.log(`[AutoBootstrap] Complete! Total colleges now in database: ${finalCount}.`);
  } catch (error) {
    console.error(`[AutoBootstrap Error] Failed during auto-bootstrap:`, error.message);
  } finally {
    isBootstrapping = false;
  }
}

module.exports = { autoBootstrapDatabase };
