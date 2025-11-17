import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserAllocations } from '../services/allocationService';
import { getActiveOrUpcomingWeek } from '../services/weekService';

const UserAllocations = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [sortKey, setSortKey] = useState('week'); // 'week' | 'result'
  const [sortDir, setSortDir] = useState('default'); // 'default' | 'asc' | 'desc'
  const [activeWeekId, setActiveWeekId] = useState('');

  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      const [data, w] = await Promise.all([
        getUserAllocations(currentUser.uid, 20),
        getActiveOrUpcomingWeek().catch(() => null),
      ]);
      setRows(data);
      setActiveWeekId(w?.id || '');
    })();
  }, [currentUser]);

  if (!currentUser) return null;

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    setSortDir(prev => (prev === 'asc' ? 'desc' : (prev === 'desc' ? 'default' : 'asc')));
  };

  const sorted = useMemo(() => {
    const arr = rows.slice();
    if (sortDir === 'default') {
      // Varsayılan: week artan (mevcut davranış)
      arr.sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
      return arr;
    }
    if (sortKey === 'week') {
      arr.sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
      if (sortDir === 'desc') arr.reverse();
      return arr;
    }
    if (sortKey === 'result') {
      arr.sort((a, b) => Number(a.resultReturnPct || 0) - Number(b.resultReturnPct || 0));
      if (sortDir === 'desc') arr.reverse();
      return arr;
    }
    return arr;
  }, [rows, sortKey, sortDir]);

  // Filter: only active/open week allocation (not closed/settled)
  const activeAlloc = useMemo(() => {
    if (!activeWeekId) return null;
    return rows.find(r => r.weekId === activeWeekId) || null;
  }, [rows, activeWeekId]);

  const fmtPairs = (pairs) => {
    const parts = [];
    if (pairs) {
      Object.entries(pairs).forEach(([sym, w]) => {
        const pct = Number(w || 0) * 100;
        if (pct > 0) parts.push(`${sym} ${pct.toFixed(2)}%`);
      });
    }
    return parts.length ? parts.join(' · ') : '—';
  };

  const hasActive = !!activeAlloc;

  return (
    <div className="info-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Aktif Yatırımım</h3>
        <span className={`chip-pill ${hasActive ? 'chip-green' : 'chip-gray'}`}>{hasActive ? 'Var' : 'Yok'}</span>
      </div>
      {!activeAlloc ? (
        <p style={{ color: '#6c757d' }}>Şu anda açık haftaya ait bir yatırım tercihiniz bulunmuyor.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <div className="ph-row" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
            <div className="ph-cell" style={{ fontWeight: 800 }}>Hafta</div>
            <div className="ph-cell">{activeAlloc.weekId}</div>
          </div>
          <div className="ph-row" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
            <div className="ph-cell" style={{ fontWeight: 800 }}>Allocation</div>
            <div className="ph-cell">{fmtPairs(activeAlloc.pairs)}</div>
          </div>
        </div>
      )}
      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 10 }}>
        Aktif yatırımlarınızın getirileri Cuma kapanışından sonra akşam hesaplanır ve bakiyeniz güncellenir.
      </p>
    </div>
  );
};

export default UserAllocations;


