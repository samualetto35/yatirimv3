import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useAuth } from '../context/AuthContext';
import { getWeeklyBalancesByUser } from '../services/portfolioService';
import { getDailyReturnsByWeek } from '../services/portfolioService';

const fmtMoney = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? `₺${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
};

const fmtCompact = (n) => {
  const v = Math.abs(Number(n));
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `₺${(n / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `₺${(n / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `₺${Math.round(n / 1e3)}k`;
  return `₺${Math.round(n).toLocaleString()}`;
};

const DailyPortfolioChart = () => {
  const { currentUser } = useAuth();
  const containerRef = useRef(null);
  const uplotRef = useRef(null);
  const tooltipRef = useRef(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [dailyDataMap, setDailyDataMap] = useState({}); // { weekId: [d1, d2, d3, d4] }
  const [loading, setLoading] = useState(true);

  // Fetch weekly data and daily data for recent weeks
  useEffect(() => {
    (async () => {
      if (!currentUser) { setLoading(false); return; }
      try {
        // Get weekly balances (last 8 weeks for better visualization)
        const weekly = await getWeeklyBalancesByUser(currentUser.uid, 8);
        setWeeklyData(weekly || []);

        // Fetch daily data for these weeks
        const dailyMap = {};
        for (const week of weekly.slice(-4)) { // Last 4 weeks
          if (!week.weekId) continue;
          try {
            const daily = await getDailyReturnsByWeek(currentUser.uid, week.weekId);
            if (daily && daily.length > 0) {
              dailyMap[week.weekId] = daily.sort((a, b) => {
                const dayA = parseInt(a.day?.replace('d', '') || '0');
                const dayB = parseInt(b.day?.replace('d', '') || '0');
                return dayA - dayB;
              });
            }
          } catch (e) {
            console.error(`Error fetching daily data for ${week.weekId}:`, e);
          }
        }
        setDailyDataMap(dailyMap);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !Array.isArray(weeklyData) || weeklyData.length === 0) return;

    // Build chart data: weekly points + daily points interpolated
    const sortedWeekly = [...weeklyData].sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
    
    const allPoints = [];
    let xIndex = 0;

    sortedWeekly.forEach((week) => {
      const weekId = week.weekId;
      const baseBalance = Number(week.baseBalance) || 100000;
      const endBalance = Number(week.endBalance) || baseBalance;
      const daily = dailyDataMap[weekId] || [];

      // Monday point (week start) - from weekly data
      allPoints.push({
        x: xIndex,
        y: baseBalance,
        weekId,
        label: `${weekId} (Pzt)`,
        type: 'weekly-start'
      });

      // Daily points (d1-d4) if available
      if (daily.length > 0) {
        daily.forEach((d) => {
          const dayNum = parseInt(d.day?.replace('d', '') || '0');
          // d1=Tuesday (x+1), d2=Wednesday (x+2), d3=Thursday (x+3), d4=Friday (x+4)
          allPoints.push({
            x: xIndex + dayNum,
            y: Number(d.endBalance) || baseBalance,
            weekId,
            day: d.day,
            date: d.date,
            label: `${weekId} (${d.day})`,
            type: 'daily'
          });
        });
      }

      // Friday point (week end) - from weekly data
      allPoints.push({
        x: xIndex + 4, // Friday
        y: endBalance,
        weekId,
        label: `${weekId} (Cum)`,
        type: 'weekly-end'
      });

      xIndex += 5; // Move to next week (5 days: Mon-Fri)
    });

    // Sort by x value
    allPoints.sort((a, b) => a.x - b.x);
    
    const x = allPoints.map(p => p.x);
    const y = allPoints.map(p => p.y);

    const width = Math.max(320, container.clientWidth || 320);
    const calcHeight = (w) => {
      if (w < 480) return Math.max(220, Math.round(w * 0.55));
      if (w < 900) return Math.max(260, Math.round(w * 0.45));
      return Math.max(320, Math.round(w * 0.38));
    };
    let height = calcHeight(width);
    const isMobile = width < 480;

    const BASE = 100000;
    const baseline = new Array(x.length).fill(BASE);

    const opts = {
      width,
      height,
      series: [
        { label: 'Hafta' },
        {
          label: 'Baz',
          value: () => '₺100k',
          stroke: '#e5e7eb',
          width: 1,
          points: { show: false },
        },
        {
          label: 'Portföy (Günlük)',
          value: (u, v) => (v == null ? '—' : fmtMoney(v)),
          stroke: '#7db5fa',
          fill: 'rgba(125,181,250,0.25)',
          points: { 
            show: true,
            size: (u, seriesIdx, idx) => {
              const point = allPoints[idx];
              return point?.type === 'weekly-start' || point?.type === 'weekly-end' ? 6 : 4;
            }
          },
          pxAlign: 0,
          pxRound: 0,
          width: 2,
        },
      ],
      scales: {
        x: { time: false },
        y: {
          auto: true,
          range: (u, min, max) => {
            const mid = 100000;
            const spread = Math.max(mid - min, max - mid, 1);
            return [mid - spread, mid + spread];
          },
        },
      },
      axes: [
        {
          values: (u, vals) => {
            const maxTicks = isMobile ? 4 : 8;
            const step = Math.ceil(vals.length / maxTicks);
            return vals.map((v, i) => {
              if (i % step === 0) {
                const point = allPoints[v];
                return point?.weekId ? point.weekId : '';
              }
              return '';
            });
          },
          grid: { show: true },
          size: isMobile ? 24 : 30,
        },
        {
          values: (u, vals) => {
            const MID = 100000;
            const ymin = u.scales.y?.min ?? vals[0];
            const ymax = u.scales.y?.max ?? vals[vals.length - 1];
            let iMid = 0, dMid = Infinity;
            let iMin = 0, dMin = Infinity;
            let iMax = 0, dMax = Infinity;
            for (let i = 0; i < vals.length; i++) {
              const v = vals[i];
              const dm = Math.abs(v - MID);
              if (dm < dMid) { dMid = dm; iMid = i; }
              const dmn = Math.abs(v - ymin);
              if (dmn < dMin) { dMin = dmn; iMin = i; }
              const dmx = Math.abs(v - ymax);
              if (dmx < dMax) { dMax = dmx; iMax = i; }
            }
            const tol = Math.max((ymax - ymin) * 0.0005, 1);
            const labelIdx = new Set([iMid]);
            if (Math.abs(ymin - MID) > tol && iMin !== iMid) labelIdx.add(iMin);
            if (Math.abs(ymax - MID) > tol && iMax !== iMid && iMax !== iMin) labelIdx.add(iMax);
            return vals.map((v, i) => {
              if (!labelIdx.has(i)) return '';
              if (i === iMid) return '₺100k';
              if (i === iMin) return fmtCompact(ymin);
              if (i === iMax) return fmtCompact(ymax);
              return '';
            });
          },
          grid: { show: true },
          size: isMobile ? 52 : 60,
        },
      ],
      cursor: { focus: { prox: 24 }, drag: { x: false, y: false } },
      legend: { show: false },
      padding: [6, 10, isMobile ? 12 : 16, 10],
    };

    if (uplotRef.current) {
      try { uplotRef.current.destroy(); } catch {}
      uplotRef.current = null;
    }

    const u = new uPlot(opts, [x, baseline, y], container);
    
    // Tooltip
    if (!tooltipRef.current) {
      const t = document.createElement('div');
      t.className = 'ph-tooltip';
      t.style.position = 'absolute';
      t.style.pointerEvents = 'none';
      t.style.zIndex = '5';
      t.style.display = 'none';
      container.style.position = 'relative';
      container.appendChild(t);
      tooltipRef.current = t;
    }
    const tip = tooltipRef.current;
    u.setCursor({ bind: {} });
    u.over.addEventListener('mousemove', () => {
      const i = u.cursor.idx;
      if (i == null || i < 0 || i >= x.length) { tip.style.display = 'none'; return; }
      const point = allPoints[i];
      const left = u.valToPos(x[i], 'x', true);
      const top = u.valToPos(y[i], 'y', true);
      tip.style.display = 'block';
      tip.style.left = `${Math.min(Math.max(left + 8, 0), width - 140)}px`;
      tip.style.top = `${Math.max(top - 34, 0)}px`;
      const label = point?.label || point?.weekId || '';
      const val = y[i] == null ? '—' : fmtMoney(y[i]);
      const typeLabel = point?.type === 'daily' ? ' (Günlük)' : 
                        point?.type === 'weekly-start' ? ' (Başlangıç)' : 
                        point?.type === 'weekly-end' ? ' (Bitiş)' : '';
      tip.innerHTML = `<div class="ph-tip" style="background:#111827;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.2)">${label}${typeLabel}<br/>${val}</div>`;
    });
    u.over.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    uplotRef.current = u;

    const onResize = () => {
      const w = Math.max(320, container.clientWidth || 320);
      const h = calcHeight(w);
      u.setSize({ width: w, height: h });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      try { ro.disconnect(); } catch {}
      try { u.destroy(); } catch {}
      uplotRef.current = null;
    };
  }, [weeklyData, dailyDataMap]);

  if (!currentUser) return null;
  if (loading) return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi (Günlük Detay)</div>
        <span className="chip-pill chip-gray">Yükleniyor…</span>
      </div>
    </div>
  );
  if (!weeklyData.length) return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi (Günlük Detay)</div>
        <span className="chip-pill chip-gray">Veri yok</span>
      </div>
      <p className="ph-empty">Henüz geçmiş verisi yok. Haftalar sonuçlandıkça geçmişiniz burada oluşacaktır.</p>
    </div>
  );

  return (
    <div className="info-card ph-card">
      <div className="ph-header">
        <div className="ph-title">Portföy Geçmişi (Günlük Detay)</div>
      </div>
      <div className="tv-chart" style={{ width: '100%', marginBottom: 4, position: 'relative' }} ref={containerRef} />
    </div>
  );
};

export default DailyPortfolioChart;



