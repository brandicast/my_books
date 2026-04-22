const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper(isbn) {
  const url = `https://search.books.com.tw/search/query/key/${isbn}`;
  console.log(`Testing ISBN: ${isbn} at ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.books.com.tw/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const firstItem = $('div.table-td[id^="prod-itemlist"], .table-searchlist .item, .item').first();

    if (!firstItem.length) {
      console.log('Result: Not found');
      return;
    }

    const title = firstItem.find('h4 a').attr('title') || firstItem.find('h4 a').text().trim();
    const authors = firstItem.find('a[rel="go_author"], .author a').map((i, el) => $(el).text().trim()).get();
    
    let thumbnail = firstItem.find('img.b-lazy').attr('data-src') ||
                    firstItem.find('img.box').attr('data-src') || 
                    firstItem.find('img.box').attr('src') ||
                    firstItem.find('.pic img').attr('src');
    
    if (thumbnail) {
      if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
      if (thumbnail.startsWith('http://')) thumbnail = thumbnail.replace('http://', 'https://');
      thumbnail = thumbnail.replace(/&amp;/g, '&');
    }

    console.log('Result:', {
      title,
      authors: authors.length ? authors : [],
      thumbnail: thumbnail || '',
      source: 'Books.com.tw'
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

(async () => {
    // 測試著名的「被討厭的勇氣」
    await testScraper('9789861791234');
    console.log('---');
    // 測試「哈利波特」
    await testScraper('9789573317241');
})();
