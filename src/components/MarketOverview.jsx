import { useEffect, useState } from 'react';
import { getLatestSettledWeek, getMarketData } from '../services/portfolioService';

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

  const Row = ({ sym, rec }) => {
    if (!rec) return null;
    const pct = Number(rec.returnPct ?? rec.resultReturnPct ?? ((rec.close && rec.open) ? ((rec.close-rec.open)/rec.open)*100 : 0));
    return (
      <div className="info-item">
        <span style={{ fontWeight: 600 }}>{sym}</span>
        <span>
          Open ${Number(rec.open).toFixed(2)} | Close ${Number(rec.close).toFixed(2)}
          <Badge color={pct >= 0 ? 'green' : 'red'}>{pct.toFixed(2)}%</Badge>
        </span>
      </div>
    );
  };

  return (
    <div className="info-card">
      <h3>Market Overview <Badge>Week {weekId}</Badge></h3>
      {!md ? (
        <p style={{ color: '#6c757d' }}>No market data available.</p>
      ) : (
        <div>
          <Row sym="AAPL" rec={md.AAPL} />
          <Row sym="TSLA" rec={md.TSLA} />
          {md.window && (
            <p style={{ color: '#6c757d', marginTop: 8 }}>Window: {md.window.period1} → {md.window.period2} (UTC)</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketOverview;


