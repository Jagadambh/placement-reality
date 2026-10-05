require('dotenv').config();
const mongoose = require('mongoose');
const College = require('../models/College');

const collegeFeesData = [
  {
    regex: /Birla Institute.*Pilani/i,
    tuition: 540000,
    hostel: 120000,
    oneTime: 55000,
    total: 2695000,
    categories: [
      { categoryName: 'Merit BITSAT General', totalFourYearFeeInr: 2695000 },
      { categoryName: 'Dual Degree (5-Year M.Sc + B.E.)', totalFourYearFeeInr: 3350000 },
    ],
  },
  {
    regex: /Vellore Institute/i,
    tuition: 198000,
    hostel: 120000,
    oneTime: 12000,
    total: 1284000,
    categories: [
      { categoryName: 'Category 1 (Merit VITEEE)', totalFourYearFeeInr: 1284000 },
      { categoryName: 'Category 2', totalFourYearFeeInr: 1550000 },
      { categoryName: 'Category 3', totalFourYearFeeInr: 1850000 },
      { categoryName: 'Category 4 / 5', totalFourYearFeeInr: 2250000 },
    ],
  },
  {
    regex: /Thapar/i,
    tuition: 450000,
    hostel: 130000,
    oneTime: 30000,
    total: 2350000,
    categories: [
      { categoryName: 'General JEE / TIET Merit', totalFourYearFeeInr: 2350000 },
      { categoryName: 'Punjab Resident Quota', totalFourYearFeeInr: 2350000 },
    ],
  },
  {
    regex: /Kalinga Institute/i,
    tuition: 385000,
    hostel: 120000,
    oneTime: 75000,
    total: 2095000,
    categories: [
      { categoryName: 'KIITEE Merit Regular (CSE/IT)', totalFourYearFeeInr: 2095000 },
      { categoryName: 'Non-AC 2-Bedded Hostel Plan', totalFourYearFeeInr: 1915000 },
      { categoryName: 'Premium AC Single Bedded Plan', totalFourYearFeeInr: 2395000 },
    ],
  },
  {
    regex: /SRM/i,
    tuition: 375000,
    hostel: 135000,
    oneTime: 20000,
    total: 2060000,
    categories: [
      { categoryName: 'SRMJEEE Merit (KTR Campus CSE)', totalFourYearFeeInr: 2060000 },
      { categoryName: 'Core Branches (Mech/Civil/ECE)', totalFourYearFeeInr: 1760000 },
    ],
  },
  {
    regex: /Siksha.*Anusandhan|ITER/i,
    tuition: 275000,
    hostel: 95000,
    oneTime: 15000,
    total: 1495000,
    categories: [
      { categoryName: 'SAAT / JEE Main Regular (CSE)', totalFourYearFeeInr: 1495000 },
      { categoryName: 'Day Scholar (No Hostel)', totalFourYearFeeInr: 1115000 },
    ],
  },
  {
    regex: /Manipal Institute.*MAHE/i,
    tuition: 475000,
    hostel: 140000,
    oneTime: 20000,
    total: 2480000,
    categories: [
      { categoryName: 'MET General Category (CSE/IT)', totalFourYearFeeInr: 2480000 },
    ],
  },
  {
    regex: /R\.V\.|RV College/i,
    tuition: 275000,
    hostel: 110000,
    oneTime: 25000,
    total: 1565000,
    categories: [
      { categoryName: 'KCET Karnataka Merit Quota', totalFourYearFeeInr: 650000 },
      { categoryName: 'COMEDK All India Merit', totalFourYearFeeInr: 1565000 },
      { categoryName: 'Management Quota (CSE)', totalFourYearFeeInr: 3200000 },
    ],
  },
  {
    regex: /B\.M\.S|BMS College/i,
    tuition: 270000,
    hostel: 105000,
    oneTime: 20000,
    total: 1520000,
    categories: [
      { categoryName: 'KCET Merit', totalFourYearFeeInr: 620000 },
      { categoryName: 'COMEDK Merit', totalFourYearFeeInr: 1520000 },
      { categoryName: 'Management Quota', totalFourYearFeeInr: 2800000 },
    ],
  },
  {
    regex: /Ramaiah|MSRIT/i,
    tuition: 270000,
    hostel: 110000,
    oneTime: 20000,
    total: 1540000,
    categories: [
      { categoryName: 'KCET Merit', totalFourYearFeeInr: 620000 },
      { categoryName: 'COMEDK Merit', totalFourYearFeeInr: 1540000 },
    ],
  },
  {
    regex: /Amrita Vishwa/i,
    tuition: 350000,
    hostel: 110000,
    oneTime: 25000,
    total: 1865000,
    categories: [
      { categoryName: 'AEEE Slab 1 (Top Merit)', totalFourYearFeeInr: 1150000 },
      { categoryName: 'AEEE Slab 2 / JEE Main', totalFourYearFeeInr: 1865000 },
      { categoryName: 'AEEE Slab 3', totalFourYearFeeInr: 2250000 },
    ],
  },
  {
    regex: /Chandigarh University/i,
    tuition: 240000,
    hostel: 105000,
    oneTime: 15000,
    total: 1395000,
    categories: [
      { categoryName: 'Regular CSE', totalFourYearFeeInr: 1395000 },
      { categoryName: 'CUCET 50% Scholarship', totalFourYearFeeInr: 915000 },
    ],
  },
  {
    regex: /Lovely Professional/i,
    tuition: 240000,
    hostel: 110000,
    oneTime: 10000,
    total: 1410000,
    categories: [
      { categoryName: 'LPUNEST Category 1 Scholarship', totalFourYearFeeInr: 1050000 },
      { categoryName: 'Regular Standard Fee', totalFourYearFeeInr: 1410000 },
    ],
  },
  {
    regex: /PES University/i,
    tuition: 450000,
    hostel: 125000,
    oneTime: 25000,
    total: 2325000,
    categories: [
      { categoryName: 'KCET Government Quota', totalFourYearFeeInr: 680000 },
      { categoryName: 'PESSAT Merit All India', totalFourYearFeeInr: 2325000 },
    ],
  },
];

async function seedFees() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
  await mongoose.connect(mongoUri);
  console.log('[SeedFees] Connected to MongoDB');

  for (const item of collegeFeesData) {
    const col = await College.findOne({ name: item.regex });
    if (col) {
      col.feeStructure = {
        annualTuitionInr: item.tuition,
        annualHostelMessInr: item.hostel,
        oneTimeFeesInr: item.oneTime,
        totalEstimatedCourseFeeInr: item.total,
        feeCategoryOptions: item.categories,
        feeDisclosedSourceUrl: col.officialPlacementPageUrl || col.website,
      };
      await col.save();
      console.log(`✓ Updated fee structure for: ${col.name} (4-Yr Total: ₹${(item.total / 100000).toFixed(2)}L)`);
    }
  }

  // Set default reasonable benchmark fees for any other colleges without explicit fees
  const unconfigured = await College.find({
    $or: [{ feeStructure: { $exists: false } }, { 'feeStructure.totalEstimatedCourseFeeInr': null }],
  });

  for (const col of unconfigured) {
    const isPublic = col.institutionCategory?.category?.includes('Category A');
    const tuition = isPublic ? 150000 : 250000;
    const hostel = isPublic ? 60000 : 100000;
    const total = tuition * 4 + hostel * 4 + 20000;

    col.feeStructure = {
      annualTuitionInr: tuition,
      annualHostelMessInr: hostel,
      oneTimeFeesInr: 20000,
      totalEstimatedCourseFeeInr: total,
      feeCategoryOptions: [
        { categoryName: isPublic ? 'Standard Public Institutional Fee' : 'Merit / Regular Fee', totalFourYearFeeInr: total },
      ],
      feeDisclosedSourceUrl: col.website,
    };
    await col.save();
  }

  console.log(`✓ Set default benchmark fees for ${unconfigured.length} other colleges.`);
  console.log('Done!');
  process.exit(0);
}

seedFees().catch((err) => {
  console.error(err);
  process.exit(1);
});
