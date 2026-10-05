const { URL } = require('url');
const dns = require('dns').promises;

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local, e.g. AWS metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  // 224.0.0.0/4 (Multicast) or 240.0.0.0/4 (Reserved)
  if (parts[0] >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private or loopback.
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // Link-local
  return false;
}

/**
 * Validates a URL for SSRF protection and security.
 * Returns { valid: boolean, reason?: string, hostname?: string }
 */
async function validateUrlForCrawling(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only http and https protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard reserved hosts
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, reason: 'Access to local and internal hostnames is prohibited' };
  }

  // Resolve DNS to check IP range
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    for (const entry of lookup) {
      if (entry.family === 4 && isPrivateIPv4(entry.address)) {
        return { valid: false, reason: `Host resolves to private IP (${entry.address})` };
      }
      if (entry.family === 6 && isPrivateIPv6(entry.address)) {
        return { valid: false, reason: `Host resolves to private IPv6 (${entry.address})` };
      }
    }
  } catch (dnsErr) {
    // If DNS fails during validation, reject safely
    return { valid: false, reason: `DNS resolution failed: ${dnsErr.message}` };
  }

  return { valid: true, hostname };
}

/**
 * Extracts institutional root domain (e.g. 'home.iitd.ac.in' -> 'iitd.ac.in', 'www.arkajainuniversity.ac.in' -> 'arkajainuniversity.ac.in')
 */
function getInstitutionalRootDomain(urlOrHost) {
  if (!urlOrHost) return '';
  try {
    let host = urlOrHost;
    if (urlOrHost.includes('://')) {
      host = new URL(urlOrHost).hostname;
    }
    host = host.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 3 && ['ac', 'edu', 'res', 'gov', 'org', 'co', 'net'].includes(parts[parts.length - 2])) {
      return parts.slice(-3).join('.');
    }
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return host;
  } catch (_) {
    return '';
  }
}

/**
 * Validates if candidate URL belongs to the official college domain or allowable document host.
 */
function isOfficialDomain(candidateUrl, officialWebsiteUrl) {
  if (!candidateUrl || !officialWebsiteUrl) return false;
  try {
    const candidateHost = new URL(candidateUrl).hostname.toLowerCase().replace(/^www\./, '');
    const officialRoot = getInstitutionalRootDomain(officialWebsiteUrl);

    // Strict third-party listing domains blocklist
    const BLOCKED_THIRD_PARTIES = [
      'collegedunia.com',
      'shiksha.com',
      'careers360.com',
      'getmyuni.com',
      'jagranjosh.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'instagram.com',
      'youtube.com',
      'reddit.com',
      'quora.com',
    ];

    for (const blocked of BLOCKED_THIRD_PARTIES) {
      if (candidateHost.includes(blocked)) return false;
    }

    // Match exact host or subdomain
    if (candidateHost === officialRoot || candidateHost.endsWith('.' + officialRoot)) {
      return true;
    }

    return false;
  } catch (_) {
    return false;
  }
}

module.exports = {
  validateUrlForCrawling,
  getInstitutionalRootDomain,
  isOfficialDomain,
};
