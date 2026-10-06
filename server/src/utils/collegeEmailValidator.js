/**
 * College Email Validation Utility
 * Enforces requirement that only official college/institutional email addresses are allowed during signup.
 * Strictly blocks all personal and commercial webmail services (Gmail, Yahoo, Outlook, etc.).
 */

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'yahoo.co.in',
  'yahoo.in',
  'yahoo.co.uk',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'zoho.com',
  'zohomail.com',
  'aol.com',
  'aim.com',
  'mail.com',
  'email.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
  'yandex.ru',
  'rediffmail.com',
  'tutanota.com',
  'tutamail.com',
  'fastmail.com',
  'inbox.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
]);

/**
 * Validates if an email is an official college/institutional email ID
 * @param {string} email - The email to test
 * @param {Object|string} [collegeOrDomain] - Optional College document or domain string
 * @returns {{ isValid: boolean, isPersonal: boolean, message: string }}
 */
function validateCollegeEmail(email, collegeOrDomain = null) {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      isPersonal: false,
      message: 'Please provide a valid email address.',
    };
  }

  const clean = email.trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === clean.length - 1) {
    return {
      isValid: false,
      isPersonal: false,
      message: 'Please provide a valid email address with an @ domain.',
    };
  }

  const domain = clean.slice(atIndex + 1);

  // 1. Explicitly check for personal / commercial email domains
  const isPersonalDomain =
    PERSONAL_EMAIL_DOMAINS.has(domain) ||
    Array.from(PERSONAL_EMAIL_DOMAINS).some((pDomain) => domain.endsWith('.' + pDomain));

  if (isPersonalDomain) {
    return {
      isValid: false,
      isPersonal: true,
      message:
        'Personal email addresses (Gmail, Yahoo, Outlook, etc.) are strictly not accepted. Please enter your official college-provided email ID (e.g. rollno@kiit.ac.in, student@college.edu.in).',
    };
  }

  // 2. Check for educational institutional domain patterns
  // Domains ending with .edu, .edu.in, .ac.in, .ac.uk, .res.in, etc.
  const educationalPattern = /(\.edu|\.ac|\.res|\.college|\.university)(\.[a-z]{2,})?$/i;
  const isEduDomain =
    educationalPattern.test(domain) ||
    domain.endsWith('.edu') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.res.in');

  // 3. Check if domain matches the college's website or official placement domain
  let matchesCollege = false;
  if (collegeOrDomain) {
    let collegeHost = '';
    if (typeof collegeOrDomain === 'string') {
      collegeHost = collegeOrDomain;
    } else if (collegeOrDomain.website) {
      collegeHost = collegeOrDomain.website;
    } else if (collegeOrDomain.officialPlacementPageUrl) {
      collegeHost = collegeOrDomain.officialPlacementPageUrl;
    }

    if (collegeHost) {
      try {
        if (collegeHost.includes('://')) {
          collegeHost = new URL(collegeHost).hostname;
        }
        collegeHost = collegeHost.toLowerCase().replace(/^www\./, '');
        if (domain === collegeHost || domain.endsWith('.' + collegeHost) || collegeHost.includes(domain)) {
          matchesCollege = true;
        }
      } catch (_) {}
    }
  }

  if (isEduDomain || matchesCollege) {
    return {
      isValid: true,
      isPersonal: false,
      message: 'Valid official college institutional email address.',
    };
  }

  // If not personal, but not a recognized educational domain either
  return {
    isValid: false,
    isPersonal: false,
    message:
      'Only official college email IDs (ending with .ac.in, .edu, .edu.in, or your institution domain) are accepted. Personal and non-college emails are not permitted.',
  };
}

module.exports = {
  PERSONAL_EMAIL_DOMAINS,
  validateCollegeEmail,
};
