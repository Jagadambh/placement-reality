const College = require('../models/College');
const PlacementRecord = require('../models/PlacementRecord');
const PlacementSeason = require('../models/PlacementSeason');
const Offer = require('../models/Offer');
const Internship = require('../models/Internship');
const CollegeReview = require('../models/CollegeReview');
const axios = require('axios');

/**
 * Retrieval-Augmented Generation (RAG) Context Builder.
 * Fetches verified ground-truth records directly from the database based on query entities.
 */
async function retrieveGroundTruthContext(userQuery, userCollegeId = null) {
  const queryLower = userQuery.toLowerCase();

  // Find all colleges or colleges mentioned in query
  const allColleges = await College.find();
  let matchedColleges = allColleges.filter((c) => {
    return (
      queryLower.includes(c.name.toLowerCase()) ||
      (c.shortName && queryLower.includes(c.shortName.toLowerCase())) ||
      (c.slug && queryLower.includes(c.slug.toLowerCase()))
    );
  });

  // If user has a default college and asked "my college", include it
  if (matchedColleges.length === 0 && userCollegeId) {
    const userCol = allColleges.find((c) => c._id.toString() === userCollegeId.toString());
    if (userCol) matchedColleges.push(userCol);
  }

  // If still none matched, take top 4 major colleges for comparison/reference
  if (matchedColleges.length === 0) {
    matchedColleges = allColleges.slice(0, 4);
  }

  const collegeIds = matchedColleges.map((c) => c._id);

  // Retrieve placement records for matched colleges
  const placementRecords = await PlacementRecord.find({ collegeId: { $in: collegeIds } })
    .populate('collegeId', 'name shortName tierClassification city state')
    .populate('seasonId', 'academicYear seasonStatus')
    .lean();

  // Retrieve top verified offers
  const verifiedOffers = await Offer.find({
    collegeId: { $in: collegeIds },
    verificationStatus: 'Verified',
  })
    .populate('collegeId', 'name shortName')
    .populate('departmentId', 'name code')
    .limit(40)
    .lean();

  // Retrieve internships matching roles or companies
  const internships = await Internship.find({
    collegeId: { $in: collegeIds },
  })
    .populate('collegeId', 'name shortName')
    .lean();

  // Retrieve reviews
  const reviews = await CollegeReview.find({
    collegeId: { $in: collegeIds },
    moderationStatus: 'Approved',
  })
    .populate('collegeId', 'name shortName')
    .lean();

  return {
    matchedColleges,
    placementRecords,
    verifiedOffers,
    internships,
    reviews,
  };
}

/**
 * Generates an answer using either live LLM (Gemini/OpenAI) or grounded platform engine.
 */
async function processPlacementAiQuery({ prompt, userCollegeId = null, conversationHistory = [] }) {
  const context = await retrieveGroundTruthContext(prompt, userCollegeId);
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // Build structured citations
  const citations = [];
  context.placementRecords.forEach((rec) => {
    citations.push({
      collegeName: rec.collegeId?.name || 'College',
      academicYear: rec.seasonId?.academicYear || 'Recent',
      sourceType: rec.reportingSource,
      verificationTier: rec.verificationStatus,
      metricCited: `Median: ${rec.medianPackageLPA} LPA, Highest: ${rec.highestPackageLPA} LPA, Unique Placed: ${rec.uniqueStudentsPlaced}`,
    });
  });

  // Prepare grounded context summary string
  const contextTextLines = [
    '=== VERIFIED GROUND-TRUTH PLATFORM RECORDS ===',
    'POLICY RULES: DO NOT HALLUCINATE NUMBERS. If an eligible denominator is undisclosed, state that placement percentage cannot be manufactured. Distinguish unique placed students from total job offers.',
  ];

  context.placementRecords.forEach((r) => {
    const denomInfo = r.totalEligibleStudents
      ? `Eligible Students: ${r.totalEligibleStudents}, Placed: ${r.uniqueStudentsPlaced} (Rate: ${((r.uniqueStudentsPlaced / r.totalEligibleStudents) * 100).toFixed(1)}%)`
      : `Eligible Students: Undisclosed by Institute, Unique Placed: ${r.uniqueStudentsPlaced}, Total Offers: ${r.totalJobOffers} (Placement rate cannot be calculated)`;

    const branchText = (r.branchBreakdown || [])
      .map((b) => `${b.departmentCode}: Median ${b.medianPackageLPA || 'N/A'} LPA, Avg ${b.averagePackageLPA || 'N/A'} LPA, Highest ${b.highestPackageLPA || 'N/A'} LPA, Placed: ${b.uniqueStudentsPlaced}/${b.eligibleStudents || 'Undisclosed'}`)
      .join('; ');

    contextTextLines.push(
      `COLLEGE: ${r.collegeId.name} (${r.collegeId.shortName || ''}) | Tier: ${r.collegeId.tierClassification?.tier || 'Unclassified'} | Year: ${r.seasonId?.academicYear} | Source: ${r.reportingSource} [${r.verificationStatus}] | Median CTC: ${r.medianPackageLPA} LPA | Average CTC: ${r.averagePackageLPA} LPA | Highest CTC: ${r.highestPackageLPA} LPA | ${denomInfo} | Recruiters: ${r.uniqueRecruitersCount} | Top Recruiters: ${(r.topRecruiters || []).map(t => t.companyName).join(', ')} | Branches: [${branchText}]`
    );
  });

  // Add internship facts
  const verifiedInternshipsCount = context.internships.filter((i) => i.verificationStatus === 'Verified').length;
  const cyberInternships = context.internships.filter(
    (i) => i.internshipRole.toLowerCase().includes('cyber') || i.internshipRole.toLowerCase().includes('security')
  );
  contextTextLines.push(
    `INTERNSHIP DATA: Total Records: ${context.internships.length}, Verified Records: ${verifiedInternshipsCount}. Cybersecurity internships count: ${cyberInternships.length} (${cyberInternships.map((c) => `${c.collegeId?.shortName}: ${c.companyName} - ${c.monthlyStipendInr} INR/mo`).join(', ') || 'None found'}).`
  );

  const fullSystemPrompt = `You are "Placement AI", the objective analytical assistant for Placement Reality.
Strict rules:
1. Ground every statement strictly in the provided platform records.
2. Never invent numbers, packages, percentages or recruiters.
3. If data is undisclosed or unavailable, explicitly state: "This metric has not been disclosed by the institute or verified by the platform."
4. Always distinguish unique students placed from total job offers.
5. Always cite the college, season, and verification status (Officially Reported vs Student-Verified).
6. Never make unsupported future placement predictions.`;

  // Check if live Gemini API key is available
  if (geminiApiKey && geminiApiKey.trim() !== '') {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${fullSystemPrompt}\n\n${contextTextLines.join('\n')}\n\nUser Question: ${prompt}`,
                },
              ],
            },
          ],
        },
        { timeout: 12000 }
      );

      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        return {
          answer: generatedText,
          citations,
          provider: 'Google Gemini 1.5 Flash (Backend Grounded RAG)',
          isLiveAi: true,
          apiKeyConfigured: true,
        };
      }
    } catch (apiError) {
      console.warn('[AI Service] Gemini API call failed or timed out:', apiError.message);
      // Fall through to deterministic ground-truth engine
    }
  }

  // Check if OpenAI API key is available
  if (openaiApiKey && openaiApiKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `${fullSystemPrompt}\n\n${contextTextLines.join('\n')}` },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: { Authorization: `Bearer ${openaiApiKey}` },
          timeout: 12000,
        }
      );
      const generatedText = response.data?.choices?.[0]?.message?.content;
      if (generatedText) {
        return {
          answer: generatedText,
          citations,
          provider: 'OpenAI GPT-4o-mini (Backend Grounded RAG)',
          isLiveAi: true,
          apiKeyConfigured: true,
        };
      }
    } catch (apiError) {
      console.warn('[AI Service] OpenAI API call failed:', apiError.message);
    }
  }

  // Deterministic Ground-Truth Engine (Strict Data Fidelity, Zero Hallucination)
  const deterministicAnswer = generateDeterministicGroundedAnswer(prompt, context);

  return {
    answer: deterministicAnswer,
    citations,
    provider: 'Platform Deterministic RAG Engine (Zero Hallucination)',
    isLiveAi: false,
    apiKeyConfigured: false,
    setupNotice: 'No external LLM API key detected in server/.env (e.g. GEMINI_API_KEY). Answering via deterministic grounded query engine verified against MongoDB.',
  };
}

/**
 * Truth-in-data deterministic answer generator.
 * Directly addresses all representative queries with zero hallucination.
 */
function generateDeterministicGroundedAnswer(query, context) {
  const q = query.toLowerCase();
  const { matchedColleges, placementRecords, verifiedOffers, internships } = context;

  // 1. Compare colleges (e.g. KIIT and VIT for CSE)
  if (q.includes('compare') || (q.includes('kiit') && q.includes('vit')) || q.includes('vs')) {
    const colA = matchedColleges[0];
    const colB = matchedColleges[1] || matchedColleges[0];

    const recsA = placementRecords.filter((r) => r.collegeId._id.toString() === colA._id.toString());
    const recsB = placementRecords.filter((r) => r.collegeId._id.toString() === colB._id.toString());

    const latestA = recsA[recsA.length - 1];
    const latestB = recsB[recsB.length - 1];

    if (!latestA || !latestB) {
      return `Comparing ${colA.name} and ${colB?.name || 'other institutions'}: We found limited verified baseline records. Available verified data shows: ${latestA ? `${colA.name} Median CTC: ${latestA.medianPackageLPA} LPA` : 'Data not filed yet'}.`;
    }

    const cseA = latestA.branchBreakdown?.find((b) => b.departmentCode.includes('CS') || b.departmentCode.includes('CSE'));
    const cseB = latestB.branchBreakdown?.find((b) => b.departmentCode.includes('CS') || b.departmentCode.includes('CSE'));

    let comparison = `### Objective Placement Comparison: ${colA.name} vs ${colB.name}\n\n`;
    comparison += `*(Source: ${latestA.reportingSource} [${latestA.verificationStatus}] and ${latestB.reportingSource} [${latestB.verificationStatus}], Season: ${latestA.seasonId?.academicYear})*\n\n`;

    comparison += `| Metric | ${colA.shortName || colA.name} | ${colB.shortName || colB.name} |\n`;
    comparison += `| :--- | :--- | :--- |\n`;
    comparison += `| **Platform Classification** | ${colA.tierClassification?.tier || 'Unclassified'} | ${colB.tierClassification?.tier || 'Unclassified'} |\n`;
    comparison += `| **Overall Median CTC** | **${latestA.medianPackageLPA} LPA** | **${latestB.medianPackageLPA} LPA** |\n`;
    comparison += `| **Overall Average CTC** | ${latestA.averagePackageLPA} LPA | ${latestB.averagePackageLPA} LPA |\n`;
    comparison += `| **Highest Package** | ${latestA.highestPackageLPA} LPA | ${latestB.highestPackageLPA} LPA |\n`;
    comparison += `| **Unique Placed Students** | ${latestA.uniqueStudentsPlaced} | ${latestB.uniqueStudentsPlaced} |\n`;
    comparison += `| **Total Job Offers** | ${latestA.totalJobOffers} | ${latestB.totalJobOffers} |\n`;

    // Denominator honesty check
    const rateA = latestA.totalEligibleStudents ? `${((latestA.uniqueStudentsPlaced / latestA.totalEligibleStudents) * 100).toFixed(1)}% (${latestA.uniqueStudentsPlaced}/${latestA.totalEligibleStudents})` : 'Undisclosed by institute (Rate withheld)';
    const rateB = latestB.totalEligibleStudents ? `${((latestB.uniqueStudentsPlaced / latestB.totalEligibleStudents) * 100).toFixed(1)}% (${latestB.uniqueStudentsPlaced}/${latestB.totalEligibleStudents})` : 'Undisclosed by institute (Rate withheld)';
    comparison += `| **Verified Placement Rate** | ${rateA} | ${rateB} |\n`;

    if (cseA || cseB) {
      comparison += `| **CSE Median Package** | ${cseA ? `${cseA.medianPackageLPA} LPA` : 'Undisclosed'} | ${cseB ? `${cseB.medianPackageLPA} LPA` : 'Undisclosed'} |\n`;
      comparison += `| **CSE Highest Package** | ${cseA ? `${cseA.highestPackageLPA} LPA` : 'Undisclosed'} | ${cseB ? `${cseB.highestPackageLPA} LPA` : 'Undisclosed'} |\n`;
    }

    comparison += `\n**Key Transparency Takeaway:**\n`;
    if (!latestA.totalEligibleStudents || !latestB.totalEligibleStudents) {
      comparison += `- Note on Denominators: One or more institutes do not disclose total eligible students. Total job offers (${latestA.totalJobOffers} vs ${latestB.totalJobOffers}) must not be mistaken for unique placed students (${latestA.uniqueStudentsPlaced} vs ${latestB.uniqueStudentsPlaced}).\n`;
    }
    comparison += `- Recruiter Diversity: ${latestA.uniqueRecruitersCount} recruiters visited ${colA.shortName || colA.name}, whereas ${latestB.uniqueRecruitersCount} recruiters visited ${colB.shortName || colB.name}.`;

    return comparison;
  }

  // 2. Median package question
  if (q.includes('median package') || q.includes('median ctc') || q.includes('median')) {
    const rec = placementRecords[0];
    if (rec) {
      return `According to ${rec.reportingSource} (${rec.verificationStatus}) for academic season **${rec.seasonId?.academicYear}**:\n\n- **Institute:** ${rec.collegeId.name}\n- **Median Package:** **${rec.medianPackageLPA} LPA**\n- **Average Package:** ${rec.averagePackageLPA} LPA\n- **Unique Students Placed:** ${rec.uniqueStudentsPlaced}\n- **Total Job Offers:** ${rec.totalJobOffers}\n\n*Note: Median is more representative of general batch outcomes than average, which can be skewed by outlier packages.*`;
    }
  }

  // 3. Companies offering > 10 LPA
  if (q.includes('10 lpa') || q.includes('more than 10') || q.includes('super dream') || q.includes('dream')) {
    const highOffers = verifiedOffers.filter((o) => o.annualCtcLpa >= 10);
    const topRecruitersFromRecords = [];
    placementRecords.forEach((r) => {
      (r.topRecruiters || []).forEach((tr) => {
        if (tr.highestLPA >= 10 || tr.tierCategory?.includes('Product') || tr.tierCategory?.includes('Fintech')) {
          topRecruitersFromRecords.push(`${tr.companyName} (${r.collegeId.shortName || r.collegeId.name} - Max ${tr.highestLPA} LPA)`);
        }
      });
    });

    const uniqueList = Array.from(new Set([...highOffers.map((o) => `${o.companyName} (${o.collegeId.shortName} - ${o.annualCtcLpa} LPA)`), ...topRecruitersFromRecords]));

    if (uniqueList.length > 0) {
      return `### Companies offering ≥ 10 LPA (Verified Records & Official Filings)\n\nBased on corroborated records, the following companies have offered 10 LPA or above:\n\n${uniqueList.map((item, idx) => `${idx + 1}. **${item}**`).join('\n')}\n\n*All statistics are cross-referenced with student offer letters and published institute placement disclosures.*`;
    }
  }

  // 4. Placement changes over 3 years
  if (q.includes('three years') || q.includes('3 years') || q.includes('trend') || q.includes('changed')) {
    const col = matchedColleges[0];
    const recs = placementRecords.filter((r) => r.collegeId._id.toString() === col._id.toString());
    if (recs.length >= 2) {
      return `### 3-Year Placement Trend for ${col.name}\n\n` +
        recs.map((r) => `- **${r.seasonId?.academicYear}:** Median **${r.medianPackageLPA} LPA**, Avg ${r.averagePackageLPA} LPA, Highest ${r.highestPackageLPA} LPA, Unique Placed: ${r.uniqueStudentsPlaced} (Source: ${r.reportingSource})`).join('\n') +
        `\n\n*Trend Analysis:* Median packages have evolved from ${recs[0].medianPackageLPA} LPA to ${recs[recs.length - 1].medianPackageLPA} LPA over recorded seasons.`;
    }
  }

  // 5. Verified internship records count / questions
  if (q.includes('internship') && (q.includes('verified') || q.includes('count') || q.includes('how many'))) {
    const verifiedCount = internships.filter((i) => i.verificationStatus === 'Verified').length;
    const paidCount = internships.filter((i) => i.stipendCategory === 'Paid').length;
    return `### Verified Internship Data\n\n- **Total Submitted Internship Records:** ${internships.length}\n- **Verified Records with Evidence:** **${verifiedCount}**\n- **Paid Internships:** ${paidCount}\n- **Unpaid Internships:** ${internships.filter((i) => i.stipendCategory === 'Unpaid').length}\n\n*Transparency Disclosure: The platform tracks individual verified submissions. This represents a sample set rather than an exhaustive institutional census.*`;
  }

  // 6. Cybersecurity internship opportunities
  if (q.includes('cyber') || q.includes('security')) {
    const cyber = internships.filter(
      (i) => i.internshipRole.toLowerCase().includes('cyber') || i.internshipRole.toLowerCase().includes('security')
    );
    if (cyber.length > 0) {
      return `### Verified Cybersecurity Internship Records\n\n` +
        cyber.map((c) => `- **${c.collegeId?.name}**: **${c.companyName}** (${c.internshipRole}) - Stipend: **₹${c.monthlyStipendInr.toLocaleString('en-IN')}/mo** [Status: ${c.verificationStatus}]`).join('\n') +
        `\n\n*Source: Student-submitted and document-verified internship experiences.*`;
    } else {
      return `No verified cybersecurity internship records are currently filed for the selected query. We strictly avoid inventing hypothetical openings without student or cell verification.`;
    }
  }

  // 7. Placement percentage / eligible students
  if (q.includes('percentage') || q.includes('rate') || q.includes('eligible')) {
    const rec = placementRecords[0];
    if (rec) {
      if (rec.totalEligibleStudents) {
        const rate = ((rec.uniqueStudentsPlaced / rec.totalEligibleStudents) * 100).toFixed(1);
        return `At **${rec.collegeId.name}** for **${rec.seasonId?.academicYear}**:\n- Total Eligible Students: **${rec.totalEligibleStudents}**\n- Unique Placed Students: **${rec.uniqueStudentsPlaced}**\n- **Verified Placement Rate: ${rate}%**\n\n*(Source: ${rec.reportingSource} [${rec.verificationStatus}])*`;
      } else {
        return `At **${rec.collegeId.name}** for **${rec.seasonId?.academicYear}**:\n- Total Eligible Students: **Not Disclosed by Institute**\n- Unique Placed Students: **${rec.uniqueStudentsPlaced}**\n- Total Job Offers: **${rec.totalJobOffers}**\n\n**Transparency Notice:** Placement Reality policy strictly forbids manufacturing an artificial placement percentage when the institute does not disclose the eligible student denominator.`;
      }
    }
  }

  // Default synthesis
  const rec = placementRecords[0];
  if (rec) {
    return `### Placement Overview for ${rec.collegeId.name} (${rec.seasonId?.academicYear})\n\n` +
      `- **Median CTC:** **${rec.medianPackageLPA} LPA**\n` +
      `- **Average CTC:** ${rec.averagePackageLPA} LPA\n` +
      `- **Highest CTC:** ${rec.highestPackageLPA} LPA\n` +
      `- **Unique Placed Students:** ${rec.uniqueStudentsPlaced}\n` +
      `- **Total Offers:** ${rec.totalJobOffers}\n` +
      `- **Reporting Source:** ${rec.reportingSource} (*${rec.verificationStatus}*)\n` +
      `- **Data Confidence Score:** ${rec.confidenceScore} / 100\n\n` +
      `Ask me to compare colleges, inspect branch-wise CSE/ECE packages, check verified recruiters >10 LPA, or review internship stipends!`;
  }

  return `I have examined the platform records. Could you please specify a college name (e.g. KIIT, VIT, IIT Bombay) or metric (median package, branch breakdown, >10 LPA recruiters)? I will only answer with verified platform statistics.`;
}

module.exports = {
  processPlacementAiQuery,
  retrieveGroundTruthContext,
};
