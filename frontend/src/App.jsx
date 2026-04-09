import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes, Route, Link, useNavigate, useLocation, useSearchParams, useParams
} from 'react-router-dom';
import { Home as HomeIcon, ScanLine, Search, User, MapPin, WifiOff, BookOpen, X, Plus, Trash2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const API_BASE = '';

// ─── Environment Detection ────────────────────────────────────────────────────
const checkIsWebView = () => {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  
  // Common indicators for WebViews and In-App Browsers
  const isWebView = (isAndroid && /wv/i.test(ua)) || 
                    (isIOS && !/Safari/i.test(ua)) || // iOS WebViews often lack 'Safari' while keeping 'AppleWebKit'
                    /Line/i.test(ua) || 
                    /FBAN|FBAV/i.test(ua) || 
                    /Instagram/i.test(ua);
  
  return isWebView;
};

// ─── WebView Warning Component ────────────────────────────────────────────────
const WebViewWarning = ({ onDismiss }) => {
  return (
    <div className="webview-warning-overlay">
      <div className="webview-warning-card">
        <h2>⚠️ 瀏覽器不相容</h2>
        <p>偵測到您正在使用 App 內視窗開啟，這會導致相機無法正常運作。</p>
        
        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-num">1</div>
            <div>點擊右上角或右下角的序單圖示（三個點或指南針）</div>
          </div>
          <div className="guide-step">
            <div className="step-num">2</div>
            <div>選取「在瀏覽器中開啟」或「使用 Chrome 開啟」</div>
          </div>
        </div>

        <button onClick={onDismiss} className="secondary" style={{ width: '100%' }}>
          我已理解，繼續嘗試
        </button>
      </div>
    </div>
  );
};

// ─── Offline Banner ───────────────────────────────────────────────────────────
const OfflineBadge = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (isOnline) return null;
  return (
    <div className="offline-bar">
      <WifiOff size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
      目前無網路連線，部分功能可能無法使用
    </div>
  );
};

// ─── PWA Install Banner ───────────────────────────────────────────────────────
const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect if already installed or in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Check if user has dismissed it before in this session
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, we show it manually since there's no event
    if (ios) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="pwa-banner">
      <img src="/bread-192x192.png" alt="App Icon" className="pwa-banner-icon" />
      <div className="pwa-banner-text">
        <h4>麵包國圖書管理</h4>
        <p>{isIOS ? '點擊分享並「加入主畫面」以安裝' : '安裝應用程式以獲得最佳體驗'}</p>
      </div>
      {!isIOS && deferredPrompt && (
        <button className="pwa-install-btn" onClick={handleInstall}>安裝</button>
      )}
      <button className="pwa-close-btn" onClick={dismiss}><X size={20} /></button>
    </div>
  );
};

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NavBar = () => {
  const { pathname } = useLocation();
  const isActive = p => pathname === p || pathname.startsWith(p + '/');
  return (
    <nav className="nav-bar">
      <Link to="/" className={`nav-item ${isActive('/') && !pathname.includes('scan') && !pathname.includes('search') ? 'active' : ''}`}>
        <HomeIcon size={24} />
        <span>首頁</span>
      </Link>
      <Link to="/scan" className={`nav-item ${isActive('/scan') ? 'active' : ''}`}>
        <ScanLine size={24} />
        <span>掃描</span>
      </Link>
      <Link to="/search" className={`nav-item ${isActive('/search') ? 'active' : ''}`}>
        <Search size={24} />
        <span>搜尋</span>
      </Link>
    </nav>
  );
};

// ─── BookCard ─────────────────────────────────────────────────────────────────
const BookCard = ({ book, onDelete, onClick }) => (
  <div className="book-item" onClick={() => onClick && onClick(book.id)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <img
      src={book.thumbnail || ''}
      alt={book.title}
      className="book-cover"
      onError={e => { e.target.style.display = 'none'; }}
    />
    {!book.thumbnail && (
      <div className="book-cover-placeholder">
        <BookOpen size={28} color="#c7c7cc" />
      </div>
    )}
    <div className="book-info">
      <h3>{book.title}</h3>
      <p>{Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}</p>
      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {book.quantity > 1 && <span className="tag" style={{ background: '#ff9500', color: '#fff', borderColor: '#ff9500' }}>數量: {book.quantity}</span>}
        {book.isbn && <span className="tag">ISBN: {book.isbn}</span>}
        {book.location && <span className="tag"><MapPin size={10} /> {book.location}</span>}
        {book.owner && <span className="tag"><User size={10} /> {book.owner}</span>}
        {book.hashtags && book.hashtags.split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => (
          <span key={t} className="tag tag-blue">#{t}</span>
        ))}
      </div>
    </div>
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`確定要刪除 "${book.title}" 嗎？`)) {
          const pin = window.prompt("請輸入刪除 PIN 碼：");
          if (pin !== null) {
            onDelete(book.id, pin);
          }
        }
      }}
      className="delete-button"
      style={{
        width: 'auto',
        flexShrink: 0,
        alignSelf: 'center',
        background: 'rgba(255, 59, 48, 0.1)',
        color: '#ff3b30',
        border: 'none',
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        marginLeft: 10
      }}
    >
      <Trash2 size={18} />
    </button>
  </div>
);

// ─── Home Page ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ locations: [], owners: [] });
  const [sortBy, setSortBy] = useState('created_at');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/books`)
      .then(r => r.json())
      .then(d => { setBooks(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`${API_BASE}/api/metadata`)
      .then(r => r.json())
      .then(d => setMeta(d))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, pin) => {
    try {
      const res = await fetch(`${API_BASE}/api/books/${id}`, {
        method: 'DELETE',
        headers: { 'x-pin-code': pin || '' }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '刪除失敗');
        return;
      }
      setBooks(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      alert('刪除失敗');
    }
  };

  const filteredAndSortedBooks = useMemo(() => {
    let result = books.filter(b => {
      if (filterOwner && b.owner !== filterOwner) return false;
      if (filterLocation && b.location !== filterLocation) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'created_at') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'authors') {
        const authA = Array.isArray(a.authors) ? a.authors.join() : (a.authors || '');
        const authB = Array.isArray(b.authors) ? b.authors.join() : (b.authors || '');
        return authA.localeCompare(authB);
      }
      if (sortBy === 'isbn') return (a.isbn || '').localeCompare(b.isbn || '');
      return 0;
    });
    return result;
  }, [books, sortBy, filterOwner, filterLocation]);

  return (
    <div className="app-container">
      <header>
        <h1>麵包國圖書管理</h1>
        <p className="subtitle">{filteredAndSortedBooks.length} 本書</p>
      </header>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex: 1, marginBottom: 0, padding: '8px 12px' }}>
            <option value="created_at">最新加入</option>
            <option value="title">依書名排序</option>
            <option value="authors">依作者排序</option>
            <option value="isbn">依 ISBN 排序</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} style={{ flex: 1, marginBottom: 0, padding: '8px 12px' }}>
            <option value="">所有存放地點</option>
            {meta.locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ flex: 1, marginBottom: 0, padding: '8px 12px' }}>
            <option value="">所有擁有者</option>
            {meta.owners.map(own => <option key={own} value={own}>{own}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">載入中⋯</div>
      ) : filteredAndSortedBooks.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} color="#c7c7cc" />
          <p>尚未有符合條件的書籍</p>
        </div>
      ) : (
        <div className="book-list card">
          {filteredAndSortedBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onDelete={handleDelete} 
              onClick={(id) => navigate(`/edit/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Scan Page ────────────────────────────────────────────────────────────────
const ScanPage = () => {
  const navigate = useNavigate();
  const [manualIsbn, setManualIsbn] = useState('');
  const [camError, setCamError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showWebViewWarning, setShowWebViewWarning] = useState(false);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const startPromiseRef = useRef(null);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      // ignore
    }
  };

  const startScanner = async () => {
    // 檢查是否在 WebView 環境
    const isWebView = checkIsWebView();
    if (isWebView && !sessionStorage.getItem('webview_warning_dismissed')) {
      setShowWebViewWarning(true);
      return;
    }

    if (startPromiseRef.current) return;
    
    startPromiseRef.current = (async () => {
      try {
        setCamError('');
        await stopScanner();

        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';

        const html5Qrcode = new Html5Qrcode('reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        });
        
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 300, height: 100 } },
          (decodedText) => {
            if (mountedRef.current) {
              navigate(`/add?isbn=${encodeURIComponent(decodedText)}`);
            }
          },
          () => {} // ignore frame errors
        );
        if (mountedRef.current) setScanning(true);
      } catch (err) {
        console.error('Camera error:', err);
        if (mountedRef.current) {
          const errMsg = typeof err === 'string' ? err : (err?.message || '');
          // 針對 NotAllowedError 提供更詳細的提示
          if (errMsg.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
            setCamError('相機權限遭拒：如果您是在 LINE/FB 內開啟，請點擊選單並選擇「在瀏覽器中開啟」。');
            if (isWebView) setShowWebViewWarning(true);
          } else {
            setCamError(errMsg || '無法啟動相機，請確認已授予相機權限');
          }
        }
      } finally {
        startPromiseRef.current = null;
      }
    })();
    return startPromiseRef.current;
  };

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const handleManual = (e) => {
    e.preventDefault();
    if (manualIsbn.trim()) navigate(`/add?isbn=${encodeURIComponent(manualIsbn.trim())}`);
  };

  return (
    <div className="app-container">
      {showWebViewWarning && (
        <WebViewWarning onDismiss={() => {
          setShowWebViewWarning(false);
          sessionStorage.setItem('webview_warning_dismissed', 'true');
          startScanner(); // 再次嘗試啟動
        }} />
      )}
      <header><h1>掃描 ISBN</h1></header>
      <div className="card">
        <div id="reader" style={{ borderRadius: 10, overflow: 'hidden', minHeight: 250, background: '#000' }}></div>
        {camError ? (
          <div className="error-banner" style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>⚠️ {camError}</p>
            <button onClick={startScanner} style={{ marginTop: 10, fontSize: 14 }}>重試</button>
          </div>
        ) : (
          <p className="hint">{scanning ? '請對準書籍背面的 ISBN 條碼' : '正在啟動相機⋯'}</p>
        )}
      </div>
      <div className="card">
        <p className="section-label">或手動輸入 ISBN</p>
        <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
          <input
            value={manualIsbn}
            onChange={e => setManualIsbn(e.target.value)}
            placeholder="例如：9789861791234"
            style={{ marginBottom: 0 }}
          />
          <button type="submit" style={{ width: 'auto', padding: '0 16px', fontSize: 14 }}>查詢</button>
        </form>
      </div>
    </div>
  );
};

// ─── Add/Edit Book Page ───────────────────────────────────────────────────────
const BookFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const isbn = searchParams.get('isbn') || '';

  const [formData, setFormData] = useState({
    isbn,
    title: '',
    authors: [],
    thumbnail: '',
    location: localStorage.getItem('last_location') || '',
    owner: localStorage.getItem('last_owner') || '',
    hashtags: localStorage.getItem('last_hashtags') || '',
    notes: '',
    quantity: 1
  });

  const [meta, setMeta] = useState({ locations: [], owners: [], hashtags: [] });
  const [fetchStatus, setFetchStatus] = useState(isEdit || isbn ? 'loading' : 'idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const checkDbAndFetchGoogle = async () => {
    setFetchStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/books/isbn/${isbn}`);
      if (res.ok) {
        const exist = await res.json();
        const confirmIncrement = window.confirm(`此書籍已經存在您的藏書庫中 (已擁有 ${exist.quantity} 本)。\\n是否要直接將數量 +1？`);
        if (confirmIncrement) {
          await fetch(`${API_BASE}/api/books/${exist.id}/increment`, { method: 'PUT' });
          navigate('/');
          return;
        }
      }
    } catch (e) {}

    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await res.json();
      if (data.totalItems > 0) {
        const info = data.items[0].volumeInfo;
        setFormData(prev => ({
          ...prev,
          title: info.title || '',
          authors: info.authors || [],
          thumbnail: info.imageLinks?.thumbnail?.replace('http://', 'https://') || ''
        }));
        setFetchStatus('found');
      } else {
        setFetchStatus('not_found');
      }
    } catch (err) {
      setFetchStatus('error');
    }
  };

  const fetchExistingBook = async () => {
    setFetchStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/books/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          isbn: data.isbn || '',
          title: data.title || '',
          authors: Array.isArray(data.authors) ? data.authors : [],
          thumbnail: data.thumbnail || '',
          location: data.location || '',
          owner: data.owner || '',
          hashtags: data.hashtags || '',
          notes: data.notes || '',
          quantity: data.quantity || 1
        });
        setFetchStatus('found');
      } else {
        setFetchStatus('not_found');
      }
    } catch (e) {
      setFetchStatus('error');
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/metadata`)
      .then(r => r.json())
      .then(d => setMeta(d))
      .catch(() => {});

    if (isEdit) {
      fetchExistingBook();
    } else if (isbn) {
      checkDbAndFetchGoogle();
    }
  }, [id, isbn]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `${API_BASE}/api/books/${id}` : `${API_BASE}/api/books`;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const body = await res.json();
      if (res.ok) {
        if (!isEdit) {
          localStorage.setItem('last_location', formData.location);
          localStorage.setItem('last_owner', formData.owner);
          localStorage.setItem('last_hashtags', formData.hashtags);
        }
        navigate('/');
      } else {
        setError(body.error || '儲存失敗，請再試一次。');
      }
    } catch {
      setError('無法連線到伺服器，請檢查網路。');
    } finally {
      setSaving(false);
    }
  };

  const DropdownSelect = ({ options, onChange }) => (
    <select 
      value="" 
      onChange={e => { if (e.target.value) onChange(e.target.value); }}
      style={{ width: 44, padding: '0 8px', marginBottom: 0, textAlign: 'center', background: '#ececec', cursor: 'pointer' }}
    >
      <option value="" disabled>▾</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="app-container">
      <header>
        <h1>{isEdit ? '編輯書籍' : '新增書籍'}</h1>
        {fetchStatus === 'loading' && <p className="subtitle">請稍候，正在載入資料⋯</p>}
        {fetchStatus === 'not_found' && !isEdit && <p className="subtitle" style={{ color: '#ff9500' }}>⚠️ 未找到此 ISBN，請手動填寫</p>}
        {fetchStatus === 'error' && <p className="subtitle" style={{ color: '#ff3b30' }}>⚠️ 讀取失敗，請確認連線狀態</p>}
      </header>

      <form className="card" onSubmit={handleSubmit}>
        {formData.thumbnail && (
          <div style={{ textAlign: 'center', marginBottom: 15 }}>
            <img src={formData.thumbnail} alt="封面" style={{ height: 120, borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <label className="field-label">書名 <span style={{ color: '#ff3b30' }}>*</span></label>
        <input
          value={formData.title}
          onChange={e => set('title', e.target.value)}
          placeholder="請輸入書名"
          required
        />

        {isEdit && (
          <>
            <label className="field-label">封面圖片 URL</label>
            <input
              value={formData.thumbnail}
              onChange={e => set('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </>
        )}

        <label className="field-label">ISBN</label>
        <input 
          value={formData.isbn} 
          onChange={e => set('isbn', e.target.value)} 
          placeholder="可修改"
        />

        {isEdit && (
          <>
            <label className="field-label">數量</label>
            <input 
              type="number" 
              min="1" 
              value={formData.quantity} 
              onChange={e => set('quantity', parseInt(e.target.value) || 1)} 
            />
          </>
        )}

        <label className="field-label">作者（可用逗號分隔）</label>
        <input
          value={formData.authors.join(', ')}
          onChange={e => set('authors', e.target.value.split(/[,，]/).map(s => s.trim()))}
          placeholder="請輸入作者"
        />

        <label className="field-label">放置位置</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={formData.location}
            onChange={e => set('location', e.target.value)}
            placeholder="例如：書架 A、客廳"
            style={{ marginBottom: 0, flex: 1 }}
          />
          <DropdownSelect options={meta.locations} onChange={val => set('location', val)} />
        </div>

        <label className="field-label">所有人</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={formData.owner}
            onChange={e => set('owner', e.target.value)}
            placeholder="例如：小明"
            style={{ marginBottom: 0, flex: 1 }}
          />
          <DropdownSelect options={meta.owners} onChange={val => set('owner', val)} />
        </div>

        <label className="field-label">標籤（可用逗號分隔）</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={formData.hashtags}
            onChange={e => set('hashtags', e.target.value)}
            placeholder="例如：程式設計, 教育, 小說"
            style={{ marginBottom: 0, flex: 1 }}
          />
          <DropdownSelect options={meta.hashtags} onChange={val => set('hashtags', val)} />
        </div>

        <label className="field-label">備註</label>
        <textarea
          value={formData.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="您可以在這裡增加備註、讀後感等..."
          rows={3}
          style={{ resize: 'vertical' }}
        />

        <button type="submit" disabled={saving}>
          {saving ? '儲存中⋯' : '✓ 確認儲存'}
        </button>
      </form>
    </div>
  );
};

// ─── Search Page ──────────────────────────────────────────────────────────────
const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleDelete = async (id, pin) => {
    try {
      const res = await fetch(`${API_BASE}/api/books/${id}`, {
        method: 'DELETE',
        headers: { 'x-pin-code': pin || '' }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '刪除失敗');
        return;
      }
      setResults(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      alert('刪除失敗');
    }
  };

  const doSearch = () => {
    if (!query.trim()) return;
    fetch(`${API_BASE}/api/books?search=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => { setResults(d); setSearched(true); })
      .catch(() => {});
  };

  const onKey = e => { if (e.key === 'Enter') doSearch(); };

  return (
    <div className="app-container">
      <header><h1>搜尋</h1></header>
      <div className="card search-bar">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="書名、作者、ISBN、位置、所有人、標籤⋯"
          style={{ marginBottom: 0 }}
        />
        <button onClick={doSearch} style={{ width: 'auto', minWidth: 64, padding: '0 16px', fontSize: 15, marginLeft: 8 }}>
          <Search size={18} />
        </button>
      </div>
      {searched && (
        <div>
          {results.length === 0 ? (
            <div className="empty-state">
              <p>找不到相關書籍</p>
              <p style={{ fontSize: 14, color: '#8e8e93' }}>請嘗試不同的關鍵字</p>
            </div>
          ) : (
            <div className="book-list card">
              {results.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onDelete={handleDelete} 
                  onClick={(id) => navigate(`/edit/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <OfflineBadge />
      <PWAInstallBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/add" element={<BookFormPage />} />
        <Route path="/edit/:id" element={<BookFormPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
      <NavBar />
    </Router>
  );
}
