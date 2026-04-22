const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE,
      title TEXT NOT NULL,
      authors TEXT,
      thumbnail TEXT,
      location TEXT,
      owner TEXT,
      hashtags TEXT,
      quantity INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { db.exec(`ALTER TABLE books ADD COLUMN quantity INTEGER DEFAULT 1;`); } catch (err) {}
  try { db.exec(`ALTER TABLE books ADD COLUMN notes TEXT;`); } catch (err) {}
  console.log('Database initialized.');
};

initDb();

app.get('/api/books/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    book.authors = book.authors ? JSON.parse(book.authors) : [];
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/books/isbn/:isbn', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE isbn = ?').get(req.params.isbn);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    book.authors = book.authors ? JSON.parse(book.authors) : [];
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/proxy/isbn/:isbn', async (req, res) => {
  const { isbn } = req.params;
  // Books.com.tw search URL - removing /cat/all/ for better compatibility
  const url = `https://search.books.com.tw/search/query/key/${isbn}`;
  
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
    // Updated selectors based on recent search results
    const firstItem = $('div.table-td[id^="prod-itemlist"], .table-searchlist .item, .item').first();

    if (!firstItem.length) {
      return res.status(404).json({ error: 'No results found on Books.com.tw' });
    }

    const title = firstItem.find('h4 a').attr('title') || firstItem.find('h4 a').text().trim();
    const authors = firstItem.find('a[rel="go_author"], .author a').map((i, el) => $(el).text().trim()).get();
    
    // Thumbnail handling: Books.com.tw uses lazy loading with .b-lazy class or data-src
    let thumbnail = firstItem.find('img.b-lazy').attr('data-src') ||
                    firstItem.find('img.box').attr('data-src') || 
                    firstItem.find('img.box').attr('src') ||
                    firstItem.find('.pic img').attr('src');
    
    // Cleanup thumbnail URL
    if (thumbnail) {
      if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
      if (thumbnail.startsWith('http://')) thumbnail = thumbnail.replace('http://', 'https://');
      // Remove any encoding artifacts if necessary
      thumbnail = thumbnail.replace(/&amp;/g, '&');
    }

    res.json({
      title,
      authors: authors.length ? authors : [],
      thumbnail: thumbnail || '',
      source: 'Books.com.tw'
    });
  } catch (error) {
    console.error('Books.com.tw proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Books.com.tw' });
  }
});

app.get('/api/books', (req, res) => {
  try {
    const { search } = req.query;
    let books;

    if (search) {
      const searchParam = `%${search}%`;
      books = db.prepare(`
        SELECT * FROM books WHERE
          title LIKE ? OR
          authors LIKE ? OR
          isbn LIKE ? OR
          location LIKE ? OR
          owner LIKE ? OR
          hashtags LIKE ?
        ORDER BY created_at DESC
      `).all(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    } else {
      books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
    }

    const parsedBooks = books.map(b => ({
      ...b,
      authors: b.authors ? JSON.parse(b.authors) : []
    }));

    res.json(parsedBooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/books', (req, res) => {
  const { isbn, title, authors, thumbnail, location, owner, hashtags, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = db.prepare(`
      INSERT INTO books (isbn, title, authors, thumbnail, location, owner, hashtags, notes, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      isbn || null,
      title,
      authors ? JSON.stringify(authors) : null,
      thumbnail || null,
      location || null,
      owner || null,
      hashtags || null,
      notes || null
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: '此 ISBN 的書籍已存在。' });
    }
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

app.put('/api/books/:id', (req, res) => {
  const { isbn, title, authors, thumbnail, location, owner, hashtags, notes, quantity } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = db.prepare(`
      UPDATE books SET 
        isbn = ?, title = ?, authors = ?, thumbnail = ?, 
        location = ?, owner = ?, hashtags = ?, notes = ?, quantity = ?
      WHERE id = ?
    `).run(
      isbn || null, title, authors ? JSON.stringify(authors) : null, thumbnail || null,
      location || null, owner || null, hashtags || null, notes || null, quantity || 1,
      req.params.id
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
    res.json({ message: 'Updated' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: '此 ISBN 的書籍已存在。' });
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

app.put('/api/books/:id/increment', (req, res) => {
  try {
    const result = db.prepare('UPDATE books SET quantity = quantity + 1 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Quantity incremented' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/api/books/:id', (req, res) => {
  const expectedPin = process.env.DELETE_PIN;
  const providedPin = req.headers['x-pin-code'];

  if (expectedPin && providedPin !== expectedPin) {
    return res.status(403).json({ error: 'PIN 碼錯誤，無法刪除' });
  }

  try {
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/metadata', (req, res) => {
  try {
    const locations = db.prepare(`SELECT DISTINCT location FROM books WHERE location IS NOT NULL AND location != ''`).all().map(r => r.location);
    const owners = db.prepare(`SELECT DISTINCT owner FROM books WHERE owner IS NOT NULL AND owner != ''`).all().map(r => r.owner);
    const rows = db.prepare(`SELECT hashtags FROM books WHERE hashtags IS NOT NULL AND hashtags != ''`).all();

    const allHashtags = new Set();
    rows.forEach(row => {
      row.hashtags.split(',').map(t => t.trim()).forEach(t => { if (t) allHashtags.add(t); });
    });

    res.json({ locations, owners, hashtags: Array.from(allHashtags) });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
