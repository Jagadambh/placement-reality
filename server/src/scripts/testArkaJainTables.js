const axios = require('axios');
const cheerio = require('cheerio');

async function testPlacementStatusTables() {
  const url = 'https://arkajainuniversity.ac.in/placement-5/placement-status/';
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    console.log('Tables count:', $('table').length);

    $('table').each((i, tbl) => {
      console.log(`\n=== Table ${i + 1} ===`);
      const rows = [];
      $(tbl).find('tr').each((r, tr) => {
        const cells = [];
        $(tr).find('th, td').each((c, td) => {
          cells.push($(td).text().replace(/\s+/g, ' ').trim());
        });
        if (cells.length > 0) rows.push(cells);
      });
      console.log('Rows count:', rows.length);
      console.log('First 5 rows:');
      console.log(rows.slice(0, 5));
    });

    // Also check headings and paragraphs
    $('h1, h2, h3, h4, h5, h6, strong').each((i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.toLowerCase().includes('passing year') || text.toLowerCase().includes('highest') || text.toLowerCase().includes('average') || text.toLowerCase().includes('placement 20')) {
        console.log('Heading/Highlight:', text);
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPlacementStatusTables();
