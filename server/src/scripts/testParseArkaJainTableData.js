const axios = require('axios');
const cheerio = require('cheerio');

function parsePlacementTables(html, pageUrl) {
  const $ = cheerio.load(html);
  const sessionData = new Map(); // session -> { salaries: [], companies: Set, offers: 0 }

  $('table').each((tblIdx, tbl) => {
    const rows = [];
    $(tbl).find('tr').each((rIdx, tr) => {
      const cells = [];
      $(tr).find('th, td').each((cIdx, td) => {
        cells.push($(td).text().replace(/\s+/g, ' ').trim());
      });
      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length < 2) return;

    // Detect header row
    const headerRow = rows[0].map(c => c.toLowerCase());
    const ctcColIdx = headerRow.findIndex(h => h.includes('ctc') || h.includes('package') || h.includes('salary'));
    const companyColIdx = headerRow.findIndex(h => h.includes('company') || h.includes('name of company') || h.includes('name of the company'));
    const yearColIdx = headerRow.findIndex(h => h.includes('year') || h.includes('passing year') || h.includes('batch'));
    const streamColIdx = headerRow.findIndex(h => h.includes('stream') || h.includes('course') || h.includes('branch'));

    // Check if this table has placement data
    if (ctcColIdx === -1 && companyColIdx === -1) return;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const company = companyColIdx !== -1 ? row[companyColIdx] : null;
      let rawCtc = ctcColIdx !== -1 ? row[ctcColIdx] : null;
      let rawYear = yearColIdx !== -1 ? row[yearColIdx] : null;

      // Clean CTC (e.g. "346712" -> 3.47 LPA, "582000" -> 5.82 LPA, "1000000" -> 10.0 LPA, or "4.5 LPA" -> 4.5)
      let ctcLpa = null;
      if (rawCtc) {
        const cleaned = rawCtc.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0) {
          if (num > 10000) {
            ctcLpa = Number((num / 100000).toFixed(2)); // INR to Lakhs
          } else if (num < 100) {
            ctcLpa = Number(num.toFixed(2));
          }
        }
      }

      // Detect Year
      let sessionKey = null;
      if (rawYear) {
        const yearMatch = rawYear.match(/\b(20[1-2][0-9])\b/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          sessionKey = `${y - 1}-${String(y % 100).padStart(2, '0')}`;
        }
      }

      // If no year in row, check surrounding text or header
      if (!sessionKey) {
        const tableContext = $(tbl).prevAll('h1, h2, h3, h4, h5, h6, strong, p').first().text();
        const yearMatch = tableContext.match(/\b(20[1-2][0-9])\b/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          sessionKey = `${y - 1}-${String(y % 100).padStart(2, '0')}`;
        }
      }

      if (sessionKey && (company || ctcLpa)) {
        if (!sessionData.has(sessionKey)) {
          sessionData.set(sessionKey, {
            session: sessionKey,
            salaries: [],
            companies: new Set(),
            offersCount: 0,
            topRecruiters: [],
          });
        }
        const data = sessionData.get(sessionKey);
        data.offersCount++;
        if (company && company.length > 1 && !company.toLowerCase().includes('user name')) {
          data.companies.add(company);
        }
        if (ctcLpa && ctcLpa > 0 && ctcLpa < 200) {
          data.salaries.push(ctcLpa);
        }
      }
    }
  });

  const results = [];
  for (const [session, data] of sessionData.entries()) {
    if (data.salaries.length === 0 && data.companies.size === 0) continue;

    data.salaries.sort((a, b) => a - b);
    const highest = data.salaries.length > 0 ? data.salaries[data.salaries.length - 1] : null;
    const lowest = data.salaries.length > 0 ? data.salaries[0] : null;
    const average = data.salaries.length > 0
      ? Number((data.salaries.reduce((sum, v) => sum + v, 0) / data.salaries.length).toFixed(2))
      : null;
    const mid = Math.floor(data.salaries.length / 2);
    const median = data.salaries.length > 0
      ? (data.salaries.length % 2 !== 0
          ? data.salaries[mid]
          : Number(((data.salaries[mid - 1] + data.salaries[mid]) / 2).toFixed(2)))
      : null;

    results.push({
      session,
      highestPackageLPA: highest,
      averagePackageLPA: average,
      medianPackageLPA: median,
      lowestPackageLPA: lowest,
      uniqueRecruitersCount: data.companies.size,
      totalOffers: data.offersCount,
      topRecruiters: Array.from(data.companies).slice(0, 8),
      sourceUrl: pageUrl,
      sourceTitle: `ARKA JAIN University Placement Status Table (${session})`,
    });
  }

  // Sort descending by session
  results.sort((a, b) => b.session.localeCompare(a.session));
  return results;
}

async function run() {
  const url = 'https://arkajainuniversity.ac.in/placement-5/placement-status/';
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const results = parsePlacementTables(res.data, url);
  console.log('Extracted Multi-Year Placement Statistics from ARKA JAIN Official Table:');
  console.log(JSON.stringify(results, null, 2));
}

run();
