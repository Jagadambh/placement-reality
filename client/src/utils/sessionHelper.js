/**
 * Client Session Helper for Placement Reality
 * Formats and manages academic sessions from 2018-19 to current session.
 */

export function formatSessionLabel(academicYear) {
  if (!academicYear) return '';
  const str = academicYear.toString();
  const match = str.match(/^(\d{4})[-–](\d{2,4})$/);
  if (!match) return str;
  const start = match[1];
  let end = match[2];
  if (end.length === 4) {
    end = end.slice(-2);
  }
  return `${start}–${end}`;
}

export function getCurrentAcademicStartYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return currentMonth >= 6 ? currentYear : currentYear - 1;
}

export function getStandardSessionsList(startYear = 2018) {
  const currentStartYear = getCurrentAcademicStartYear();
  const sessions = [];

  for (let year = startYear; year <= currentStartYear; year++) {
    const nextYear = year + 1;
    sessions.push({
      academicYear: `${year}-${nextYear}`,
      displaySession: `${year}–${String(nextYear).slice(-2)}`,
      startYear: year,
      endYear: nextYear,
      isCurrent: year === currentStartYear,
    });
  }

  return sessions.reverse(); // Most recent first
}
