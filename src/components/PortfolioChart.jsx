import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const fmtMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  const hasCents = Math.abs(num - Math.round(num)) > 1e-9;
  const nf = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `₺${nf.format(num)}`;
};

const fmtCompact = (n) => {
  const v = Math.abs(Number(n));
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `₺${(n / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `₺${(n / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `₺${Math.round(n / 1e3)}k`;
  return `₺${Math.round(n).toLocaleString()}`;
};

const PortfolioChart = ({ data }) => {
  const [view, setView] = useState('balance'); // 'balance' | 'return'
  const [range, setRange] = useState('ALL'); // '4W' | '12W' | 'YTD' | 'ALL'
  const containerRef = useRef(null);
  const uplotRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const hoverIdxRef = useRef(null);

  const filtered = useMemo(() => {
    const safe = Array.isArray(data) ? data.filter(Boolean) : [];
    if (!safe.length) return [];
    if (range === 'ALL') return safe;
    if (range === '4W') return safe.slice(-4);
    if (range === '12W') return safe.slice(-12);
    if (range === 'YTD') {
      // Filter by year prefix of the last point's weekId (e.g. 2026-W03)
      const lastId = String(safe[safe.length - 1]?.weekId || '');
      const m = /^(\d{4})-W\d{1,2}$/.exec(lastId);
      if (!m) return safe;
      const y = m[1];
      return safe.filter(r => String(r?.weekId || '').startsWith(`${y}-W`));
    }
    return safe;
  }, [data, range]);

  const seriesData = useMemo(() => {
    const safe = filtered;
    const x = safe.map((_, i) => i);
    const balance = safe.map(d => (Number(d.endBalance) || null));

    // Return view = weekly return %, centered at 0.
    const weeklyRet = safe.map(d => {
      const p = Number(d?.resultReturnPct);
      return Number.isFinite(p) ? p : null;
    });

    return { x, balance, weeklyRet };
  }, [filtered]);

  const stats = useMemo(() => {
    const safe = filtered;
    const firstBal = Number(safe[0]?.endBalance);
    const lastBal = Number(safe[safe.length - 1]?.endBalance);
    const hasFirst = Number.isFinite(firstBal) && firstBal > 0;
    const hasLast = Number.isFinite(lastBal) && lastBal > 0;
    const totalPct = hasFirst && hasLast ? ((lastBal / firstBal) - 1) * 100 : null;

    // Max drawdown from balance series
    let peak = -Infinity;
    let maxDd = 0;
    for (const d of safe) {
      const v = Number(d?.endBalance);
      if (!Number.isFinite(v)) continue;
      if (v > peak) peak = v;
      if (peak > 0) {
        const dd = (v - peak) / peak * 100; // negative
        if (dd < maxDd) maxDd = dd;
      }
    }

    return { totalPct, maxDd, firstBal, lastBal };
  }, [filtered]);

  const fmtPct = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(2)}%` : '—');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !Array.isArray(filtered) || filtered.length === 0) return;

    const x = seriesData.x;
    const y = view === 'return' ? seriesData.weeklyRet : seriesData.balance;

    const width = Math.max(320, container.clientWidth || 320);
    const calcHeight = (w) => {
      if (w < 480) return Math.max(220, Math.round(w * 0.55));
      if (w < 900) return Math.max(260, Math.round(w * 0.45));
      return Math.max(320, Math.round(w * 0.38));
    };
    let height = calcHeight(width);
    const isMobile = width < 480;

    const baselineValue = view === 'return' ? 0 : 100000;

    const lastBal = Number(filtered[filtered.length - 1]?.endBalance);
    const balDelta = Number.isFinite(lastBal) ? (lastBal - 100000) : NaN;
    const balColor = balDelta > 0 ? '#22c55e' : (balDelta < 0 ? '#ef4444' : '#9ca3af');
    const line = view === 'return' ? '#111827' : balColor; // Return line: dark gray

    const fill = (u) => {
      const ctx = u.ctx;
      const g = ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
      // Shadow under the line, fading down
      const topAlpha = view === 'return' ? 0.14 : 0.18;
      const rgb = line === '#111827'
        ? '17,24,39'
        : (line === '#22c55e' ? '34,197,94' : (line === '#ef4444' ? '239,68,68' : '156,163,175'));
      g.addColorStop(0, `rgba(${rgb},${topAlpha})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      return g;
    };

    const opts = {
      width,
      height,
      series: [
        {
          label: 'Hafta',
        },
        {
          label: view === 'return' ? 'Getiri' : 'Portföy',
          value: (u, v) => {
            if (v == null) return '—';
            return view === 'return' ? fmtPct(v) : fmtMoney(v);
          },
          stroke: line,
          fill,
          width: isMobile ? 2 : 2.6,
          points: {
            show: false,
          },
        },
      ],
      scales: {
        x: { time: false },
        y: {
          auto: true,
          range: (u, min, max) => {
            const mid = baselineValue;
            const spread = Math.max(Math.abs(mid - min), Math.abs(max - mid), 1);
            // Add a little headroom for a nicer look
            const pad = spread * 0.12;
            return [mid - spread - pad, mid + spread + pad];
          },
        },
      },
      axes: [
        {
          values: (u, vals) => {
            // show fewer ticks on mobile
            const maxTicks = isMobile ? 4 : 8;
            const step = Math.ceil(vals.length / maxTicks);
            return vals.map((v, i) => (i % step === 0 ? (filtered[v]?.weekId ?? '') : ''));
          },
          grid: { show: false },
          ticks: { show: false },
          stroke: '#9ca3af',
          size: isMobile ? 24 : 30,
        },
        {
          values: (u, vals) => {
            const ymin = u.scales.y?.min ?? vals[0];
            const ymax = u.scales.y?.max ?? vals[vals.length - 1];
            const tol = Math.max((ymax - ymin) * 0.0005, 1);
            // Keep it minimal: label only baseline + one extreme if far enough
            const idxBaseline = vals.reduce((bestI, v, i) => (Math.abs(v - baselineValue) < Math.abs(vals[bestI] - baselineValue) ? i : bestI), 0);
            const idxMin = vals.reduce((bestI, v, i) => (Math.abs(v - ymin) < Math.abs(vals[bestI] - ymin) ? i : bestI), 0);
            const idxMax = vals.reduce((bestI, v, i) => (Math.abs(v - ymax) < Math.abs(vals[bestI] - ymax) ? i : bestI), 0);
            const labelIdx = new Set([idxBaseline]);
            if (Math.abs(ymin - baselineValue) > tol) labelIdx.add(idxMin);
            if (Math.abs(ymax - baselineValue) > tol) labelIdx.add(idxMax);
            return vals.map((v, i) => {
              if (!labelIdx.has(i)) return '';
              if (i === idxBaseline) return view === 'return' ? '0%' : '₺100k';
              if (view === 'return') return fmtPct(v);
              return fmtCompact(v);
            });
          },
          grid: { show: false },
          ticks: { show: false },
          stroke: '#9ca3af',
          size: isMobile ? 46 : 54,
        },
      ],
      // Disable zoom by drag to always show all data; keep hover focus
      cursor: {
        focus: { prox: 32 },
        drag: { x: false, y: false },
        // Show only vertical guide line on hover (no horizontal line)
        y: false,
        x: { stroke: '#e5e7eb', width: 1 },
      },
      legend: { show: false },
      // reduce left padding a bit
      padding: [6, 8, isMobile ? 12 : 16, 6],
      hooks: {
        draw: [
          (u) => {
            // dashed baseline (0% or ₺100k) for quick orientation
            const yPos = u.valToPos(baselineValue, 'y', true);
            const ctx = u.ctx;
            ctx.save();
            ctx.strokeStyle = '#e5e7eb';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(u.bbox.left, yPos);
            ctx.lineTo(u.bbox.left + u.bbox.width, yPos);
            ctx.stroke();
            ctx.restore();
          }
        ]
      }
    };

    if (uplotRef.current) {
      try { uplotRef.current.destroy(); } catch {}
      uplotRef.current = null;
    }
    const u = new uPlot(opts, [x, y], container);
    // hover tooltip
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
    u.over.addEventListener('mousemove', () => {
      const i = u.cursor.idx;
      if (i == null || i < 0 || i >= x.length) { tip.style.display = 'none'; return; }
      const left = u.valToPos(x[i], 'x', true);
      const top = u.valToPos(y[i], 'y', true);

      if (hoverIdxRef.current !== i) {
        hoverIdxRef.current = i;
        setHoverIdx(i);
      }
      tip.style.display = 'block';
      const wid = filtered[i]?.weekId ?? '';
      const bal = Number(filtered[i]?.endBalance);
      const wk = Number(filtered[i]?.resultReturnPct);
      const main = view === 'return'
        ? (Number.isFinite(wk) ? fmtPct(wk) : '—')
        : (Number.isFinite(bal) ? fmtMoney(bal) : '—');
      const sub = view === 'return'
        ? (Number.isFinite(bal) ? fmtMoney(bal) : null)
        : (Number.isFinite(wk) ? `Getiri: ${fmtPct(wk)}` : null);
      tip.innerHTML = `<div style="background:#111827;color:#fff;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800;box-shadow:0 10px 24px rgba(0,0,0,.22);min-width:128px">
        <div style="opacity:.9">${wid}</div>
        <div style="font-size:13px;margin-top:2px">${main}</div>
        ${sub ? `<div style="opacity:.75;font-weight:700;margin-top:2px">${sub}</div>` : ''}
      </div>`;

      // Position tooltip inside chart bounds (works on mobile too)
      const tipW = tip.offsetWidth || 140;
      const tipH = tip.offsetHeight || 56;
      const pad = 8;
      let xPx = left + pad;
      let yPx = top - tipH - 10;
      // if above is clipped, show below
      if (yPx < pad) yPx = top + 10;
      // clamp inside container
      xPx = Math.min(Math.max(xPx, pad), Math.max(pad, width - tipW - pad));
      yPx = Math.min(Math.max(yPx, pad), Math.max(pad, height - tipH - pad));
      tip.style.left = `${xPx}px`;
      tip.style.top = `${yPx}px`;
    });
    u.over.addEventListener('mouseleave', () => {
      tip.style.display = 'none';
      hoverIdxRef.current = null;
      setHoverIdx(null);
    });
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
  }, [filtered, seriesData, view, stats.totalPct]);

  const headline = useMemo(() => {
    const idx = (typeof hoverIdx === 'number' && hoverIdx >= 0 && hoverIdx < filtered.length)
      ? hoverIdx
      : (filtered.length - 1);

    const bal = Number(filtered[idx]?.endBalance);
    const wk = Number(filtered[idx]?.resultReturnPct);

    const main = view === 'return' ? fmtPct(wk) : fmtMoney(bal);
    const sub = view === 'return'
      ? (Number.isFinite(bal) ? fmtMoney(bal) : '—')
      : `Getiri: ${fmtPct(wk)}`;

    const trend = view === 'return' ? wk : (Number.isFinite(bal) ? (bal - 100000) : NaN);
    const color = Number(trend) > 0 ? '#16a34a' : (Number(trend) < 0 ? '#dc2626' : '#9ca3af');
    return { main, sub, color };
  }, [filtered, hoverIdx, view]);

  return (
    <div style={{ width: '100%' }}>
      {/* Trading-app-like header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: headline.color, lineHeight: 1.1 }}>
            {headline.main}
          </div>
          <div style={{ marginTop: 6, color: '#6b7280', fontWeight: 600, fontSize: 13 }}>
            {headline.sub}{view === 'return' ? ` · Max DD: ${fmtPct(stats.maxDd)}` : ''}
          </div>
          <div style={{ marginTop: 10 }} className="pill-tabs">
            <button type="button" className={`chip-tab ${view === 'balance' ? 'active' : ''}`} onClick={() => setView('balance')}>Bakiye</button>
            <button type="button" className={`chip-tab ${view === 'return' ? 'active' : ''}`} onClick={() => setView('return')}>Getiri</button>
          </div>
        </div>

        {/* Time range pills (like 1D/1W/1M/6M) */}
        <div className="pill-tabs" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={`chip-tab ${range === '4W' ? 'active' : ''}`} onClick={() => setRange('4W')}>4H</button>
          <button type="button" className={`chip-tab ${range === '12W' ? 'active' : ''}`} onClick={() => setRange('12W')}>12H</button>
          <button type="button" className={`chip-tab ${range === 'YTD' ? 'active' : ''}`} onClick={() => setRange('YTD')}>YTD</button>
          <button type="button" className={`chip-tab ${range === 'ALL' ? 'active' : ''}`} onClick={() => setRange('ALL')}>Tümü</button>
        </div>
      </div>

      <div
        className="tv-chart"
        style={{
          width: '100%',
          marginBottom: 4,
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)',
          border: '1px solid #eef2f7'
        }}
        ref={containerRef}
      />
    </div>
  );
};

export default PortfolioChart;


