import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Dashboard.css';

const categories = ['all', 'automation', 'admin', 'market', 'allocation', 'recompute', 'auth'];

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setError(e?.message || 'Failed to load logs. Check admin access and Firestore rules.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (cat !== 'all' && l.category !== cat) return false;
      if (search) {
        const s = search.toLowerCase();
        const text = `${l.message || ''} ${l.action || ''} ${l.weekId || ''} ${JSON.stringify(l.data || {})} ${JSON.stringify(l.user || {})}`.toLowerCase();
        if (!text.includes(s)) return false;
      }
      return true;
    });
  }, [logs, cat, search]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Logs</h1>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <Link to="/admin/actions" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Actions
          </Link>
          <Link to="/admin/users" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Kullanıcı Yönetimi
          </Link>
        </div>
      </div>
      <div className="dashboard-content">
        {loading && (
          <div className="info-card" style={{ marginBottom: '1rem' }}>
            Loading logs...
          </div>
        )}
        {error && (
          <div className="info-card" style={{ marginBottom: '1rem', color: '#dc3545' }}>
            {error}
          </div>
        )}
        <div className="info-card" style={{ marginBottom: '1rem' }}>
          <h3>Filters</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Search text" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="info-card">
          <h3>Events ({filtered.length})</h3>
          <div style={{ maxHeight: 600, overflow: 'auto' }}>
            {filtered.length === 0 && !loading && !error && (
              <div style={{ color: '#6c757d' }}>No log events yet.</div>
            )}
            {filtered.map(l => (
              <div key={l.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '0.75rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <strong>{l.category}</strong> · {l.action} · {l.outcome}
                  </div>
                  <div style={{ color: '#6c757d' }}>
                    {l.createdAt?.toDate?.()?.toLocaleString?.() || ''}
                  </div>
                </div>
                <div style={{ marginTop: '0.25rem' }}>{l.message}</div>
                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  {l.weekId ? `week: ${l.weekId}` : ''}
                </div>
                <pre style={{ background: '#f8f9fa', borderRadius: 8, padding: '0.5rem', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
{JSON.stringify({ user: l.user, data: l.data, source: l.source, severity: l.severity }, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;


