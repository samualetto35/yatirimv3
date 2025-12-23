import { useEffect, useState } from 'react';
import { getLatestSettledWeek, getMarketData } from '../services/portfolioService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const Row = ({ rank, symbol, pct }) => {
  const positive = Number(pct) >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid #eef2f7', background: '#f9fafb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ minWidth: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 12 }}>{rank}</span>
        <span style={{ fontWeight: 800 }}>{symbol}</span>
      </div>
      <span style={{ fontWeight: 800, color: positive ? '#16a34a' : '#dc2626' }}>{Number(pct).toFixed(2)}%</span>
    </div>
  );
};

const TopGainersLosers = ({ limit = 5 }) => {
  const [weekId, setWeekId] = useState('');
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError('');
        const latest = await getLatestSettledWeek();
        let md = null;
        if (latest?.id) {
          setWeekId(latest.id);
          md = await getMarketData(latest.id);
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
  }, [limit]);

  return (
    <div className="info-card right-col-row2 mt-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Top Gainers / Top Losers</h3>
        <span className="chip-pill chip-gray">{weekId || '—'}</span>
      </div>
      {loading ? (
        <p style={{ color: '#6c757d' }}>Yükleniyor…</p>
      ) : error ? (
        <p style={{ color: '#dc2626' }}>{error}</p>
      ) : (
        <div className="tgl-cols" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="tgl-col gainers">
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Top Gainers</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {gainers.map((g, i) => (
                <Row key={`g_${g.symbol}`} rank={i + 1} symbol={g.symbol} pct={g.pct} />
              ))}
              {!gainers.length && <div style={{ color: '#6c757d', fontSize: 12 }}>Veri yok</div>}
            </div>
          </div>
          <div className="tgl-col losers">
            <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Top Losers</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {losers.map((g, i) => (
                <Row key={`l_${g.symbol}`} rank={i + 1} symbol={g.symbol} pct={g.pct} />
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


