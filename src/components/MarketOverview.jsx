import { useEffect, useState } from 'react';
import { getLatestSettledWeek, getMarketData } from '../services/portfolioService';
import { getInstrumentByCode } from '../config/instruments';

const Badge = ({ children, color = 'gray' }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
    background: color === 'gray' ? '#f1f3f5' : (color === 'green' ? '#e8f5e9' : '#fdecea'),
    color: color === 'gray' ? '#495057' : (color === 'green' ? '#2e7d32' : '#c62828'),
    fontSize: 12, marginLeft: 8
  }}>{children}</span>
);

const MarketOverview = () => {
  const [weekId, setWeekId] = useState(null);
  const [md, setMd] = useState(null);

  useEffect(() => {
    (async () => {
      const latest = await getLatestSettledWeek();
      if (!latest) return;
      setWeekId(latest.id);
      const data = await getMarketData(latest.id);
      setMd(data);
    })();
  }, []);

  if (!weekId) return null;

  const getPct = (rec) => Number(rec?.returnPct ?? rec?.resultReturnPct ?? ((rec?.close && rec?.open) ? ((rec.close - rec.open) / rec.open) * 100 : 0));

  // Extract all instruments from market data (exclude metadata fields)
  const reservedFields = new Set(['window', 'fetchedAt', 'createdAt', 'updatedAt', 'tz', 'source', 'pairs']);
  const instruments = md ? Object.keys(md)
    .filter(key => !reservedFields.has(key) && md[key] && typeof md[key] === 'object' && (md[key].open != null || md[key].close != null))
    .map(key => ({ symbol: key, data: md[key] }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol)) : [];

  return (
    <div className="info-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Market Overview</h3>
        <span className="chip-pill chip-gray">{weekId || '—'}</span>
      </div>
      {!md ? (
        <p style={{ color: '#6c757d' }}>No market data available.</p>
      ) : instruments.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No instrument data available.</p>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 420 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1fr) 110px 1fr 1fr', gap: 10, padding: '8px 10px', borderRadius: 12, background: '#f8fafc', border: '1px solid #eef2f7', color: '#6b7280', fontWeight: 800, fontSize: 12 }}>
              <div>Pair</div>
              <div style={{ textAlign: 'right' }}>Return</div>
              <div>Open</div>
              <div>Close</div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {instruments.map(({ symbol, data }) => {
                const pct = getPct(data);
                const open = data?.open != null ? Number(data.open) : null;
                const close = data?.close != null ? Number(data.close) : null;
                const col = pct > 0 ? 'green' : (pct < 0 ? 'red' : 'gray');
                const instrument = getInstrumentByCode(symbol);
                const fullName = instrument?.fullName || instrument?.name || symbol;
                const openCloseStyle = { fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500 };
                return (
                  <div key={symbol} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1fr) 110px 1fr 1fr', gap: 10, padding: '8px 10px', borderRadius: 12, border: '1px solid #eef2f7', background: '#ffffff', alignItems: 'center' }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.875rem' }}>{symbol}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }} title={fullName}>
                        {fullName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Badge color={col}>{Number.isFinite(pct) ? pct.toFixed(2) : '—'}%</Badge>
                    </div>
                    <div style={openCloseStyle}>{open != null ? `$${open.toFixed(2)}` : '—'}</div>
                    <div style={openCloseStyle}>{close != null ? `$${close.toFixed(2)}` : '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {md.window && (
            <p style={{ color: '#6c757d', marginTop: 8 }}>Window: {md.window.period1} → {md.window.period2} (UTC)</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketOverview;


