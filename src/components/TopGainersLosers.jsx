import { useEffect, useMemo, useState } from 'react';
import { getLatestSettledWeek, getMarketData } from '../services/portfolioService';
import { useAuth } from '../context/AuthContext';
import { getUserAllocationForWeek } from '../services/allocationService';

const Row = ({ rank, symbol, pct, isAllocated }) => {
  const positive = Number(pct) >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid #eef2f7', background: isAllocated ? '#f1f3f5' : '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ minWidth: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 12 }}>{rank}</span>
        <span style={{ fontWeight: 800 }}>{symbol}</span>
      </div>
      <span style={{ fontWeight: 800, color: positive ? '#16a34a' : '#dc2626' }}>{Number(pct).toFixed(2)}%</span>
    </div>
  );
};

const TopGainersLosers = ({ limit = 5 }) => {
  const { currentUser } = useAuth();
  const [weekId, setWeekId] = useState('');
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allocSyms, setAllocSyms] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError('');
        const latest = await getLatestSettledWeek();
        let md = null;
        if (latest?.id) {
          setWeekId(latest.id);
          md = await getMarketData(latest.id);

          // Load user's allocation for this (settled) week to highlight rows
          try {
            if (currentUser?.uid) {
              const alloc = await getUserAllocationForWeek(latest.id, currentUser.uid);
              const syms = new Set(
                Object.entries(alloc?.pairs || {})
                  .filter(([, w]) => Number(w) > 0)
                  .map(([k]) => k)
              );
              setAllocSyms(syms);
            } else {
              setAllocSyms(new Set());
            }
          } catch {
            setAllocSyms(new Set());
          }
        }
        // Only show data for settled weeks - do not fallback to active weeks
        // This prevents showing incomplete data from weeks that haven't ended yet
        // Extract pairs from either md.pairs or top-level symbols (AAPL/TSLA ...)
        const reserved = new Set(['id', 'fetchedAt', 'window', 'tz', 'source']);
        const entries = md?.pairs
          ? Object.entries(md.pairs)
          : Object.entries(md || {}).filter(([k, v]) => !reserved.has(k) && v && typeof v === 'object' && ('returnPct' in v));
        const pairs = entries.map(([symbol, v]) => ({ symbol, pct: Number(v?.returnPct) }));
        const pos = pairs.filter(p => Number.isFinite(p.pct) && p.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, limit);
        const neg = pairs.filter(p => Number.isFinite(p.pct) && p.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, limit);
        setGainers(pos);
        setLosers(neg);
      } catch (e) {
        setError(e?.message || 'Veri yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [limit, currentUser]);

  const allocSymsMemo = useMemo(() => allocSyms, [allocSyms]);

  return (
    <div className="info-card right-col-row2 mt-card" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <h3 style={{ margin: 0, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          En Çok Yükselenler / En Çok Değer Kaybedenler
        </h3>
        <span className="chip-pill chip-gray" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{weekId || '—'}</span>
      </div>
      {loading ? (
        <p style={{ color: '#6c757d' }}>Yükleniyor…</p>
      ) : error ? (
        <p style={{ color: '#dc2626' }}>{error}</p>
      ) : (
        <div className="tgl-cols" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, minWidth: 0 }}>
          <div className="tgl-col gainers">
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>En Çok Yükselenler</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {gainers.map((g, i) => (
                <Row key={`g_${g.symbol}`} rank={i + 1} symbol={g.symbol} pct={g.pct} isAllocated={allocSymsMemo.has(g.symbol)} />
              ))}
              {!gainers.length && <div style={{ color: '#6c757d', fontSize: 12 }}>Veri yok</div>}
            </div>
          </div>
          <div className="tgl-col losers">
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>En Çok Değer Kaybedenler</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {losers.map((g, i) => (
                <Row key={`l_${g.symbol}`} rank={i + 1} symbol={g.symbol} pct={g.pct} isAllocated={allocSymsMemo.has(g.symbol)} />
              ))}
              {!losers.length && <div style={{ color: '#6c757d', fontSize: 12 }}>Veri yok</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopGainersLosers;


