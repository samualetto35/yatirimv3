import { useEffect, useState } from 'react';

// Simple RSS fetcher using allorigins CORS proxy and DOMParser
const sources = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' }, // Markets
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
];

const proxyTargets = [
  (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://cors.isomorphic-git.org/${u}`,
];

const timeAgo = (date) => {
  const d = new Date(date);
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const days = Math.floor(h / 24);
  return `${days} g`; 
};

const NewsFeed = ({ limit = 10 }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError('');
        // Fetch sources sequentially to reduce concurrent network overhead (often faster with RSS proxies)
        const results = [];
        for (const s of sources) {
          try {
            let html = '';
            let ok = false;
            for (const make of proxyTargets) {
              try {
                const url = make(s.url);
                const r = await fetch(url);
                // allorigins/raw returns plain text, /get returns JSON
                const ct = r.headers.get('content-type') || '';
                if (ct.includes('application/json')) {
                  const j = await r.json();
                  html = j?.contents || '';
                } else {
                  html = await r.text();
                }
                if (html) { ok = true; break; }
              } catch (_) { /* try next proxy */ }
            }
            if (!ok) throw new Error('proxy-failed');
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const arr = Array.from(doc.querySelectorAll('item')).slice(0, 8).map((it) => {
              const title = it.querySelector('title')?.textContent?.trim() || '';
              const linkNode = it.querySelector('link');
              const fbNode = it.querySelector('feedburner\\:origLink');
              const desc = it.querySelector('description')?.textContent || '';
              const findHttp = (str) => {
                if (!str) return '';
                const m = String(str).match(/https?:\/\/[\w\-._~:?#\[\]@!$&'()*+,;=%/]+/i);
                return m ? m[0] : '';
              };
              const hrefAttr = linkNode?.getAttribute?.('href') || '';
              const linkText = linkNode?.textContent?.trim() || '';
              const guidText = it.querySelector('guid')?.textContent?.trim() || '';
              const fbText = fbNode?.textContent?.trim() || '';
              const firstHttp = [hrefAttr, linkText, fbText, guidText, desc].map(findHttp).find(Boolean) || '#';
              const pub = it.querySelector('pubDate')?.textContent || it.querySelector('published')?.textContent || new Date().toISOString();
              return { title, link: firstHttp, pubDate: pub, source: s.name };
            });
            results.push(arr);
          } catch { /* ignore */ }
        }
        const merged = results.flat().filter(n => n.title);
        // Deduplicate by title
        const uniq = Array.from(new Map(merged.map(x => [x.title, x])).values());
        uniq.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        setItems(uniq.slice(0, limit));
      } catch (e) {
        setError('Haberler yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return (
    <div className="info-card mt-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Haber Akışı</h3>
        <span className="chip-pill chip-gray">Finans Haberleri</span>
      </div>
      {loading ? (
        <p style={{ color: '#6c757d' }}>Yükleniyor…</p>
      ) : error ? (
        <p style={{ color: '#dc2626' }}>{error}</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((n, i) => (
            <a key={`${n.source}_${i}`} href={/^https?:\/\//i.test(n.link) ? n.link : '#'} onClick={(e) => { if (!/^https?:\/\//i.test(n.link)) { e.preventDefault(); } else { e.preventDefault(); window.open(n.link, '_blank', 'noopener,noreferrer'); } }} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '10px 12px', border: '1px solid #eef2f7', borderRadius: 12, background: '#fcfcfd', display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{n.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="chip-pill chip-gray" style={{ fontSize: 12 }}>{n.source}</span>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{timeAgo(n.pubDate)} önce</span>
                </div>
              </div>
            </a>
          ))}
          {!items.length && <div style={{ color: '#6c757d', fontSize: 12 }}>Gösterilecek haber bulunamadı.</div>}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;


