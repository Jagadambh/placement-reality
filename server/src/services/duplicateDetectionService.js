const Offer = require('../models/Offer');

/**
 * Checks if a proposed offer submission is a duplicate or potential collision.
 * 
 * Rules:
 * 1. Hard Duplicate: The same student has already submitted an offer for this company in this season.
 * 2. Suspicious Duplicate: The same student has an offer with identical role and CTC within 30 days.
 */
const checkOfferDuplicate = async ({
  studentId,
  companyName,
  jobRole,
  seasonId,
  annualCtcLpa,
  excludeOfferId = null,
}) => {
  const normalizedCompany = companyName.trim().toLowerCase();

  // 1. Check exact student + season + company
  const existingExact = await Offer.findOne({
    studentId,
    seasonId,
    companyName: { $regex: new RegExp(`^${normalizedCompany}$`, 'i') },
    ...(excludeOfferId ? { _id: { $ne: excludeOfferId } } : {}),
  });

  if (existingExact) {
    return {
      isDuplicate: true,
      reason: `You have already submitted an offer for "${companyName}" in this placement season. Multiple entries for the same company by the same candidate are restricted.`,
      matchedId: existingExact._id,
      severity: 'HARD_DUPLICATE',
    };
  }

  // 2. Check identical role and CTC in same season
  const existingSimilar = await Offer.findOne({
    studentId,
    seasonId,
    jobRole: { $regex: new RegExp(`^${jobRole.trim()}$`, 'i') },
    annualCtcLpa,
    ...(excludeOfferId ? { _id: { $ne: excludeOfferId } } : {}),
  });

  if (existingSimilar) {
    return {
      isDuplicate: false, // Flagged for review rather than blocked
      isFlagged: true,
      reason: `Notice: You have an existing submission with identical role and CTC (${annualCtcLpa} LPA). This will be flagged for moderator verification.`,
      matchedId: existingSimilar._id,
      severity: 'POTENTIAL_DUPLICATE',
    };
  }

  return {
    isDuplicate: false,
    isFlagged: false,
    reason: null,
  };
};

module.exports = {
  checkOfferDuplicate,
};
