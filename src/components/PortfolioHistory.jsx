import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWeeklyBalancesByUser, getUserBalance, getMarketData } from '../services/portfolioService';
import { getUserAllocations } from '../services/allocationService';
import { getActiveOrUpcomingWeek } from '../services/weekService';
import PortfolioChart from './PortfolioChart';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Chip = ({ children, color = '#0d6efd' }) => (
  <span style={{
    display: 'inline-block', padding: '4px 10px', borderRadius: 999,
    background: color === 'gray' ? '#f1f3f5' : '#e7f1ff', color: color === 'gray' ? '#495057' : '#0d6efd',
    fontSize: 12, marginRight: 8
  }}>{children}</span>
);

const PortfolioHistory = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winMode, setWinMode] = useState('week'); // 'week' | 'pair'
  const [pairWinPct, setPairWinPct] = useState(null);
  const [pairEvents, setPairEvents] = useState(0);
  const [openStats, setOpenStats] = useState(false);
  const [openWeekList, setOpenWeekList] = useState(false);

  useEffect(() => {
    (async () => {
      if (!currentUser) { setLoading(false); return; }
      try {
        const data = await getWeeklyBalancesByUser(currentUser.uid, 104);
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
        } else {
          // Seed an initial row tied to the active/upcoming week using the user's balance or default 100,000
          const [bal, wk] = await Promise.all([
            getUserBalance(currentUser.uid).catch(() => null),
            getActiveOrUpcomingWeek().catch(() => null),
          ]);
          const latest = Number(bal?.latestBalance);
          const seedBalance = Number.isFinite(latest) && latest > 0 ? latest : 100000;
          const weekId = wk?.id || 'Başlangıç';
          const collected = [];
          // Try direct docId lookups for current and previous week as a fallback
          const prevWeekId = (() => {
            const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
            if (!m) return null;
            const y = Number(m[1]);
            const w = Number(m[2]);
            if (w > 1) return `${y}-W${String(w - 1).padStart(2, '0')}`;
            return `${y - 1}-W52`; // simple fallback for year wrap
          })();
          for (const wid of [weekId, prevWeekId]) {
            if (!wid) continue;
            const id = `${wid}_${currentUser.uid}`;
            try {
              const s = await getDoc(doc(db, 'weeklyBalances', id));
              if (s.exists()) collected.push(s.data());
            } catch (e) {
              // ignore
            }
          }
          if (collected.length) {
            collected.sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
            setRows(collected);
          } else {
            setRows([{ weekId, baseBalance: seedBalance, endBalance: seedBalance, resultReturnPct: 0, uid: currentUser.uid }]);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
    return sorted.map(r => ({
      weekId: r.weekId,
      endBalance: Number(r.endBalance) || null,
      baseBalance: Number(r.baseBalance) || null,
      resultReturnPct: Number(r.resultReturnPct),
    }));
  }, [rows]);

  const avgWeeklyPct = useMemo(() => {
    const vals = chartData.map(d => Number(d.resultReturnPct)).filter(v => Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [chartData]);
  const playedWeeks = useMemo(() => chartData.filter(d => Number.isFinite(Number(d.resultReturnPct))).length, [chartData]);
  const weekWinPct = useMemo(() => {
    const vals = chartData.map(d => Number(d.resultReturnPct)).filter(v => Number.isFinite(v));
    if (!vals.length) return null;
    const wins = vals.filter(v => v > 0).length;
    return (wins / vals.length) * 100;
  }, [chartData]);

  // Compute pair-level win rate: across all allocations, count pair allocations with positive market return
  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      try {
        const allocs = await getUserAllocations(currentUser.uid, 60).catch(() => []);
        if (!allocs || !allocs.length) { setPairWinPct(null); setPairEvents(0); return; }
        const cache = new Map();
        let wins = 0; let total = 0;
        for (const a of allocs) {
          const wid = a?.weekId; const pairs = a?.pairs || {};
          if (!wid || !pairs) continue;
          let md = cache.get(wid);
          if (!md) { md = await getMarketData(wid).catch(() => null); cache.set(wid, md); }
          for (const sym of Object.keys(pairs)) {
            // Market data uses flat structure: md[symbol] not md.pairs[symbol]
            const ret = Number(md?.[sym]?.returnPct);
            if (Number.isFinite(ret)) {
              total += 1; if (ret > 0) wins += 1;
            }
          }
        }
        if (total > 0) { setPairWinPct((wins / total) * 100); setPairEvents(total); } else { setPairWinPct(null); setPairEvents(0); }
      } catch {
        setPairWinPct(null); setPairEvents(0);
      }
    })();
  }, [currentUser]);

  const fmtMoney = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? `₺${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
  };
  const fmtPct = (n) => (Number.isFinite(Number(n)) ? `${Number(n).toFixed(2)}%` : '—');


  if (!currentUser) return null;
  if (loading) return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi</div>
        <span className="chip-pill chip-gray">Yükleniyor…</span>
      </div>
    </div>
  );
  if (!rows.length) return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi</div>
        <span className="chip-pill chip-gray">Veri yok</span>
      </div>
      <p className="ph-empty">Henüz geçmiş verisi yok. Haftalar sonuçlandıkça geçmişiniz burada oluşacaktır.</p>
    </div>
  );

  return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi</div>
        <button type="button" className={`faq-toggle ${openStats ? 'open' : ''}`} aria-expanded={openStats} onClick={() => setOpenStats(o => !o)}>⌃</button>
      </div>

      <div className={`ph-stats-wrap ${openStats ? 'open' : ''}`}>
      <div className="ph-stats">
        <div className="ph-stat" style={{ position: 'relative' }}>
          <div className="ph-stat-label">Win Rate</div>
          <button type="button" className="mini-switch" onClick={() => setWinMode(m => (m === 'week' ? 'pair' : 'week'))}>
            {winMode === 'week' ? 'Hafta' : 'Parite'}
          </button>
          <div className="ph-stat-value">{winMode === 'week' ? fmtPct(weekWinPct) : fmtPct(pairWinPct)}</div>
          <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>
            {winMode === 'week' ? `Toplam: ${playedWeeks}` : `Toplam: ${pairEvents}`}
          </div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">Ortalama Haftalık %</div>
          <div className="ph-stat-value">{fmtPct(avgWeeklyPct)}</div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">Oynanan Hafta</div>
          <div className="ph-stat-value">{playedWeeks}</div>
        </div>
      </div>
      </div>

      <PortfolioChart data={chartData} />

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 800, color: '#111827' }}>Haftalık Getiriler</div>
          <button
            type="button"
            className={`faq-toggle ${openWeekList ? 'open' : ''}`}
            aria-expanded={openWeekList}
            onClick={() => setOpenWeekList(o => !o)}
            title={openWeekList ? 'Kapat' : 'Aç'}
          >
            ⌃
          </button>
        </div>

        {openWeekList && (
          <table className="ph-table">
            <thead>
              <tr>
                <th className="ph-cell">Hafta</th>
                <th className="ph-cell">Getiri</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map(d => (
                <tr key={`row_${d.weekId}`} className="ph-row">
                  <td className="ph-cell">{d.weekId}</td>
                  <td
                    className="ph-cell pct"
                    style={{
                      color: Number(d.resultReturnPct) > 0 ? '#16a34a' : (Number(d.resultReturnPct) < 0 ? '#dc2626' : '#9ca3af')
                    }}
                  >
                    {fmtPct(d.resultReturnPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PortfolioHistory;


