require('dotenv').config();
const mongoose = require('mongoose');
const CommunityPost = require('../models/CommunityPost');
const CommunityComment = require('../models/CommunityComment');
const College = require('../models/College');
const User = require('../models/User');

const seedCommunityData = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_reality';
      console.log('[SeedCommunity] Connecting to:', mongoUri);
      await mongoose.connect(mongoUri);
    }

    // Fetch colleges for referencing
    const kiit = await College.findOne({ name: /Kalinga Institute/i });
    const vit = await College.findOne({ name: /Vellore Institute/i });
    const bits = await College.findOne({ name: /Birla Institute.*Pilani/i });
    const thapar = await College.findOne({ name: /Thapar/i });
    const srm = await College.findOne({ name: /SRM/i });
    const iter = await College.findOne({ name: /Siksha/i });

    // Fetch or create demo users for comments and posts
    let verifiedUser = await User.findOne({ isCollegeVerified: true });
    if (!verifiedUser) {
      verifiedUser = await User.findOne({});
    }

    const postsToSeed = [
      {
        title: "VIT Vellore vs BITS Pilani Dual Degree: Is the higher fee worth it?",
        content: `Got 89% in BITSAT (likely getting MSc Economics or MSc Physics dual degree) and Category 1 CSE at VIT Vellore. 

Family can manage the BITS fee with an education loan of ~15 Lakhs. My main concern is whether the BITS dual degree workload is manageable to get CSE in year 2, vs the safety of confirmed CSE Category 1 at VIT Vellore.

Looking for seniors from both universities to weigh in on ROI, peer group, and freedom/culture.`,
        postType: 'question',
        flair: 'Ask Campus',
        collegeId: bits ? bits._id : (vit ? vit._id : null),
        collegeName: 'Birla Institute of Technology and Science, Pilani',
        authorName: 'Aditya Gupta',
        authorPseudonym: 'u/BitsAspirant_25',
        authorCollege: 'JEE Aspirant',
        isVerifiedStudent: false,
        tags: ['bits-pilani', 'vit-vellore', 'fees', 'dual-degree', 'roi'],
        upvoteCount: 98,
        viewCount: 2450,
        commentCount: 3,
        comments: [
          {
            authorName: 'Saurav Joshi',
            authorPseudonym: 'u/BITS_Pilani_Alum',
            authorCollege: 'BITS Pilani',
            isVerifiedStudent: true,
            content: "Take BITS dual without hesitation. Zero attendance policy gives you immense freedom, and around 25-30% of dual degree students comfortably get CSE/CS with a ~8.2+ CGPA in year 1. Even if you get Phoenix branches (ECE/EEE), BITS brand & median package (17+ LPA) is leagues ahead.",
            upvoteCount: 45,
          },
          {
            authorName: 'Vignesh R',
            authorPseudonym: 'u/VITian_Senior',
            authorCollege: 'Vellore Institute of Technology',
            isVerifiedStudent: true,
            content: "If you have Category 1 at VIT, your total tuition is around 8 Lakhs, making ROI decent. But if loan repayment is manageable, BITS peer group and PS-1/PS-2 practice school internships are undisputed tier-1 advantages.",
            upvoteCount: 22,
          },
          {
            authorName: 'Priya K',
            authorPseudonym: 'u/Priya_Engg',
            authorCollege: 'Prospective Student',
            isVerifiedStudent: false,
            content: "Also check the MSc Economics cutoffs! Econ + CS dual degree from BITS is considered the gold standard for quant finance and high-frequency trading (HFT) firms in India.",
            upvoteCount: 16,
          },
        ],
      },
      {
        title: "Thapar University Patiala: How strict are branch upgrades after 1st Year?",
        content: `Joined ECE at Thapar through JEE Main score. Want to upgrade to COE (Computer Engineering) or ENC in 2nd year. 

Can seniors share what CGPA cutoff was needed in the December/June counselling for branch change? Do they allow upgrades if you have backlogs in minor subjects?`,
        postType: 'question',
        flair: 'Ask Campus',
        collegeId: thapar ? thapar._id : null,
        collegeName: thapar ? thapar.name : 'Thapar Institute of Engineering and Technology',
        authorName: 'Manpreet Singh',
        authorPseudonym: 'u/Manni_Thapar',
        authorCollege: 'Thapar Institute',
        isVerifiedStudent: true,
        tags: ['thapar', 'branch-change', 'cgpa', 'ece-to-coe'],
        upvoteCount: 64,
        viewCount: 1120,
        commentCount: 2,
        comments: [
          {
            authorName: 'Gurpreet Singh',
            authorPseudonym: 'u/ThaparBatch24',
            authorCollege: 'Thapar Institute',
            isVerifiedStudent: true,
            content: "For COE (Computer Engineering), cutoff generally closes around 8.8-9.1 CGPA. For ENC / EEC, around 8.2-8.5 is sufficient. Absolutely zero backlogs are permitted at the time of branch change application.",
            upvoteCount: 18,
          },
          {
            authorName: 'Karan Mehra',
            authorPseudonym: 'u/Karan_COE',
            authorCollege: 'Thapar Institute',
            isVerifiedStudent: true,
            content: "Study thoroughly for Math-1 and Manufacturing processes in Sem 1. Those two subjects pull down a lot of GPAs. If you stay consistent from Day 1, 9+ is very achievable.",
            upvoteCount: 12,
          },
        ],
      },
      {
        title: "SRM KTR Campus Life: Mess food, Wi-Fi, and Curfew realities for 1st Year Girls?",
        content: `Joining SRM Kattankulathur (KTR) campus this August. Would love honest reviews about:
1. Which hostel block has the best maintenance and food (M-Block vs Senbagam etc.)?
2. Is the campus Wi-Fi fast enough for coding platforms and streaming lectures?
3. How strict is the biometric curfew on weekends for outings to Chennai city?`,
        postType: 'discussion',
        flair: 'Campus Life',
        collegeId: srm ? srm._id : null,
        collegeName: srm ? srm.name : 'SRM Institute of Science and Technology',
        authorName: 'Sneha Patel',
        authorPseudonym: 'u/Sneha_Tech',
        authorCollege: 'SRMIST',
        isVerifiedStudent: false,
        tags: ['srm-ktr', 'hostels', 'campus-life', 'chennai', 'chennai-curfew'],
        upvoteCount: 77,
        viewCount: 1980,
        commentCount: 3,
        comments: [
          {
            authorName: 'Divya N',
            authorPseudonym: 'u/SRM_Girl_Coder',
            authorCollege: 'SRMIST',
            isVerifiedStudent: true,
            content: "Curfew is 6:30 PM for 1st years inside campus hostels initially, but extends to 8:30 PM later with warden gate passes. For Chennai city weekend leaves, you need parent OTP / email approval on the SRM portal.",
            upvoteCount: 31,
          },
          {
            authorName: 'Akash Nair',
            authorPseudonym: 'u/SRM_Senior_23',
            authorCollege: 'SRMIST',
            isVerifiedStudent: true,
            content: "Hostel Wi-Fi blocks gaming sites and certain streaming domains during class hours, but works decent for GitHub and YouTube. Most people end up keeping a Jio 5G or Airtel 5G mobile hotspot as backup.",
            upvoteCount: 19,
          },
          {
            authorName: 'Sneha Patel',
            authorPseudonym: 'u/Sneha_Tech',
            authorCollege: 'SRMIST',
            isVerifiedStudent: false,
            content: "Thank you so much Divya and Akash! Really appreciate the clear heads-up on the parent OTP system.",
            upvoteCount: 9,
          },
        ],
      },
      {
        title: "Should you take an Education Loan for Private Engineering Colleges (15L - 25L)?",
        content: `With private engineering college 4-year total expenses (tuition + hostel + mess + laptops) reaching ₹16L to ₹28L across top private universities in India, a lot of middle-class families are taking SBI Scholar Loans.

Here is a financial risk analysis before you sign the loan papers:
- A ₹20 Lakh loan at 8.5% interest rate over a 10-year repayment tenure has an EMI of approximately ₹24,800/month.
- If your in-hand salary after tax and PF from a ₹8 LPA CTC is roughly ₹52,000/month, nearly 50% of your take-home pay will go into EMI for the first 5-8 years of your career.
- If you're living in Bangalore, Pune, or Gurgaon with rent of ₹15,000-20,000, you will have minimal savings left.

Rule of thumb: Try not to take a loan that exceeds 1.2x of the institution's realistic MEDIAN package (not the advertised highest package!). What are your thoughts?`,
        postType: 'discussion',
        flair: 'Fees & ROI',
        collegeId: null,
        collegeName: 'All Indian Engineering Colleges',
        authorName: 'Placement Reality Analyst',
        authorPseudonym: 'u/Financial_Truth',
        authorCollege: 'Platform Research',
        isVerifiedStudent: true,
        tags: ['education-loan', 'sbi-scholar', 'roi', 'financial-planning', 'emi-reality'],
        upvoteCount: 235,
        viewCount: 4620,
        commentCount: 4,
        isPinned: true,
        comments: [
          {
            authorName: 'Kunal Singhania',
            authorPseudonym: 'u/Kunal_FinTech',
            authorCollege: 'BITS Pilani',
            isVerifiedStudent: true,
            content: "Crucial advice that coaching institutes never tell students. People look at '1 Crore highest package' hoardings and think everyone easily pays off 25 Lakhs loan in 6 months.",
            upvoteCount: 52,
          },
          {
            authorName: 'Rahul Verma',
            authorPseudonym: 'u/Rahul_CSE',
            authorCollege: 'ITER Bhubaneswar',
            isVerifiedStudent: true,
            content: "Golden rule: Always calculate EMI against the MEDIAN package, never the AVERAGE package. Outliers like 50 LPA artificially skew the average upwards by 3-4 LPA.",
            upvoteCount: 39,
          },
        ],
      },
      {
        title: "Is ITER / SOA University good for CSE placements in Eastern India?",
        content: `Looking for options in Odisha / West Bengal region. Comparing ITER (Siksha 'O' Anusandhan) with KIIT and Silicon Institute.

How is the placement scenario at ITER in terms of companies visiting and coding culture? Are faculty supportive of open source and hackathons?`,
        postType: 'question',
        flair: 'Ask Campus',
        collegeId: iter ? iter._id : null,
        collegeName: iter ? iter.name : "Siksha 'O' Anusandhan (ITER)",
        authorName: 'Subrat Mohapatra',
        authorPseudonym: 'u/Subrat_Odisha',
        authorCollege: 'Prospective Student',
        isVerifiedStudent: false,
        tags: ['iter', 'soa', 'bhubaneswar', 'cse-placements'],
        upvoteCount: 48,
        viewCount: 920,
        commentCount: 2,
        comments: [
          {
            authorName: 'Soumya Ranjan',
            authorPseudonym: 'u/ITERian_2024',
            authorCollege: "Siksha 'O' Anusandhan (ITER)",
            isVerifiedStudent: true,
            content: "ITER has solid academics and relatively disciplined environment. Companies like Deloitte, Cognizant, PwC, and Capgemini hire in good numbers. Fee is slightly lower than KIIT, so ROI is comparable.",
            upvoteCount: 17,
          },
        ],
      },
    ];

    console.log('[SeedCommunity] Clearing existing community posts and comments...');
    await CommunityPost.deleteMany({});
    await CommunityComment.deleteMany({});

    for (const postData of postsToSeed) {
      const { comments, ...postFields } = postData;
      const createdPost = await CommunityPost.create(postFields);
      console.log(`  [Post] Seeded: "${createdPost.title.slice(0, 40)}..." (${comments.length} comments)`);

      if (comments && comments.length > 0) {
        for (const comm of comments) {
          await CommunityComment.create({
            ...comm,
            postId: createdPost._id,
            authorId: verifiedUser ? verifiedUser._id : null,
          });
        }
      }
    }

    console.log('✓ Successfully seeded Reddit-style community discussions and comments!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error seeding community data:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
};

if (require.main === module) {
  seedCommunityData();
}

module.exports = { seedCommunityData };
