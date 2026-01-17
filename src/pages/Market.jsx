import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import TVHeatmap from '../components/TVHeatmap';
import TVSymbolOverview from '../components/TVSymbolOverview';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { getUserAllocations } from '../services/allocationService';

const Market = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]); // [{ id, data }]
  const [weeksMap, setWeeksMap] = useState({}); // id -> { startDate, endDate }
  const [openIdx, setOpenIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allocSymsByWeek, setAllocSymsByWeek] = useState({}); // weekId -> Set(symbol)

  useEffect(() => {
    (async () => {
      try {
        // Read all marketData docs (each doc per week)
        const mref = collection(db, 'marketData');
        const msnap = await getDocs(mref);
        const list = msnap.docs.map(d => ({ id: d.id, data: d.data() }));
        // Sort by week id descending (YYYY-Wxx lexicographically works)
        list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        setRows(list);

        // Load weeks map to show period range when available
        const wref = collection(db, 'weeks');
        const wsnap = await getDocs(wref);
        const map = {};
        wsnap.docs.forEach(doc => {
          const w = doc.data();
          if (w?.id) map[w.id] = { startDate: w.startDate, endDate: w.endDate };
        });
        setWeeksMap(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load current user's allocations (for row highlighting)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentUser) {
        if (mounted) setAllocSymsByWeek({});
        return;
      }
      try {
        const allocs = await getUserAllocations(currentUser.uid, 260);
        if (!mounted) return;
        const map = {};
        allocs.forEach(a => {
          const entries = Object.entries(a?.pairs || {}).filter(([, w]) => Number(w) > 0);
          map[a.weekId] = new Set(entries.map(([k]) => k));
        });
        setAllocSymsByWeek(map);
      } catch {
        if (mounted) setAllocSymsByWeek({});
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  return (
    <div className="info-card">
      <h3>Market</h3>
      {loading ? <p style={{ color: '#6c757d' }}>Loading…</p> : (
        <div>
          {rows.map((row, idx) => {
            const m = row.data || {};
            const w = weeksMap[row.id] || {};
            const start = w?.startDate?.toDate?.();
            const end = w?.endDate?.toDate?.();
            const inferPeriod = () => {
              // Fallback: infer Mon→Fri from fetchedAt (assumed Fri) or today
              const fetched = m?.fetchedAt?.toDate?.() || new Date();
              const base = new Date(Date.UTC(fetched.getUTCFullYear(), fetched.getUTCMonth(), fetched.getUTCDate()));
              // ISO Monday of this week
              const day = base.getUTCDay() === 0 ? 7 : base.getUTCDay();
              const monday = new Date(base);
              monday.setUTCDate(base.getUTCDate() - day + 1);
              const friday = new Date(monday);
              friday.setUTCDate(monday.getUTCDate() + 4);
              return `${monday.toLocaleDateString()} → ${friday.toLocaleDateString()}`;
            };
            const period = (start && end)
              ? `${start.toLocaleDateString()} → ${end.toLocaleDateString()}`
              : inferPeriod();
            const opened = openIdx === idx;
            const pairs = Object.keys(m).filter(k => typeof m[k] === 'object' && (m[k]?.open != null || m[k]?.close != null));
            const allocSyms = allocSymsByWeek[row.id];
            return (
              <div key={row.id} style={{ border: '1px solid #e9ecef', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(opened ? null : idx)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', background: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{row.id}</div>
                    <div style={{ color: '#6c757d', fontSize: 12 }}>{period}</div>
                  </div>
                  <span style={{ color: '#6c757d' }}>{opened ? '−' : '+'}</span>
                </button>
                {opened && (
                  <div style={{ borderTop: '1px solid #f1f3f5', padding: '10px 12px' }}>
                    {pairs.length ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                          <div style={{ fontWeight: 700, color: '#6c757d' }}>Pair</div>
                          <div style={{ fontWeight: 700, color: '#6c757d' }}>Open</div>
                          <div style={{ fontWeight: 700, color: '#6c757d' }}>Close</div>
                          <div style={{ fontWeight: 700, color: '#6c757d' }}>Return</div>
                        </div>
                        {pairs.map(sym => {
                          const allocated = !!allocSyms && allocSyms.has(sym);
                          return (
                            <div
                              key={`${row.id}_${sym}_row`}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                gap: 8,
                                padding: '8px 10px',
                                borderRadius: 10,
                                background: allocated ? '#f1f3f5' : 'transparent',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 800 }}>{sym}</div>
                              <div>${m[sym]?.open != null ? Number(m[sym].open).toFixed(2) : '—'}</div>
                              <div>${m[sym]?.close != null ? Number(m[sym].close).toFixed(2) : '—'}</div>
                              <div style={{ color: Number(m[sym]?.returnPct || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
                                {m[sym]?.returnPct != null ? `${Number(m[sym].returnPct).toFixed(2)}%` : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: '#6c757d' }}>No market data.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <TVSymbolOverview />
      </div>
      <div style={{ marginTop: 16 }}>
        <TVHeatmap />
      </div>
    </div>
  );
};

export default Market;


