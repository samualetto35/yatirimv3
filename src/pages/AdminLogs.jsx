import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Admin.css';

const categories = ['all', 'automation', 'admin', 'market', 'allocation', 'recompute', 'auth'];
const severities = ['all', 'info', 'warning', 'error'];
const outcomes = ['all', 'success', 'failure'];

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [cat, setCat] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const col = collection(db, 'logs');
        let q = query(col, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLogs(arr);
      } catch (e) {
        setError(e?.message || 'Loglar yüklenemedi. Admin erişimi ve Firestore kurallarını kontrol edin.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (cat !== 'all' && l.category !== cat) return false;
      if (severity !== 'all' && l.severity !== severity) return false;
      if (outcome !== 'all' && l.outcome !== outcome) return false;
      if (search) {
        const s = search.toLowerCase();
        const text = `${l.message || ''} ${l.action || ''} ${l.weekId || ''} ${JSON.stringify(l.data || {})} ${JSON.stringify(l.user || {})}`.toLowerCase();
        if (!text.includes(s)) return false;
      }
      return true;
    });
  }, [logs, cat, severity, outcome, search]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp?.toDate?.() || new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Istanbul'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getSeverityBadge = (sev) => {
    if (sev === 'error') return 'admin-badge-danger';
    if (sev === 'warning') return 'admin-badge-info';
    return 'admin-badge-success';
  };

  const getCategoryColor = (cat) => {
    const colors = {
      automation: '#3b82f6',
      admin: '#8b5cf6',
      market: '#10b981',
      allocation: '#f59e0b',
      recompute: '#ef4444',
      auth: '#6b7280'
    };
    return colors[cat] || '#6b7280';
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Logs</h1>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
            <Link to="/admin/users" className="admin-nav-link">Kullanıcılar</Link>
            <Link to="/admin/performance" className="admin-nav-link">Performans</Link>
            <Link to="/admin/actions" className="admin-nav-link">Actions</Link>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {loading && (
          <div className="admin-card">
            <div className="admin-loading">Loglar yükleniyor...</div>
          </div>
        )}

        {error && (
          <div className="admin-card" style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
            <div style={{ color: '#dc2626', fontWeight: '500' }}>{error}</div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Filtreler</h3>
          </div>
          <div className="admin-search">
            <input
              className="admin-search-input"
              placeholder="Metin ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-pills">
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', marginRight: '0.5rem' }}>Kategori:</span>
            {categories.map(c => (
              <button
                key={c}
                className={`admin-filter-pill ${cat === c ? 'active' : ''}`}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="admin-filter-pills" style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', marginRight: '0.5rem' }}>Severity:</span>
            {severities.map(s => (
              <button
                key={s}
                className={`admin-filter-pill ${severity === s ? 'active' : ''}`}
                onClick={() => setSeverity(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="admin-filter-pills" style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', marginRight: '0.5rem' }}>Outcome:</span>
            {outcomes.map(o => (
              <button
                key={o}
                className={`admin-filter-pill ${outcome === o ? 'active' : ''}`}
                onClick={() => setOutcome(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.75rem' }}>
            Toplam: <strong>{logs.length}</strong> log | Filtrelenmiş: <strong>{filtered.length}</strong>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Olaylar ({filtered.length})</h3>
          </div>
          <div className="admin-scrollable" style={{ maxHeight: '700px' }}>
            {filtered.length === 0 && !loading && !error && (
              <div className="admin-empty">Henüz log olayı yok.</div>
            )}
            {filtered.map(l => {
              const isExpanded = expandedLog === l.id;
              return (
                <div
                  key={l.id}
                  className="admin-log-entry"
                  onClick={() => setExpandedLog(isExpanded ? null : l.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="admin-log-header">
                    <div className="admin-log-meta">
                      <span
                        className="admin-badge"
                        style={{
                          background: getCategoryColor(l.category) + '20',
                          color: getCategoryColor(l.category),
                          border: `1px solid ${getCategoryColor(l.category)}40`
                        }}
                      >
                        {l.category}
                      </span>
                      <span className={`admin-badge ${getSeverityBadge(l.severity)}`}>
                        {l.severity || 'info'}
                      </span>
                      {l.outcome && (
                        <span className={`admin-badge ${l.outcome === 'success' ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                          {l.outcome}
                        </span>
                      )}
                      <strong style={{ color: '#111827', fontSize: '0.875rem' }}>{l.action}</strong>
                      {l.weekId && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                          {l.weekId}
                        </span>
                      )}
                    </div>
                    <div className="admin-log-time">
                      {formatDate(l.createdAt)}
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', color: '#374151', fontSize: '0.875rem' }}>
                    {l.message}
                  </div>
                  {isExpanded && (l.user || l.data || l.source) && (
                    <details open style={{ marginTop: '0.75rem' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.8125rem', color: '#6b7280', userSelect: 'none', marginBottom: '0.5rem' }}>
                        Detaylar
                      </summary>
                      <pre className="admin-json-block">
                        {JSON.stringify({ user: l.user, data: l.data, source: l.source, severity: l.severity }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
