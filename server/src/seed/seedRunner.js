require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const PlacementSeason = require('../models/PlacementSeason');
const PlacementRecord = require('../models/PlacementRecord');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const Company = require('../models/Company');
const CollegeReview = require('../models/CollegeReview');
const AuditLog = require('../models/AuditLog');

const seedDatabase = async () => {
  console.log('[Seeder] Starting synthetic data seeding for Placement Reality...');

  // Connect to DB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality');
  console.log('[Seeder] Connected to MongoDB');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    College.deleteMany({}),
    Department.deleteMany({}),
    PlacementSeason.deleteMany({}),
    PlacementRecord.deleteMany({}),
    Offer.deleteMany({}),
    Internship.deleteMany({}),
    Company.deleteMany({}),
    CollegeReview.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log('[Seeder] Cleared previous records');

  // 1. Seed Users (Admin, Moderator, Students)
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('AdminPass123!', salt);
  const modPassword = await bcrypt.hash('ModPass123!', salt);
  const studentPassword = await bcrypt.hash('StudentPass123!', salt);

  const admin = await User.create({
    name: 'Platform Administrator',
    email: 'admin@placementreality.org',
    passwordHash: adminPassword,
    role: 'admin',
    isEmailVerified: true,
    isCollegeVerified: true,
    pseudonym: 'Admin_Master',
  });

  const moderator = await User.create({
    name: 'Lead Data Moderator',
    email: 'moderator@placementreality.org',
    passwordHash: modPassword,
    role: 'moderator',
    isEmailVerified: true,
    isCollegeVerified: true,
    pseudonym: 'Mod_Verified',
  });

  console.log('[Seeder] Seeded Administrative & Moderator Accounts');

  // 2. Seed Colleges
  const kiit = await College.create({
    name: 'Kalinga Institute of Industrial Technology',
    slug: 'kiit-bhubaneswar',
    shortName: 'KIIT',
    code: 'KIIT-BBSR',
    state: 'Odisha',
    city: 'Bhubaneswar',
    campusType: 'Private Deemed University',
    establishedYear: 1997,
    website: 'https://kiit.ac.in',
    tierClassification: {
      tier: 'Tier 2',
      rationale: 'Platform Standard Classification: Consistent median packages in 6-7 LPA range, autonomous deemed university status, high recruiter volume with substantial IT service share.',
    },
    nirfRanking: { engineeringRank: 39, overallRank: 55, year: 2024 },
    approvedCourses: ['B.Tech', 'M.Tech', 'MCA', 'MBA'],
    isAutonomous: true,
    accreditation: 'NAAC A++ Grade',
    dataCompletenessScore: 88,
    about: 'KIIT is a major multi-disciplinary institution in eastern India renowned for its large-scale campus placement drives and high-tech infrastructure.',
  });

  const vit = await College.create({
    name: 'Vellore Institute of Technology',
    slug: 'vit-vellore',
    shortName: 'VIT',
    code: 'VIT-VEL',
    state: 'Tamil Nadu',
    city: 'Vellore',
    campusType: 'Private Deemed University',
    establishedYear: 1984,
    website: 'https://vit.ac.in',
    tierClassification: {
      tier: 'Tier 2',
      rationale: 'Platform Standard Classification: Established private university with high student intake, strong national presence, and large-scale centralized placement cell (VITEEE entrance).',
    },
    nirfRanking: { engineeringRank: 11, overallRank: 19, year: 2024 },
    approvedCourses: ['B.Tech', 'M.Tech', 'MCA', 'MBA'],
    isAutonomous: true,
    accreditation: 'NAAC A++ Grade',
    dataCompletenessScore: 82,
    about: 'VIT conducts centralized campus placements across its campuses in Vellore, Chennai, AP, and Bhopal, reporting high offer volume.',
  });

  const iitb = await College.create({
    name: 'Indian Institute of Technology Bombay',
    slug: 'iit-bombay',
    shortName: 'IIT Bombay',
    code: 'IITB',
    state: 'Maharashtra',
    city: 'Mumbai',
    campusType: 'IIT',
    establishedYear: 1958,
    website: 'https://iitb.ac.in',
    tierClassification: {
      tier: 'Tier 1',
      rationale: 'Platform Standard Classification: Premier Institute of National Importance admitted through JEE Advanced with premier international & high-median recruitment.',
    },
    nirfRanking: { engineeringRank: 3, overallRank: 3, year: 2024 },
    approvedCourses: ['B.Tech', 'M.Tech', 'Dual Degree', 'Ph.D.'],
    isAutonomous: true,
    accreditation: 'Institute of Eminence (IoE)',
    dataCompletenessScore: 94,
    about: 'IIT Bombay is one of the premier engineering and research institutions globally, situated in Powai, Mumbai.',
  });

  const mitMuz = await College.create({
    name: 'Muzaffarpur Institute of Technology',
    slug: 'mit-muzaffarpur',
    shortName: 'MIT Muzaffarpur',
    code: 'MIT-MUZ',
    state: 'Bihar',
    city: 'Muzaffarpur',
    campusType: 'State University',
    establishedYear: 1954,
    website: 'https://mitmuzaffarpur.org',
    tierClassification: {
      tier: 'Tier 3',
      rationale: 'Platform Standard Classification: Government state engineering college with admission via BCECE/JEE Main; primarily off-campus and regional service drives.',
    },
    nirfRanking: { engineeringRank: null, overallRank: null, year: 2024 },
    approvedCourses: ['B.Tech', 'M.Tech'],
    isAutonomous: false,
    accreditation: 'AICTE Approved, Affiliated to BEU',
    dataCompletenessScore: 62,
    about: 'One of the oldest government engineering colleges in Bihar, established in 1954.',
  });

  console.log('[Seeder] Seeded Colleges across Tier 1, 2, and 3');

  // 3. Seed Departments
  const kiitCse = await Department.create({ collegeId: kiit._id, name: 'Computer Science and Engineering', code: 'CSE', degreeLevel: 'B.Tech', totalSeats: 1200 });
  const kiitEce = await Department.create({ collegeId: kiit._id, name: 'Electronics and Communication Engineering', code: 'ECE', degreeLevel: 'B.Tech', totalSeats: 480 });
  const kiitIt = await Department.create({ collegeId: kiit._id, name: 'Information Technology', code: 'IT', degreeLevel: 'B.Tech', totalSeats: 360 });
  const kiitChem = await Department.create({ collegeId: kiit._id, name: 'Chemical Engineering', code: 'CHE', degreeLevel: 'B.Tech', totalSeats: 120 });

  const vitCse = await Department.create({ collegeId: vit._id, name: 'Computer Science and Engineering', code: 'CSE', degreeLevel: 'B.Tech', totalSeats: 1800 });
  const vitEce = await Department.create({ collegeId: vit._id, name: 'Electronics and Communication Engineering', code: 'ECE', degreeLevel: 'B.Tech', totalSeats: 600 });

  const iitbCse = await Department.create({ collegeId: iitb._id, name: 'Computer Science and Engineering', code: 'CSE', degreeLevel: 'B.Tech', totalSeats: 120 });
  const iitbEe = await Department.create({ collegeId: iitb._id, name: 'Electrical Engineering', code: 'EE', degreeLevel: 'B.Tech', totalSeats: 160 });

  const mitCse = await Department.create({ collegeId: mitMuz._id, name: 'Computer Science and Engineering', code: 'CSE', degreeLevel: 'B.Tech', totalSeats: 60 });
  const mitCivil = await Department.create({ collegeId: mitMuz._id, name: 'Civil Engineering', code: 'CE', degreeLevel: 'B.Tech', totalSeats: 60 });

  // 4. Seed Students
  const student1 = await User.create({
    name: 'Rahul Sharma',
    email: 'student.rahul@kiit.ac.in',
    passwordHash: studentPassword,
    role: 'student',
    collegeId: kiit._id,
    departmentId: kiitCse._id,
    graduationYear: 2024,
    isCollegeVerified: true,
    collegeVerificationStatus: 'verified',
    pseudonym: 'CodeWarrior_24',
    privacyConsent: true,
  });

  const student2 = await User.create({
    name: 'Ananya Iyer',
    email: 'student.ananya@vit.ac.in',
    passwordHash: studentPassword,
    role: 'student',
    collegeId: vit._id,
    departmentId: vitCse._id,
    graduationYear: 2024,
    isCollegeVerified: false, // Selected college, but unverified document demo!
    collegeVerificationStatus: 'unverified',
    pseudonym: 'DevAnanya_V',
    privacyConsent: true,
  });

  const student3 = await User.create({
    name: 'Arjun Verma',
    email: 'student.arjun@iitb.ac.in',
    passwordHash: studentPassword,
    role: 'student',
    collegeId: iitb._id,
    departmentId: iitbCse._id,
    graduationYear: 2024,
    isCollegeVerified: true,
    collegeVerificationStatus: 'verified',
    pseudonym: 'IITB_AlgoNerd',
    privacyConsent: true,
  });

  // 5. Seed Placement Seasons
  const kiitSeason24 = await PlacementSeason.create({
    collegeId: kiit._id,
    academicYear: '2023-2024',
    seasonStatus: 'Concluded',
    officialReportPublished: true,
    dataCompletenessRating: 'Comprehensive',
    methodologyNotes: 'NIRF 2024 submission and verified student offer letters. Denominator reflects eligible graduates as confirmed by Institute Career Advisory & Placement Services (CRPS).',
  });

  const kiitSeason25 = await PlacementSeason.create({
    collegeId: kiit._id,
    academicYear: '2024-2025',
    seasonStatus: 'Ongoing',
    officialReportPublished: false,
    dataCompletenessRating: 'Partial',
    methodologyNotes: 'Ongoing placement cycle. Data updated as verification cohorts conclude.',
  });

  const vitSeason24 = await PlacementSeason.create({
    collegeId: vit._id,
    academicYear: '2023-2024',
    seasonStatus: 'Concluded',
    officialReportPublished: true,
    dataCompletenessRating: 'Substantial',
    methodologyNotes: 'Official Placement Office report. Notice: The total eligible candidates denominator is not publicly disclosed in the brochure; total offers (12,018) include multiple offers per student.',
  });

  const iitbSeason24 = await PlacementSeason.create({
    collegeId: iitb._id,
    academicYear: '2023-2024',
    seasonStatus: 'Concluded',
    officialReportPublished: true,
    dataCompletenessRating: 'Comprehensive',
    methodologyNotes: 'Official IIT Bombay Placement Cell report and NIRF 2024 mandatory disclosure. Includes Phase 1 and Phase 2 placements.',
  });

  const mitSeason24 = await PlacementSeason.create({
    collegeId: mitMuz._id,
    academicYear: '2023-2024',
    seasonStatus: 'Concluded',
    officialReportPublished: false,
    dataCompletenessRating: 'Partial',
    methodologyNotes: 'Synthesized from student verification submissions, pool drives, and RTI data.',
  });
  console.log("[Seeder] Placement seasons established.");
  console.log("[Seeder] Database initialized with clean foundation. No fake placement or internship records created.");
  await mongoose.disconnect();
};

seedDatabase().catch((err) => {
  console.error("[Seeder Error]", err);
  process.exit(1);
});
