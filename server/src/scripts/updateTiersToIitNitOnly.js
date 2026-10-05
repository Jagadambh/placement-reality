const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const College = require('../models/College');

async function updateTiers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement-reality';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB at', mongoUri);

    const allColleges = await College.find({});
    console.log(`Found ${allColleges.length} colleges.`);

    let t1Count = 0;
    let t2Count = 0;

    for (const college of allColleges) {
      const isIit = /^Indian Institute of Technology/i.test(college.name) || 
                    college.campusType === 'IIT' || 
                    college.institutionCategory?.subCategory === 'IIT' ||
                    /^(IIT|IIT-)/i.test(college.shortName || '') ||
                    /^(IIT|IIT-)/i.test(college.code || '');

      const isNit = /^National Institute of Technology/i.test(college.name) || 
                    college.campusType === 'NIT' || 
                    college.institutionCategory?.subCategory === 'NIT' ||
                    /^(NIT|NIT-)/i.test(college.shortName || '') ||
                    /^(NIT|NIT-)/i.test(college.code || '');

      if (isIit || isNit) {
        college.tierClassification = {
          tier: 'Tier 1',
          rationale: 'Institute of National Importance (Tier 1)',
          lastReviewed: new Date(),
        };
        t1Count++;
        console.log(`[Tier 1] -> ${college.name} (${college.shortName})`);
      } else {
        college.tierClassification = {
          tier: 'Tier 2',
          rationale: 'Platform Tier 2 Classification (Tier 1 reserved exclusively for IITs and NITs)',
          lastReviewed: new Date(),
        };
        t2Count++;
      }

      await college.save();
    }

    console.log(`\nUpdated summary:`);
    console.log(`Tier 1 (IITs & NITs): ${t1Count}`);
    console.log(`Tier 2 (Rest): ${t2Count}`);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating tiers:', error);
    process.exit(1);
  }
}

updateTiers();
