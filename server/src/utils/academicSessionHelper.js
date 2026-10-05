/**
 * Academic Session Utility for Placement Reality
 * Generates and normalizes academic sessions from 2018-19 up to the current session.
 * Sessions automatically expand as new academic calendar years commence.
 */

const PlacementSeason = require('../models/PlacementSeason');

/**
 * Returns the current academic year start based on calendar month.
 * In India, academic sessions run from July (month index 6) to June.
 */
function getCurrentAcademicStartYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 6 = Jul)
  return currentMonth >= 6 ? currentYear : currentYear - 1;
}

/**
 * Formats full YYYY-YYYY into display session "YYYY–YY" (e.g., "2023-2024" -> "2023–24").
 */
function formatSessionLabel(academicYear) {
  if (!academicYear) return '';
  const match = academicYear.toString().match(/^(\d{4})[-–](\d{2,4})$/);
  if (!match) return academicYear;
  const start = match[1];
  let end = match[2];
  if (end.length === 4) {
    end = end.slice(-2);
  }
  return `${start}–${end}`;
}

/**
 * Normalizes any session variation into standard "YYYY-YYYY" format.
 * Examples:
 * - "2018-19" -> "2018-2019"
 * - "2018–19" -> "2018-2019"
 * - "2018-2019" -> "2018-2019"
 */
function normalizeSessionKey(input) {
  if (!input) return '';
  const cleaned = input.toString().trim();
  const match = cleaned.match(/^(\d{4})[-–](\d{2,4})$/);
  if (!match) return cleaned;
  const start = parseInt(match[1], 10);
  let end = match[2];
  if (end.length === 2) {
    const endCentury = Math.floor(start / 100) * 100;
    const endYear = endCentury + parseInt(end, 10);
    return `${start}-${endYear}`;
  }
  return `${start}-${end}`;
}

/**
 * Generates all standard academic sessions from startYear (2018) up to the current session.
 */
function getStandardAcademicSessions(startYear = 2018) {
  const currentStartYear = getCurrentAcademicStartYear();
  const sessions = [];

  for (let year = startYear; year <= currentStartYear; year++) {
    const nextYear = year + 1;
    const fullKey = `${year}-${nextYear}`;
    const displayLabel = `${year}–${String(nextYear).slice(-2)}`;
    const isCurrent = year === currentStartYear;

    sessions.push({
      academicYear: fullKey,
      displaySession: displayLabel,
      startYear: year,
      endYear: nextYear,
      isCurrent,
      isConcluded: !isCurrent,
      defaultStatus: isCurrent ? 'Ongoing' : 'Concluded',
    });
  }

  return sessions;
}

/**
 * Ensures all standard sessions (2018-19 to current) exist in DB for a given college.
 */
async function ensureCollegeSessions(collegeId) {
  const standardSessions = getStandardAcademicSessions(2018);
  const existingSeasons = await PlacementSeason.find({ collegeId });
  const existingMap = new Map(existingSeasons.map(s => [s.academicYear, s]));

  const createdOrUpdated = [];

  for (const session of standardSessions) {
    if (existingMap.has(session.academicYear)) {
      createdOrUpdated.push(existingMap.get(session.academicYear));
    } else {
      const created = await PlacementSeason.create({
        collegeId,
        academicYear: session.academicYear,
        seasonStatus: session.defaultStatus,
        officialReportPublished: false,
        dataCompletenessRating: 'Unverified',
        methodologyNotes: `Standard session track for ${session.displaySession}. Requires verified records.`,
      });
      createdOrUpdated.push(created);
    }
  }

  // Return in descending order (current session first, down to 2018–19)
  return createdOrUpdated.sort((a, b) => {
    const startA = parseInt(a.academicYear.split('-')[0], 10);
    const startB = parseInt(b.academicYear.split('-')[0], 10);
    return startB - startA;
  });
}

module.exports = {
  getCurrentAcademicStartYear,
  formatSessionLabel,
  normalizeSessionKey,
  getStandardAcademicSessions,
  ensureCollegeSessions,
};
