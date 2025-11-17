import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const fmtMoney = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
};

const fmtCompact = (n) => {
  const v = Math.abs(Number(n));
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n).toLocaleString()}`;
};

const PortfolioChart = ({ data }) => {
  const containerRef = useRef(null);
  const uplotRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !Array.isArray(data) || data.length === 0) return;

    const x = data.map((_, i) => i);
    const y = data.map(d => (Number(d.endBalance) || null));

    const width = Math.max(320, container.clientWidth || 320);
    const calcHeight = (w) => {
      if (w < 480) return Math.max(220, Math.round(w * 0.55));
      if (w < 900) return Math.max(260, Math.round(w * 0.45));
      return Math.max(320, Math.round(w * 0.38));
    };
    let height = calcHeight(width);
    const isMobile = width < 480;

    const opts = {
      width,
      height,
      series: [
        { label: 'Hafta' },
        {
          label: 'Baz',
          value: () => '$100k',
          stroke: '#e5e7eb',
          width: 1,
          points: { show: false },
        },
        {
          label: 'Portföy',
          value: (u, v) => (v == null ? '—' : fmtMoney(v)),
          stroke: '#7db5fa',
          fill: 'rgba(125,181,250,0.25)',
          points: { show: true },
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
            // show fewer ticks on mobile
            const maxTicks = isMobile ? 4 : 8;
            const step = Math.ceil(vals.length / maxTicks);
            return vals.map((v, i) => (i % step === 0 ? (data[v]?.weekId ?? '') : ''));
          },
          grid: { show: true },
          size: isMobile ? 24 : 30,
        },
        {
          values: (u, vals) => {
            // Label only unique min, mid(100k), and max (deduping overlapping values)
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
              if (i === iMid) return '$100k';
              if (i === iMin) return fmtCompact(ymin);
              if (i === iMax) return fmtCompact(ymax);
              return '';
            });
          },
          grid: { show: true },
          size: isMobile ? 52 : 60,
        },
      ],
      // Disable zoom by drag to always show all data; keep hover focus
      cursor: { focus: { prox: 24 }, drag: { x: false, y: false } },
      legend: { show: false },
      padding: [6, 10, isMobile ? 12 : 16, 10],
    };

    if (uplotRef.current) {
      try { uplotRef.current.destroy(); } catch {}
      uplotRef.current = null;
    }
    // Keep a constant baseline at 100k in the middle while allowing dynamic bounds
    const BASE = 100000;
    const baseline = new Array(x.length).fill(BASE);
    const u = new uPlot(opts, [x, baseline, y], container);
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
    u.setCursor({ bind: {} });
    u.over.addEventListener('mousemove', () => {
      const i = u.cursor.idx;
      if (i == null || i < 0 || i >= x.length) { tip.style.display = 'none'; return; }
      const left = u.valToPos(x[i], 'x', true);
      const top = u.valToPos(y[i], 'y', true);
      tip.style.display = 'block';
      tip.style.left = `${Math.min(Math.max(left + 8, 0), width - 140)}px`;
      tip.style.top = `${Math.max(top - 34, 0)}px`;
      const wid = data[i]?.weekId ?? '';
      const val = y[i] == null ? '—' : fmtMoney(y[i]);
      tip.innerHTML = `<div class="ph-tip" style="background:#111827;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.2)">${wid}<br/>${val}</div>`;
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
  }, [data]);

  return (
    <div className="tv-chart" style={{ width: '100%', marginBottom: 4, position: 'relative' }} ref={containerRef} />
  );
};

export default PortfolioChart;


