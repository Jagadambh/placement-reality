const axios = require('axios');
const cheerio = require('cheerio');

async function testPlacementPages() {
  const pages = [
    'https://arkajainuniversity.ac.in/placement/',
    'https://arkajainuniversity.ac.in/placement-5/placement-status/',
    'https://arkajainuniversity.ac.in/about/nirf/'
  ];

  for (const page of pages) {
    console.log('\n--- Checking page:', page);
    try {
      const res = await axios.get(page, {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const $ = cheerio.load(res.data);
      $('script, style, nav, footer').remove();
      const bodyText = $('body').text().replace(/\s+/g, ' ');
      console.log('Text preview (first 500 chars):', bodyText.slice(0, 500));

      // Find any PDFs linked on this page
      const pdfs = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (href && (href.endsWith('.pdf') || href.includes('.pdf?'))) {
          pdfs.push({ text, href });
        }
      });
      console.log('PDFs found on', page, ':', pdfs.slice(0, 10));

      // Check for stats
      const matches = bodyText.match(/(?:highest|average|median|placed|recruiters|companies|lpa|package|offers|students placed)[\s\S]{0,100}/gi);
      if (matches) {
        console.log('Keyword snippets:', matches.slice(0, 8));
      }
    } catch (err) {
      console.error('Error fetching', page, err.message);
    }
  }
}

testPlacementPages();
